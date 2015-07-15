package main

import (
	"github.com/kelseyhightower/envconfig"
	"log"
)

/*
const filesToBeDownloaded = `
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-apiserver", "FilePathName":"/opt/bin/kube-apiserver"}
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-controller-manager", "FilePathName":"/opt/bin/kube-controller-manager"}
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-proxy", "FilePathName":"/opt/bin/kube-proxy"}
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kube-scheduler", "FilePathName":"/opt/bin/kube-scheduler"}
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kubectl", "FilePathName":"/opt/bin/kubectl"}
	{"URL":"https://storage.googleapis.com/kubernetes-release/release/v0.17.0/bin/linux/amd64/kubelet", "FilePathName":"/opt/bin/kubelet"}
	{"URL":"https://github.com/kelseyhightower/setup-network-environment/releases/download/v1.0.0/setup-network-environment", "FilePathName":"/opt/bin/setup-network-environment"}
	{"URL":"https://github.com/kelseyhightower/kube-register/releases/download/v0.0.4/kube-register-0.0.4-linux-amd64", "FilePathName":"/opt/bin/kube-register"}
`
*/

type Configuration struct {
	// Static web files
	WWWRoot string `envconfig:"WWW_ROOT"`
	// HTTP listening port
	Port int
	// Path to certificate
	TLSCert string `envconfig:"TLS_CERT"`
	// Path to private key
	TLSKey string `envconfig:"TLS_KEY"`
	// Maximum number of parallel downloads
	MaximumParallelDownloads int `envconfig:"MAXIMUM_PARALLEL_DOWNLOADS"`
	// Maximum number of retry to download
	MaximumNumberRetry int `envconfig:"MAXIMUM_NUMBER_RETRY"`
	// JSON file that contains the list of files to be downloaded and the
	// docker images to be pulled
	DownloadListFile string `envconfig:"DOWNLOAD_LIST_FILE"`
}

// Read the configuration from the environment
// Defaults will be set for unset fields
func (config *Configuration) Read() error {
	err := envconfig.Process("", config)
	if err != nil {
		log.Fatal("Failed to load configuration, error is - " + err.Error())
		return err
	}

	if config.DownloadListFile == "" {
		config.DownloadListFile = "./list.json"
	}
	if config.WWWRoot == "" {
		config.WWWRoot = "/www"
	}
	if config.Port == 0 {
		config.Port = 80
	}
	if config.MaximumNumberRetry == 0 {
		config.MaximumNumberRetry = 3
	}
	if config.MaximumParallelDownloads == 0 {
		config.MaximumParallelDownloads = 5
	}

	log.Printf("Staging UI configuration: %+v", config)
	return nil
}
