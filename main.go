package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

/* the format of the json for the list of files/docker images

{
   "FilesToBeDownloaded":[
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-apiserver",
         "FilePathName":"/opt/bin/kube-apiserver"
      },
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-controller-manager",
         "FilePathName":"/opt/bin/kube-controller-manager"
      },
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-proxy",
         "FilePathName":"/opt/bin/kube-proxy"
      },
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-scheduler",
         "FilePathName":"/opt/bin/kube-scheduler"
      },
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kubectl",
         "FilePathName":"/opt/bin/kubectl"
      },
      {
         "URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kubelet",
         "FilePathName":"/opt/bin/kubelet"
      },
      {
         "URL":"https://github.com/kelseyhightower/setup-network-environment/releases/download/v1.0.0/setup-network-environment",
         "FilePathName":"/opt/bin/setup-network-environment"
      },
      {
         "URL":"https://github.com/kelseyhightower/kube-register/releases/download/v0.0.4/kube-register-0.0.4-linux-amd64",
         "FilePathName":"/opt/bin/kube-register"
      }
   ],
   "DockerImages":[
      "ubuntu:14.04",
      "hellow-world:latest"
   ]
}

*/

type ImageList struct {
	DockerImages []string
}

type FileList struct {
	FilesToBeDownloaded []FileToBeDownloaded
}

type FileToBeDownloaded struct {
	URL          string // the URL of the file to be downloaded
	FilePathName string // the full path file name to save the file to
}

var downloaders = make([]Downloader, 0, 30)

func main() {
	// load configuration from environment
	config := Configuration{}
	if err := config.Read(); err != nil {
		os.Exit(1)
	}

	// read the list json file
	listContent, readErr := ioutil.ReadFile(config.DownloadListFile)
	if readErr != nil {
		log.Fatal("Failed to read the list json file, error is - " + readErr.Error())
		os.Exit(1)
	}

	images := ImageList{}
	if err := json.Unmarshal(listContent, &images); err != nil {
		log.Printf("Failed to get the list of docker images to pull from the list json file, error is - %s", readErr.Error())
	}

	files := FileList{}
	if err := json.Unmarshal(listContent, &files); err != nil {
		log.Printf("Failed to get the list of files to download from the list json file, error is - %s", readErr.Error())
	}

	log.Printf("Files to be donwloaded: %+v", files)
	log.Printf("Docker images to be pulled: %+v", images)

	// get the list of docker image pullers
	for _, imageName := range images.DockerImages {
		imagePuller := NewDockerImagePuller(imageName)
		log.Printf("DockerImagePuller: %+v", imagePuller)
		downloaders = append(downloaders, imagePuller)
	}

	// get the list of files to be downloaded
	for _, oneFile := range files.FilesToBeDownloaded {
		fileDownloader := NewFileDownloader(oneFile)
		log.Printf("FileDownloader: %+v", fileDownloader)
		downloaders = append(downloaders, fileDownloader)
	}

	// this limits the maximum number of parallel downloads
	sem := make(chan int, config.MaximumParallelDownloads)
	// wait group to wait for all downloads to finish
	waitGroup := new(sync.WaitGroup)

	go func() {
		// we want to wait for this goroutine
		waitGroup.Add(1)
		defer waitGroup.Done()

		for _, downloader := range downloaders {
			downloader := downloader
			// send one value to the channel, maximum we can send before one is retrieved is config.MaximumParallelDownloads
			sem <- 1
			go func() {
				// wait for this goroutine as well
				waitGroup.Add(1)
				defer waitGroup.Done()

				log.Printf("Started downloading - %s ...", downloader.GetName())
				for i := 0; i < config.MaximumNumberRetry; i++ {
					if i > 0 {
						// we are retrying the download here
						<-sem // let others have a go first
						time.Sleep(3 * time.Second)
						// try to see if we can start again. If we cannot get a slot to run, then this goroutine will block until one
						// slot is available. As we have limited number of files/docker images to download, we don't have the risk of running
						// large number of goroutines. Instead of exiting the goroutine and start another one to retry the download, it is
						// considered cheaper to pause and then retry
						sem <- 1
						log.Printf("Retry downloading - %s, number of retry %d", downloader.GetName(), i)
					}

					downloader.Download()
					if downloader.IsDone() == true && downloader.GetError() == nil {
						break
					}
				}

				// before we exit, retrieve one value from the channal to signal the end of this goroutine/download
				log.Printf("Finished downloading - %s", downloader.GetName())
				<-sem
			}()
		}

		// another goroutine to wait for all the goroutines to finish and then signal to system that we should exit
		// placed here to make sure this goroutine starts after the nesting goroutine started and all the download
		// goroutines have been scheduled
		go func() {
			waitGroup.Wait()
			time.Sleep(3 * time.Second)
			// log the final status of the downloads
			log.Print(getProgress())
			os.Exit(0)
		}()
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/progress", handleProgress)
	mux.Handle("/", http.FileServer(http.Dir(config.WWWRoot)))

	http.ListenAndServe(fmt.Sprintf(":%d", config.Port), mux)
}

func getProgress() string {
	progress := "["
	for _, downloader := range downloaders {
		if len(progress) != 1 {
			progress = progress + ","
		}
		progress = progress + downloader.GetProgressInfo()
	}
	progress = progress + "]"
	//log.Print(progress)
	return progress
}

func handleProgress(rw http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		fmt.Fprintf(rw, getProgress())
	} else {
		http.Error(rw, "Invalid request method.", 405)
	}
}
