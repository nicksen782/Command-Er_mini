#!/bin/bash

# ####
# FBCP
# ####

# Change to the home directory.
cd ~

# Remove the fbcp process if it exists. 
pkill -x fbcp

# Download Waveshare's version of fbcp-ili9341 and unpack.
wget https://www.waveshare.com/w/upload/f/f9/Waveshare_fbcp.7z
7z x Waveshare_fbcp.7z -o./waveshare_fbcp

# Remove the previous download.
rm Waveshare_fbcp.7z

# Change to the waveshare_fbcp directory.
cd waveshare_fbcp

# Change the target framerate to a lower value than default.
sed -i 's/#define TARGET_FRAME_RATE 60/#define TARGET_FRAME_RATE 16/g' /home/pi/waveshare_fbcp/src/display/display.h

# Create the build directory, switch to it and use cmake/make to build the source.
mkdir build
cd build
cmake -DSPI_BUS_CLOCK_DIVISOR=20 -DWAVESHARE_1INCH3_LCD_HAT=ON -DSTATISTICS=0 ..
make -j

# Edit /etc/rc.local so that fbcp is run at start up and so that the console cursor does not blink.
sed -i $'s%exit 0%/home/pi/waveshare_fbcp/build/fbcp \& \\\necho 0 | tee /sys/class/graphics/fbcon/cursor_blink\\\n\\\nexit 0%g' /etc/rc.local

# Edit /etc/rc.local so that fbcp is run at start up.

