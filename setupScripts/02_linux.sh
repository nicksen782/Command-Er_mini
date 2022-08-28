#!/bin/bash

# ##############
# LINUX AND LIBS
# ##############

echo
echo "*****************************"
echo "* INSTALLING LINUX PACKAGES *"
echo "*****************************"
echo

# Change to the home directory.
cd ~

# Disable the blinking console cursor.
echo
echo "-- DISABLE BLINKING CURSOR --"
echo 0 | sudo tee /sys/class/graphics/fbcon/cursor_blink >> /dev/null

# Clean apt packages and update.
echo
echo "-- CLEAN/UPDATE APT PACKAGES --"
sudo apt clean
sudo apt -y update

# Install packages.
echo
echo "-- INSTALL APT PACKAGES --"
sudo apt -y install ca-certificates \
  cmake build-essential libpixman-1-dev libcairo2-dev libpango1.0-dev libgif-dev libjpeg-dev librsvg2-dev \
  i2c-tools libi2c-dev python3-smbus python3-pip \
  dialog curl jq

# Remove nodejs and npm packages if they are already installed in the base OS image.
# These are usually very old versions.
echo
echo "-- REMOVE APT PACKAGES (nodejs, npm) --"
sudo apt purge -y --auto-remove nodejs npm
