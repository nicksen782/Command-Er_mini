#!/bin/bash

cd $(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)

# ###################
# RASPBERRY PI CONFIG
# ###################

function replaceBootText() {
	# Generate a datetime string.
	local DATE_WITH_TIME=`date "+%Y%m%d-%H%M%S"`

	# Backup the old /boot/config.txt file.
	local BK_FILE="/boot/config__${DATE_WITH_TIME}__.txt"
	sudo cp /boot/config.txt $BK_FILE
	echo "Backup of /boot/config.txt: ${BK_FILE}"

	# Replace the /boot/config.txt file.
	sudo cp -f boot/config.txt /boot/config.txt
}

echo "This script will REPLACE /boot/config.txt"
read -p "Continue (y/n)?" choice
case "$choice" in 
  y|Y ) replaceBootText;;
  n|N ) echo "ABORTED";;
  * ) echo "ABORTED: INVALID CHOICE";;
esac

exit
