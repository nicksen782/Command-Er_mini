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
echo 0 | sudo tee /sys/class/graphics/fbcon/cursor_blink

# Clean apt packages and update.
echo
echo "-- CLEAN/UPDATE APT PACKAGES --"
sudo apt clean
sudo apt -y update

# Install packages.
echo
echo "-- INSTALL APT PACKAGES --"
sudo apt -y install ca-certificates
sudo apt -y install libpixman-1-dev libcairo2-dev libpango1.0-dev libgif-dev
sudo apt -y install cmake
sudo apt -y install p7zip-full -y
sudo apt -y install python3-pip
sudo apt -y install i2c-tools libi2c-dev python3-smbus
