# Command-Er Mini

Designed with this hardware in mind: 
* [Raspberry Pi Zero WH Package F, with UPS Module and 1.3inch LCD](https://www.waveshare.com/raspberry-pi-zero-wh-package-f.htm) 
Designed to interact with this software:
* [Command-Er (currently private)](https://github.com/nicksen782/Command-Er) 

## Features:
- Portable mostly self-contained client for Command-Er (or anything else really.)
- Battery as UPS, and LCD with button controls to control the application.
- Web server built-in for debugging.
  - Server keeps a canvas and can output that data to the LCD framebuffer
  - Can send the canvas data to a webclient via WebSocket.
  - Can control the device via the web server and see the LCD screen on your computer.

## TODO:
- Connection to Command-Er to send commands through a selected terminal or a default terminal.
- Menu system to govern the usage of the device. 
- Status updates on a command that is sent. 

## Tested with:
- Raspberry Pi Zero W
- Python 3.9.2
- NodeJs 16.15.1

# INSTALL INSTRUCTIONS:
````sh
# Install git (it isn't included in a RPI OS Lite image.)
sudo apt install git -y

# Change to the home directory.
cd ~

# Clone the repo.
git clone https://github.com/nicksen782/Command-Er_mini.git MINI

# Clone the repo (optionally you can set the branch to checkout.)
# git clone https://github.com/nicksen782/Command-Er_mini.git MINI --branch DEV
````
## Update the /boot/config.txt file:
  - Run bash ~/MINI/setupScripts/01_rpi_config.sh
    - This will change your /boot/config.txt file.
      - It gives you an opportunty to cancel.
    - It creates a backup of /boot/config.txt BEFORE overwritting it.
  - Run raspi-config
    - System Options > Boot / Auto Login > Console
    - Interface Options > SPI > Yes
    - Interface Options > I2C > Yes
  - Reboot after this script is finished.

## Use the setupScripts/setup.sh script to continue.
  - Next, run bash ~/MINI/setupScripts/setup.sh
    - It will:
      - Install Linux packages.          (~/MINI/setupScripts/02_linux.sh)
      - Install NodeJS and NPM.          (~/MINI/setupScripts/03_node_npm.sh)
      - Install Python modules.          (~/MINI/setupScripts/04_python.sh)
      - Install fbcp (framebuffer copy.) (~/MINI/setupScripts/05_fbcp.sh)
	    - This will add a call to fbcp at the end of your rc.local file (before the exit 0.)
  - Reboot after this script is finished.

## Install the NPM packages for the application:
  - Note: Takes a little over 5 minutes.
````sh
# Change to the app directory.
cd ~/MINI
npm install
cd ~
````

## Install/configure PM2
  - todo
  - sudo npm i -g pm2 

# node ~/MINI
