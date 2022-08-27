#!/bin/bash

# ###################
# RASPBERRY PI CONFIG
# ###################

# Change to the directory of this script.
cd $(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)

function rpi_config(){
	# Menu configuration.
	local BACKTITLE="CONFIG SCRIPTS - rpi_config"
	local MENU="Choose an option."
	local HEIGHT=11
	local WIDTH=80
	local MENUHEIGHT=$HEIGHT

	# Menu options configuration.
	local OPTIONS=(0 "ABORT")
	OPTIONS+=( 1 "Append LCD  settings to /boot/config.txt (with backup.)")
	OPTIONS+=( 2 "Append GPIO settings to /boot/config.txt")
	OPTIONS+=( 3 "Reboot    (Do this AFTER you have made your choice(s).)")

	# Save the last selected option index.
	local LASTCHOICE=0

	# Repeat the menu until control+c or CANCEL.
	while true; do
		#
		echo "LOADING MENU ..."
		sleep 0.25

		# Display the dialog menu.
		local CMD=(dialog --default-item "$LASTCHOICE" --backtitle "$BACKTITLE" --menu "$MENU" $HEIGHT $WIDTH $MENUHEIGHT)
		local CHOICE=$("${CMD[@]}" "${OPTIONS[@]}" 2>&1 >/dev/tty)

		# Act upon the user's CHOICE.
		if [[ -n "$CHOICE" ]]; then
			# Clear the screen.
			clear

			# Save the CHOICE to LASTCHOICE
			# LASTCHOICE=$CHOICE

			# Perform the action that matches the user's CHOICE.
			case "$CHOICE" in
				# ABORT
				0)	
					clear 
					break
					;;
				# LCD
				1)	
					# Check to make sure that this is the first time this script has been run.
					local CHECK1=$(sudo grep -q "# DISPLAY_SETTINGS : ADDED BY: COMMAND-ER MINI" "/boot/config.txt" && echo "1" || echo "0")
					if [ "$CHECK1" == "1" ]; then echo "DISPLAY_SETTINGS have already been set!"; sleep 3; break; fi
					
					# Generate a datetime string.
					local DATE_WITH_TIME=`date "+%Y%m%d-%H%M%S"`

					# Backup the old /boot/config.txt file.
					local BK_FILE="/boot/config__${DATE_WITH_TIME}__.txt"
					sudo cp /boot/config.txt $BK_FILE
					echo "Backup of /boot/config.txt: ${BK_FILE}"

					# Append to the /boot/config.txt file.
					cat boot/config_partial1.txt | sudo tee -a /boot/config.txt > /dev/null

					# Comment-out: dtoverlay=vc4-kms-v3d
					FINDTHIS="dtoverlay=vc4-kms-v3d"
					REPLACEWITH="#dtoverlay=vc4-kms-v3d"
					sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

					# Comment-out: max_framebuffers=2
					FINDTHIS="max_framebuffers=2"
					REPLACEWITH="#max_framebuffers=2"
					sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

					# Use raspi-config nonint to turn ON I2C.
					sudo raspi-config nonint do_i2c 0

					# Use raspi-config nonint to turn OFF SPI.
					sudo raspi-config nonint do_spi 1
					sleep 2  
					;;

				# GPIO
				2)	
					local CHECK2=$(sudo grep -q "# GPIO_SETTINGS : ADDED BY: COMMAND-ER MINI"    "/boot/config.txt" && echo "1" || echo "0")
					if [ "$CHECK2" == "1" ]; then echo "GPIO_SETTINGS have already been set!"; sleep 3; break; fi
					
					# Append to the /boot/config.txt file.
					cat boot/config_partial2.txt | sudo tee -a /boot/config.txt > /dev/null
					sleep 2  
					;;
				3) 
					sudo reboot  
					;;
			esac

		# If a selection was not made (specifically CANCEL) then exit.
		else
			clear
			break
			# exit
		fi
	done	
	clear
}
rpi_config