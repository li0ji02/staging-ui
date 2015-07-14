package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"syscall"
	"time"
)

var downloaders = make([]Downloader, 0, 30)

func main() {
	// load configuration from environment
	config := Configuration{}
	config.Read()

	// get the list of files to be downloaded
	dec := json.NewDecoder(strings.NewReader(config.DownloadFileNames))
	for {
		fileDownloader := &FileDownloader{}
		if err := dec.Decode(fileDownloader); err == io.EOF {
			break
		} else if err != nil {
			log.Fatal(err)
			return
		}
		fileDownloader.Status = NewNotStartedDownloadProgressInfo(fileDownloader.URL)
		fileDownloader.StatusLock = &sync.RWMutex{}
		fileDownloader.Err = nil
		fileDownloader.Done = false
		log.Printf("FileDownloader: %+v", fileDownloader)
		downloaders = append(downloaders, fileDownloader)
	}

	// get the list of docker image pullers
	dockerImageNames := strings.Split(config.PrePullDockerImageNames, " ")
	for _, imageName := range dockerImageNames {
		imagePuller := NewDockerImagePuller(imageName)
		log.Printf("DockerImagePuller: %+v", imagePuller)
		downloaders = append(downloaders, imagePuller)
	}

	// this limits the maximum number of parallel downloads
	sem := make(chan int, config.MaximumParallelDownloads)
	// wait group to wait for all downloads to finish
	waitGroup := new(sync.WaitGroup)

	go func() {
		// we want to wait for this goroutine
		waitGroup.Add(1)
		defer waitGroup.Done()

		// another goroutine to wait for all the goroutines to finish and then signal to system that we should exit
		// placed here to make sure this goroutine starts after the nesting goroutine started and incremented the count in waitGroup
		go func() {
			waitGroup.Wait()
			time.Sleep(3 * time.Second)
			// log the final status of the downloads
			log.Print(getProgress())
			pid := syscall.Getpid()
			syscall.Kill(pid, syscall.SIGINT)
		}()

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
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/progress", handleProgress)

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
	return progress
}

func handleProgress(rw http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		fmt.Fprintf(rw, getProgress())
	} else {
		http.Error(rw, "Invalid request method.", 405)
	}
}
