package main

import (
	"github.com/kelseyhightower/envconfig"
	"log"
)

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

/*
const filesToBeDownloaded = `
	{"URL":"https://githuba.com/kelseyhightower/setup-network-environment/releases/download/v1.0.0/setup-network-test", "FilePathName":"/opt/bin/setup-network-environment"}
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
	// Docker images to be pulled
	PrePullDockerImageNames string `envconfig:"PREPULL_DOCKER_IMAGE_NAMES"`
	// Files to be downloaed
	DownloadFileNames string `envconfig:"DOWNLOAD_FILE_NAMES"`
	// Maximum number of parallel downloads
	MaximumParallelDownloads int `envconfig:"MAXIMUM_PARALLEL_DOWNLOADS"`
	// Maximum number of retry to download
	MaximumNumberRetry int `envconfig:"MAXIMUM_NUMBER_RETRY"`
}

// Read the configuration from the environment
// Defaults will be set for unset fields
func (config *Configuration) Read() {
	err := envconfig.Process("", config)
	if err != nil {
		log.Fatal(err.Error())
	}

	if config.PrePullDockerImageNames == "" {
		config.PrePullDockerImageNames = "ubuntu:14.04 hello-world:latest"
		//config.PrePullDockerImageNames = "hello-world:latest"
	}
	if config.DownloadFileNames == "" {
		config.DownloadFileNames = filesToBeDownloaded
	}
	if config.WWWRoot == "" {
		config.WWWRoot = "/data/www"
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
	return
}
