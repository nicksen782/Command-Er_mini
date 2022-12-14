#!/bin/bash

# ####
# FBCP
# ####

echo
echo "*******************************"
echo "* INSTALLING FRAMEBUFFER COPY *"
echo "*******************************"
echo

# Change to the home directory.
cd ~

# Remove the fbcp process if it exists. 
echo
echo "-- REMOVE FBCP PROCESS --"
pkill -x fbcp

# Download Waveshare's version of fbcp-ili9341.
echo
echo "-- DOWNLOAD FBCP FROM WAVESHARE (https://github.com/EngineerWill/waveshare_fbcp) --"
git clone https://github.com/EngineerWill/waveshare_fbcp.git waveshare_fbcp

# Change to the waveshare_fbcp directory.
cd waveshare_fbcp

# Change the target framerate to a lower value than default.
echo
echo "-- CHANGE TARGET FRAMERATE --"
sed -i 's/#define TARGET_FRAME_RATE 60/#define TARGET_FRAME_RATE 30/g' /home/pi/waveshare_fbcp/src/display/display.h

# Create the build directory, switch to it and use cmake/make to build the source.
echo
echo "-- FBCP BUILD PART 1 --"
mkdir build
cd build
cmake -DSPI_BUS_CLOCK_DIVISOR=20 -DWAVESHARE_1INCH3_LCD_HAT=ON -DSTATISTICS=0 ..
echo
echo "-- FBCP BUILD PART 2 --"
make -j

# Edit /etc/rc.local so that fbcp is run at start up and so that the console cursor does not blink.
echo
echo "-- ADD TO /etc/rc.local: START FBCP, DISABLE BLINKING CURSOR ON STARTUP --"
FINDTHIS="exit 0"
REPLACEWITH=""\
"# Start: Framebuffer Copy.\n"\
"/home/pi/waveshare_fbcp/build/fbcp \&\n\n"\
"# Disable terminal blinking cursor.\n"\
"echo 0 | tee /sys/class/graphics/fbcon/cursor_blink\n\n"\
"exit 0"
sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /etc/rc.local
