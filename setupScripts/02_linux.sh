#!/bin/bash

# ##############
# LINUX AND LIBS
# ##############

# Change to the home directory.
cd ~

# Disable the blinking console cursor.
echo 0 | sudo tee /sys/class/graphics/fbcon/cursor_blink

# Clean apt packages and update.
sudo apt clean
sudo apt -y update

# Install packages.
sudo apt -y install ca-certificates
sudo apt -y install libpixman-1-dev libcairo2-dev libpango1.0-dev libgif-dev
sudo apt -y install cmake
sudo apt -y install p7zip-full -y
