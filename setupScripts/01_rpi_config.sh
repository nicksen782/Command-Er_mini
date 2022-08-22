#!/bin/bash

cd $(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)

# ###################
# RASPBERRY PI CONFIG
# ###################

function appendToBootTxt() {
	# Generate a datetime string.
	local DATE_WITH_TIME=`date "+%Y%m%d-%H%M%S"`

	# Backup the old /boot/config.txt file.
	local BK_FILE="/boot/config__${DATE_WITH_TIME}__.txt"
	sudo cp /boot/config.txt $BK_FILE
	echo "Backup of /boot/config.txt: ${BK_FILE}"

	# Replace the /boot/config.txt file.
	# sudo cp -f boot/config.txt /boot/config.txt

	# Append to the /boot/config.txt file.
	cat boot/config_partial.txt | sudo tee -a /boot/config.txt > /dev/null

	# Comment-out: dtoverlay=vc4-kms-v3d
	FINDTHIS="dtoverlay=vc4-kms-v3d"
	REPLACEWITH="#dtoverlay=vc4-kms-v3d"
	sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

	# Comment-out: max_framebuffers=2
	FINDTHIS="max_framebuffers=2"
	REPLACEWITH="#max_framebuffers=2"
	sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

	# Use raspi-config nonint to turn on SPI and I2C.
	sudo raspi-config nonint do_i2c 0
	sudo raspi-config nonint do_spi 0

	# Reboot
	sudo reboot
}

echo "This script will APPEND to /boot/config.txt and then reboot."
read -p "Continue (y/n)?" choice
case "$choice" in 
  y|Y ) appendToBootTxt;;
  n|N ) echo "ABORTED";;
  * ) echo "ABORTED: INVALID CHOICE";;
esac

exit
