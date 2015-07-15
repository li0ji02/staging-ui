package main

import (
	"bytes"
	"encoding/json"
	"log"
	"strings"
)

/* Json format of the progress information from docker remote API
 *
 *
{
   "status":"Extracting",
   "progressDetail":
   {
      "current":61833216,
      "total":65785947
   },

   "progress":"[==============================================\u003e    ] 61.83 MB/65.79 MB",
   "id":"83e4dde6b9cf"
}
*/

type ProgressDetail struct {
	Current int64 // bytes that have been downloaded
	Total   int64 // total number of bytes to be downloaded
}

func NewProgressDetail(c int64, t int64) *ProgressDetail {
	return &ProgressDetail{Current: c, Total: t}
}

type ProgressInfo struct {
	Status         string          // A description of current status
	ProgressDetail *ProgressDetail // detailed number counts
	Id             string          // id of the fs layer being pulled
}

func NewProgressInfoFile(s string, c int64, t int64) *ProgressInfo {
	return &ProgressInfo{Status: s, ProgressDetail: NewProgressDetail(c, t)}
}

func NewProgressInfoDocker(info []byte) *ProgressInfo {
	detail := &ProgressDetail{}
	pInfo := &ProgressInfo{ProgressDetail: detail}
	err := json.Unmarshal(info, pInfo)
	if err != nil {
		splitted := bytes.Split(info, []byte(`}{`))
		if len(splitted) > 1 {
			oneInfo := splitted[len(splitted)-1]
			if len(oneInfo) > 0 {
				newOneInfo := "{" + string(oneInfo)
				err := json.Unmarshal([]byte(newOneInfo), pInfo)
				log.Printf("NewProgressInfoDocker:try unmarshal again with - %s", newOneInfo)
				if err == nil {
					return pInfo
				} else {
					log.Printf("NewProgressInfoDocker error: %s", err.Error())
				}
			}
		}

		log.Printf("NewProgressInfoDocker error: %s", err.Error())
		log.Printf("NewProgressInfoDocker: %s", string(info))
		return &ProgressInfo{Status: "Failed to unmarchal status information from docker"}
	} else {
		return pInfo
	}
}

type DownloadProgressInfo struct {
	ImageName string          // name of the docker image being pulled
	Progress  []*ProgressInfo // list of progress info, one for each unique value of the id field
}

func NewDownloadProgressInfo(image string, progressInfo *ProgressInfo) *DownloadProgressInfo {
	return &DownloadProgressInfo{ImageName: image, Progress: []*ProgressInfo{progressInfo}}
}

func NewFailureDownloadProgressInfo(image string, err error) *DownloadProgressInfo {
	return &DownloadProgressInfo{ImageName: image, Progress: []*ProgressInfo{&ProgressInfo{Status: "Error - " + err.Error()}}}
}

func NewNotStartedDownloadProgressInfo(image string) *DownloadProgressInfo {
	return &DownloadProgressInfo{ImageName: image, Progress: []*ProgressInfo{&ProgressInfo{Status: "Not started"}}}
}

func (dockerPullProgressInfo *DownloadProgressInfo) AddDockerPullAPIProgressInfo(apiProgressInfo *ProgressInfo) {
	if apiProgressInfo.Id != "" {
		// the ProgressInfo to be added has an id entry
		replaced := false
		for i, entry := range dockerPullProgressInfo.Progress {
			// replace the existing entry that has an id field with the same value
			if strings.EqualFold(entry.Id, apiProgressInfo.Id) {
				replaced = true
				dockerPullProgressInfo.Progress[i] = apiProgressInfo
				break
			}
		}
		if !replaced {
			// append
			dockerPullProgressInfo.Progress = append(dockerPullProgressInfo.Progress, apiProgressInfo)
		}
	} else {
		// the ProgressInfo to be added does not have an id entry or id entry is empty string
		replaced := false
		for i, entry := range dockerPullProgressInfo.Progress {
			// replace the existing entry that does not hava an id field or id field is empty
			if entry.Id == "" {
				replaced = true
				dockerPullProgressInfo.Progress[i] = apiProgressInfo
				break
			}
		}
		if !replaced {
			// append
			dockerPullProgressInfo.Progress = append(dockerPullProgressInfo.Progress, apiProgressInfo)
		}
	}
}
