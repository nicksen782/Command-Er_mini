# Command-Er Mini

Designed with this hardware in mind: 
  * [Raspberry Pi Zero WH Package F, with UPS Module and 1.3inch LCD](https://www.waveshare.com/raspberry-pi-zero-wh-package-f.htm) 

Designed to interact with this software:
  * [Command-Er (currently private)](https://github.com/nicksen782/Command-Er) 

## Features:
- Portable mostly self-contained client for Command-Er (or anything else really.)
- Battery as UPS, and LCD with button controls to control the application.
- Web server built-in for debugging.
  - The Web Client receives:
    - Canvas drawing changes (What is on the LCD screen.)
    - Various statistics.
  - The Web Client sends:
    - Debug commands
    - Button presses
    - Can set the server FPS.
  - Most features use WebSockets. Some use POST. 
  - Many of these features are available with both types.

## Tested with:
- Raspberry Pi Zero W
- Python 3.9.2
- NodeJs 16.9.1
- npm 8.18.0

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
    - NOTE: If you would like to do this step manually instead of overwriting /boot/config.txt then compare your own version and add the changes from the sample provided in: ~/MINI/setupScripts/boot/config.txt
  - Run raspi-config
    - System Options > Boot / Auto Login > Console
    - Interface Options > SPI > Yes
    - Interface Options > I2C > Yes
  - Reboot after this script is finished.

## Use the setupScripts/setup.sh script to continue.
  - Next, run bash ~/MINI/setupScripts/setup.sh
    - It will run these scripts:
    ````sh
      (~/MINI/setupScripts/02_linux.sh)       - Installs Linux packages.
      (~/MINI/setupScripts/03_node_npm.sh)    - Installs NodeJS and NPM.
      (~/MINI/setupScripts/04_python.sh)      - Installs Python modules.
      (~/MINI/setupScripts/05_fbcp.sh)        - Installs fbcp (framebuffer copy.)
      (~/MINI/setupScripts/06_app_install.sh) - Installs the npm packages for the app. 
      (~/MINI/setupScripts/07_pm2.sh)         - Installs pm2 and configures it.
    ````
  - Reboot after this script is finished.

## FINISH
  - The app should start automatically after reboot (Take a little over 1 minute.)
  - COMMON PM2 MANAGEMENT COMMANDS:
    - Restart only:
      - pm2 restart COMMANDER_MINI
    - Log only: 
      - pm2 log COMMANDER_MINI
    - Restart and log: 
      - pm2 restart COMMANDER_MINI && pm2 log COMMANDER_MINI

# TODO:
- Connection to Command-Er to send commands through a selected terminal or a default terminal.
- Menu system to govern the usage of the device. 
- Status updates on a command that is sent. 