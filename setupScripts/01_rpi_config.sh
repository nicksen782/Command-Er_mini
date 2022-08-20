#!/bin/bash

# ###################
# RASPBERRY PI CONFIG
# ###################

function replaceBootText() {
	# Generate a datetime string.
	local DATE_WITH_TIME=`date "+%Y%m%d-%H%M%S"`

	# Backup the old /boot/config.txt file.
	local BK_FILE="/boot/config__${DATE_WITH_TIME}__.txt"
	sudo cp /boot/config.txt $BK_FILE
	echo "Backup of /boot/config.txt: ${DATE_WITH_TIME}"

	# Replace the /boot/config.txt file.
	cp -f boot/config.txt /boot/config.txt
}

# Change to the home directory.
# cd ~

echo "This script will REPLACE /boot/config.txt"
read -p "Continue (y/n)?" choice
case "$choice" in 
  y|Y ) replaceBootText;;
  n|N ) echo "ABORTED";;
  * ) echo "ABORTED: INVALID CHOICE";;
esac

exit
