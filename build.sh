#!/bin/bash

# Three steps:
# 1. Build the program as a static binary; output file is ./staging-ui
# 2. Build the docker image
# 3. Push the docker image

set -eo pipefail

### Step 1
PKG=github-isl-01.ca.com/vapp/staging-ui

# Start the build container and build the binary
docker run \
  --rm \
  -v ${PWD}:/go/src/${PKG} \
  -w /go/src/${PKG} \
  golang:1.4 \
  /bin/bash -c "go get -d -v && CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w' ${PKG}"

  ### Step 2
IMAGE=dev-store.vapp-security.solutions/vapp/staging-ui
VERSION=$(cat VERSION)

# build :latest
docker build --force-rm -t ${IMAGE} .
# tag :latest also with :version, forcing if this is a new build of the same version
docker tag -f ${IMAGE}:latest ${IMAGE}:${VERSION}

### Step 3
# Docker does not allow pushing with multiple tags
# push :version
#docker push ${IMAGE}:${VERSION}
# Also push :latest
#docker push ${IMAGE}:latest