#!/bin/bash

set -eo pipefail

PKG=github-isl-01.ca.com/vapp/staging-ui

# Start the build container and build the binary
docker run \
  --rm \
  -v ${PWD}:/go/src/${PKG} \
  -w /go/src/${PKG} \
  golang:1.4 \
  /bin/bash -c "go get -d -v && CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w' ${PKG}"
