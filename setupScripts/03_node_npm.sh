#!/bin/bash

# ########
# NODE/NPM
# ########

# Change to home directory, download and unpack Node (unofficial build.)
cd ~
curl -o node-v16.9.1-linux-armv6l.tar.gz https://unofficial-builds.nodejs.org/download/release/v16.9.1/node-v16.9.1-linux-armv6l.tar.gz
tar -xzf node-v16.9.1-linux-armv6l.tar.gz

# Copy the unpacked Node to /usr/local.
sudo cp -r node-v16.9.1-linux-armv6l/* /usr/local/

# Remove the previous downloads. 
rm node-v16.9.1-linux-armv6l.tar.gz
rm -rf node-v16.9.1-linux-armv6l

# Update NPM.
sudo npm install -g npm

# Install node-gyp
sudo npm install -g node-gyp

# Show the node and the npm versions. 
node -v
npm -v
