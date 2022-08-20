#!/bin/bash

# ########
# NODE/NPM
# ########

echo
echo "****************************************"
echo "* INSTALLING NODE/NPM AND NPM PACKAGES *"
echo "****************************************"
echo

# Change to home directory, download and unpack Node (unofficial build.)
echo
echo "-- DOWNLOADING NODE/NPM --"
cd ~
curl -o node-v16.9.1-linux-armv6l.tar.gz https://unofficial-builds.nodejs.org/download/release/v16.9.1/node-v16.9.1-linux-armv6l.tar.gz
tar -xzf node-v16.9.1-linux-armv6l.tar.gz

# Copy the unpacked Node to /usr/local.
sudo cp -r node-v16.9.1-linux-armv6l/* /usr/local/

# Remove the previous downloads. 
rm node-v16.9.1-linux-armv6l.tar.gz
rm -rf node-v16.9.1-linux-armv6l

# Update NPM.
echo
echo "-- UPDATING NPM --"
sudo npm install -g npm

# Install node-gyp
echo
echo "-- INSTALLING NODE PACKAGES --"
sudo npm install -g node-gyp

# Show the node and the npm versions. 
echo
echo "-- NODE VERSION --"
node -v
echo
echo "-- NPM VERSION --"
npm -v
