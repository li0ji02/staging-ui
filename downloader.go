package main

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

const failedToMarshal = "Failed to generate JSON string from status"
const statusDownloading = "Downloading"
const statusFinished = "Finished downloading"
const statusInvalidUrl = "Invalid URL - %s"
const statusFailedToCreateFile = "Failed to create file - %s"
const statusFailedToOpenFile = "Failed to open file for writting - %s"
const statusFailedToDownload = "Failed to download file - %s"
const statusAlreadyDownloaded = "File already downloaded - %s"

const daemonUrl = "unix:///var/run/docker.sock"
const defaultTimeout = 30 * time.Second

type Downloader interface {
	Download()
	GetName() string
	IsDone() bool
	GetError() error
	GetProgressInfo() string
}

/*
 * File download related code
 */

// FileDownloadReader wraps an existing io.Reader.
type FileDownloadReader struct {
	io.Reader
	current        int64           // currently downloaded bytes
	total          int64           // total number of bytes to be downloaded
	fileDownloader *FileDownloader // the associated FileDownloader
}

// Implement the interface io.Reader's Read method,forward the call and record the progress
func (dr *FileDownloadReader) Read(p []byte) (int, error) {
	n, err := dr.Reader.Read(p)
	if n > 0 {
		dr.current += int64(n)
		//log.Printf("%s - Bytes downloaded %d", dr.fileDownloader.URL, dr.current)
	}

	if err == io.EOF {
		log.Printf("%s - Download reached EOF", dr.fileDownloader.URL)
		dr.fileDownloader.UpdateProgressInfo(statusFinished, dr.current, dr.total)
	} else {
		dr.fileDownloader.UpdateProgressInfo(statusDownloading, dr.current, dr.total)
	}

	return n, err
}

type FileDownloader struct {
	URL          string                // url from where to download the file
	FilePathName string                // save downloaded file to
	Status       *DownloadProgressInfo // download status and progress
	StatusLock   *sync.RWMutex         // the reader/writer lock
	Err          error                 // error when an error happened
	Done         bool                  // if downloading has finished, could be successful or failed
}

func NewFileDownloader(oneFile FileToBeDownloaded) *FileDownloader {
	return &FileDownloader{URL: oneFile.URL, FilePathName: oneFile.FilePathName, Status: NewNotStartedDownloadProgressInfo(oneFile.URL), StatusLock: &sync.RWMutex{}, Err: nil, Done: false}
}

func FileExists(filePath string) (bool, *time.Time) {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
	}
	time := fileInfo.ModTime()
	return true, &time
}

func (downloader *FileDownloader) Download() {
	log.Printf("Downloading from %s. Save downloaded file to %s", downloader.URL, downloader.FilePathName)

	// parse the URL first to make sure it is valid
	if _, err := url.Parse(downloader.URL); err != nil {
		downloader.UpdateProgressInfo(fmt.Sprintf(statusInvalidUrl, err.Error()), 0, 0)
		downloader.Err = err
		downloader.Done = true
		return
	}

	var tempFile *os.File

	// check to see if the file exists already, if it exists get the last modified time
	fileExists, fileModTime := FileExists(downloader.FilePathName)
	if fileExists {
		log.Printf("File already exists - %s. Last Modified time of the file is - %s", downloader.FilePathName, fileModTime.String())

		if !fileModTime.IsZero() {
			// check the last-modified time on the resource that the URL points to
			response, err := http.Head(downloader.URL)
			// ignore errors
			if err == nil && response.StatusCode == 200 {
				urlLastModified := response.Header.Get("Last-Modified")
				log.Printf("Checking Last-Modified header for URL - %s. Last-Modified header is - %s", downloader.URL, urlLastModified)
				urlModTime, err := time.Parse(http.TimeFormat, urlLastModified)
				// again ignore errors
				if err == nil && fileModTime.After(urlModTime) {
					// we already have the file downloaded with the current content, so don't need to dowanload again
					downloader.UpdateProgressInfo(fmt.Sprintf(statusAlreadyDownloaded, "No error"), 0, 0)
					downloader.Err = nil
					downloader.Done = true
					return
				}
			} else {
				if err != nil {
					log.Printf("HTTP HEAD requst failed for URL - %s. Error - %s", downloader.URL, err.Error())
				} else {
					log.Printf("HTTP HEAD requst failed for URL - %s. HTTP Status - %s", downloader.URL, response.Status)
				}
			}
		}

		// Open the file for writting only
		var openErr error
		tempFile, openErr = os.OpenFile(downloader.FilePathName, os.O_WRONLY|os.O_TRUNC, 0666)
		if openErr != nil {
			log.Printf("Failed to open file %s to write to. Error is - %s", downloader.FilePathName, openErr.Error())
			downloader.UpdateProgressInfo(fmt.Sprintf(statusFailedToOpenFile, openErr.Error()), 0, 0)
			downloader.Err = openErr
			downloader.Done = true
			return
		}
	} else {
		// Create the file
		var createErr error
		tempFile, createErr = os.Create(downloader.FilePathName)
		if createErr != nil {
			log.Printf("Failed to create file %s. Error is - %s", downloader.FilePathName, createErr.Error())
			downloader.UpdateProgressInfo(fmt.Sprintf(statusFailedToCreateFile, createErr.Error()), 0, 0)
			downloader.Err = createErr
			downloader.Done = true
			return
		}
	}

	defer tempFile.Close()
	tempFileName := tempFile.Name()

	log.Printf("%s - File created/opened at  %s", downloader.URL, tempFileName)

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: transport}

	response, err := client.Get(downloader.URL)
	if err != nil {
		log.Printf("Failed to download %s. Error is - %s", downloader.URL, err.Error())
		downloader.UpdateProgressInfo(fmt.Sprintf(statusFailedToDownload, err.Error()), 0, 0)
		downloader.Err = err
		downloader.Done = true
		return
	}

	if response.StatusCode != 200 {
		log.Printf("Failed to download %s. HTTP status is - %s", downloader.URL, response.Status)
		downloader.UpdateProgressInfo(fmt.Sprintf(statusFailedToDownload, response.Status), 0, 0)
		downloader.Err = err
		downloader.Done = true
		return
	}

	defer response.Body.Close()

	log.Printf("%s - ContentLength %d", downloader.URL, response.ContentLength)

	downloadReader := &FileDownloadReader{Reader: response.Body, current: 0, total: response.ContentLength, fileDownloader: downloader}

	if _, err := io.Copy(tempFile, downloadReader); err != nil {
		defer os.Remove(tempFileName)
		log.Printf("Failed to save %s. Error is - %s", downloader.URL, err.Error())
		downloader.UpdateProgressInfo(fmt.Sprintf(statusFailedToDownload, err.Error()), 0, 0)
		downloader.Err = err
		downloader.Done = true
		return
	}

	downloader.Done = true
}

func (downloader *FileDownloader) GetName() string {
	return downloader.URL
}

func (downloader *FileDownloader) IsDone() bool {
	return downloader.Done
}

func (downloader *FileDownloader) GetError() error {
	return downloader.Err
}

func (downloader *FileDownloader) GetProgressInfo() string {
	downloader.StatusLock.RLock()
	defer downloader.StatusLock.RUnlock()

	output, err := json.Marshal(*(downloader.Status))
	if err != nil {
		log.Print("Failed to marshal to JSON")
		return failedToMarshal
	} else {
		return string(output)
	}
}

func (downloader *FileDownloader) UpdateProgressInfo(s string, c int64, t int64) {
	pInfo := NewDownloadProgressInfo(downloader.URL, NewProgressInfoFile(s, c, t))

	downloader.StatusLock.Lock()
	defer downloader.StatusLock.Unlock()

	downloader.Status = pInfo
}

/*
 * Pull docker images related code
 */

// PullImageReader wraps an existing io.Reader.
type PullImageReader struct {
	io.Reader                            // io.Reader
	dockerImagePuller *DockerImagePuller // associated DockerImagePuller
}

// Implement the interface io.Reader's Read method.
func (pr *PullImageReader) Read(p []byte) (int, error) {
	n, err := pr.Reader.Read(p)
	if n > 0 {
		pr.dockerImagePuller.UpdateProgressInfo(p[0:n])
	}
	if err == io.EOF {
		log.Printf("%s - Pull image finished", pr.dockerImagePuller.Name)
	}
	return n, err
}

type DockerImagePuller struct {
	Name       string                // docker image name to pull
	Status     *DownloadProgressInfo // download status and progress
	StatusLock *sync.RWMutex         // the reader/writer lock
	Err        error                 // error when an error happened
	Done       bool                  // if downloading has finished, could be successful or failed
}

func NewDockerImagePuller(image string) *DockerImagePuller {
	return &DockerImagePuller{Name: image, Status: NewNotStartedDownloadProgressInfo(image), StatusLock: &sync.RWMutex{}, Err: nil, Done: false}
}

func (imagePuller *DockerImagePuller) SetFailure(err error) {
	imagePuller.StatusLock.Lock()
	defer imagePuller.StatusLock.Unlock()

	imagePuller.Status = NewFailureDownloadProgressInfo(imagePuller.Name, err)
	imagePuller.Err = err
	imagePuller.Done = true
}

func (imagePuller *DockerImagePuller) Download() {
	log.Printf("Pulling docker image %s", imagePuller.Name)

	u, err := url.Parse(daemonUrl)
	httpTransport := &http.Transport{
		TLSClientConfig: nil,
	}

	socketPath := u.Path
	unixDial := func(proto, addr string) (net.Conn, error) {
		return net.DialTimeout("unix", socketPath, time.Duration(defaultTimeout))
	}

	httpTransport.Dial = unixDial

	u.Scheme = "http"
	u.Host = "unix.sock"
	u.Path = ""

	client := &http.Client{Transport: httpTransport}

	v := url.Values{}
	v.Set("fromImage", imagePuller.Name)
	uri := fmt.Sprintf("/images/create?%s", v.Encode())
	var uri1 string = u.String() + uri

	response, err := client.Post(uri1, "", nil)
	if err != nil {
		log.Printf("Failed to pull docker image %s. Error is - %s", imagePuller.Name, err.Error())
		imagePuller.SetFailure(err)
		return
	}
	if response.StatusCode != 200 {
		log.Printf("Failed to pull docker image %s. HTTP status is - %s", imagePuller.Name, response.Status)
		imagePuller.SetFailure(errors.New("HTTP status is - " + response.Status))
		return
	}

	defer response.Body.Close()
	log.Printf("%s - ContentLength %d", imagePuller.Name, response.ContentLength)

	pullReader := &PullImageReader{Reader: response.Body, dockerImagePuller: imagePuller}
	if _, err := ioutil.ReadAll(pullReader); err != nil {
		log.Printf("Failed to get docker image status %s. Error is - %s", imagePuller.Name, err.Error())
		imagePuller.SetFailure(err)
		return
	}

	imagePuller.Done = true
}

func (imagePuller *DockerImagePuller) GetName() string {
	return imagePuller.Name
}

func (imagePuller *DockerImagePuller) IsDone() bool {
	return imagePuller.Done
}

func (imagePuller *DockerImagePuller) GetError() error {
	return imagePuller.Err
}

func (imagePuller *DockerImagePuller) GetProgressInfo() string {
	imagePuller.StatusLock.RLock()
	defer imagePuller.StatusLock.RUnlock()

	output, err := json.Marshal(*(imagePuller.Status))
	if err != nil {
		log.Print("Failed to marshal to JSON")
		return failedToMarshal
	} else {
		return string(output)
	}
}

func (imagePuller *DockerImagePuller) UpdateProgressInfo(info []byte) {
	dockerPullAPIProgressInfo := NewProgressInfoDocker(info)

	imagePuller.StatusLock.Lock()
	defer imagePuller.StatusLock.Unlock()

	imagePuller.Status.AddDockerPullAPIProgressInfo(dockerPullAPIProgressInfo)
}
