#!/bin/bash

cd $(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)

# Trapping control+c. Make sure the screen is cleared before the exit.
function ctrl_c() { sleep 0.25; clear; exit; }
trap ctrl_c INT

function anyKeyToContinue_func() {
	echo -n "Press any key to continue";
	for _ in {1..3}; do read -rs -n1 -t1 || printf ".";done;echo
}

function help1_func() { 
	local msgs="HELP:"
	msgs+="01_rpi_config.sh   \n"
	msgs+="    /boot/config.txt update(s)\n"
	msgs+="\n"

	msgs+="02_linux.sh        \n"
	msgs+="    Installs Linux packages.\n"
	msgs+="\n"

	msgs+="03_node_npm.sh     \n"
	msgs+="    Installs NodeJS and NPM.\n"
	msgs+="\n"

	msgs+="04_python.sh       \n"
	msgs+="    Installs Python modules.\n"
	msgs+="\n"

	msgs+="05_fbcp.sh         \n"
	msgs+="    Installs fbcp (framebuffer copy.)\n"
	msgs+="\n"

	msgs+="06_app_install.sh  \n"
	msgs+="    Installs the npm packages for the app.\n"
	msgs+="\n"

	msgs+="07_pm2.sh          \n"
	msgs+="    Installs pm2 and configures it.\n"
	msgs+="\n"

	local HEIGHT=30
	local WIDTH=80
	local MENUHEIGHT=$HEIGHT
	dialog --cr-wrap --no-collapse --msgbox "$msgs" $HEIGHT $WIDTH
}

function help2_func() { 
	local msgs="HELP:"
	msgs+="01_rpi_config.sh   \n"
	msgs+="    /boot/config.txt update(s)\n"
	msgs+="\n"

	msgs+="02_linux.sh        \n"
	msgs+="    Installs Linux packages.\n"
	msgs+="\n"

	msgs+="03_node_npm.sh     \n"
	msgs+="    Installs NodeJS and NPM.\n"
	msgs+="\n"

	msgs+="04_python.sh       \n"
	msgs+="    Installs Python modules.\n"
	msgs+="\n"

	msgs+="05_fbcp.sh         \n"
	msgs+="    Installs fbcp (framebuffer copy.)\n"
	msgs+="\n"

	msgs+="06_app_install.sh  \n"
	msgs+="    Installs the npm packages for the app.\n"
	msgs+="\n"

	msgs+="07_pm2.sh          \n"
	msgs+="    Installs pm2 and configures it.\n"
	msgs+="\n"

	local HEIGHT=30
	local WIDTH=80
	local MENUHEIGHT=$HEIGHT
	dialog --cr-wrap --no-collapse --msgbox "$msgs" $HEIGHT $WIDTH
}

function rpi_config() {
	bash 01_rpi_config.sh
}

function linux() {
	bash 02_linux.sh
}

function node_npm() {
	bash 03_node_npm.sh
}

function python() {
	bash 04_python.sh
}

function fbcp() {
	bash 05_fbcp.sh
}

function app_install() {
	bash 06_app_install.sh
}

function pm2() {
	bash 07_pm2.sh
}

function rpi0w_autoConfig() {
	echo "rpi0w_autoConfig"
	
	linux            # Linux packages/config
	node_npm         # NodeJs/NPM install.
	python           # Python modules for WebSockets/smbus.
	fbcp             # Framebuffer Copy for the Waveshare LCD.
	exampleToConfig  # Copies the config.json.example file to config.json
	app_install      # Run npm install for the app.
	pm2              # Install/configure PM2 for app persistence. 
}
function rpi3b_autoConfig() {
	echo "rpi3b_autoConfig"

	linux            # Linux packages/config
	node_npm         # NodeJs/NPM install.
	exampleToConfig  # Copies the config.json.example file to config.json
	rpi3b_flagConfig # Disables some app config flags before npm install.
	app_install      # Run npm install for the app.
	pm2              # Install/configure PM2 for app persistence. 
}
function exampleToConfig() {
	cp ../public/shared/config.json.example ../public/shared/config.json
}
function rpi3b_flagConfig() {
	# Change to home directory, download and unpack Node (unofficial build.)
	echo
	echo "-- DISABLE pythonWsServer, battery, gpio IN THE APP. --"

	# A typical RPI3B is not going to have the same battery/UPS attachment as the package used with the RPI0.
	# Disable some "toggles flags" here before installing the app.
	local s1=".toggles.isActive_pythonWsServer=false"
	local s2=".toggles.isActive_battery=false"
	local s3=".toggles.isActive_gpio=false"
	local s4=".toggles.isActive_buttonsOverlay=true"
	contents="$(jq "$s1 | $s2 | $s3 | $s4" ../public/shared/config.json)"
	echo "$contents" > ../public/shared/config.json

	# Update /boot/config.txt to use larger dimensions for the framebuffer.
	
	# Update framebuffer_width
	local FINDTHIS=
	local REPLACEWITH=

	FINDTHIS="framebuffer_width=240"
	REPLACEWITH="framebuffer_width=480"
	sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

	# Update framebuffer_height
	FINDTHIS="framebuffer_height=240"
	REPLACEWITH="framebuffer_height=240"
	sudo sed -i $"s%^${FINDTHIS}%${REPLACEWITH}%g" /boot/config.txt

}

func_menu_individuals() { 
	# Menu configuration.
	local BACKTITLE="CONFIG SCRIPTS - INDIVIDUAL"
	local MENU="Choose an option."
	local HEIGHT=16
	local WIDTH=80
	local MENUHEIGHT=$HEIGHT

	# Menu options configuration.
	local OPTIONS=(0 "CANCEL")
	OPTIONS+=( 1 "01_rpi_config.sh   # /boot/config.txt update(s)")
	OPTIONS+=( 2 "02_linux.sh        # Installs Linux packages.")
	OPTIONS+=( 3 "03_node_npm.sh     # Installs NodeJS and NPM.")
	OPTIONS+=( 4 "04_python.sh       # Installs Python modules.")
	OPTIONS+=( 5 "05_fbcp.sh         # Installs fbcp (framebuffer copy.)")
	OPTIONS+=( 6 "06_app_install.sh  # Installs the npm packages for the app. ")
	OPTIONS+=( 7 "rpi3b_flagConfig   # Sets flags specific to the rpi3b. ")
	OPTIONS+=( 8 "07_pm2.sh          # Installs pm2 and configures it.")
	OPTIONS+=( 9 "REBOOT")
	# OPTIONS+=( 10 "HELP")

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
				0)	break ;;
				1)	rpi_config ;;
				2)	linux ;;
				3)	node_npm ;;
				4)	python ;;
				5)	fbcp ;;
				6)	06_app_install ;;
				7)	rpi3b_flagConfig ;;
				8)	pm2 ;;
				9)	sudo reboot ;;
				# 10)	help_func2  ;;
			esac

		# If a selection was not made (specifically CANCEL) then exit.
		else
			clear
			break
		fi
	done
}

func_menu(){ 
	# Menu configuration.
	local BACKTITLE="CONFIG SCRIPTS - MAIN MENU"
	local MENU="Choose an option."
	local HEIGHT=13
	local WIDTH=80
	local MENUHEIGHT=$HEIGHT

	# Menu options configuration.
	local OPTIONS=(0 "CANCEL")
	OPTIONS+=( 1 "Updates for /boot/config.txt -----------------> RUN THIS FIRST")
	OPTIONS+=( 2 "Run config scripts (Raspberry Pi Zero W)")
	OPTIONS+=( 3 "Run config scripts (Raspberry Pi 3 B)")
	OPTIONS+=( 4 "Choose from list of individual config scripts.")
	OPTIONS+=( 5 "REBOOT    (Do this AFTER you have made your choice(s).)")
	# OPTIONS+=( 6 "HELP")

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
				0)	exit ;;
				1)	rpi_config ;;
				2)	rpi0w_autoConfig ;;
				3)	rpi3b_autoConfig ;;
				4)	func_menu_individuals ;;
				5)	sudo reboot  ;;
				# 6)	help1_func ;;
			esac

		# If a selection was not made (specifically CANCEL) then exit.
		else
			clear
			exit
		fi
	done
}

# Start the menu.
func_menu
# read -n 1 -s -r -p "Press any key to continue"
