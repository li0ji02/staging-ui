# Staging UI for your ca Securecenter Virtual Appliance

FROM scratch

MAINTAINER Jiangping Li <jiangping.li@ca.com>

EXPOSE 80

CMD ["/staging-ui"]

# Port to run the web server
ENV PORT 80

# Directory of static web files
ENV WWW_ROOT /www

# The json file that contains the list of files/images to download
ENV DOWNLOAD_LIST_FILE /list.json

COPY www /www

# Copy binary
COPY staging-ui /staging-ui
COPY list.json /list.json