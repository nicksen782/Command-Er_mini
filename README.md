# Command-Er Mini

Designed with this hardware in mind: 
  * [Raspberry Pi Zero WH Package F, with UPS Module and 1.3inch LCD](https://www.waveshare.com/raspberry-pi-zero-wh-package-f.htm) 

Designed to interact with this software:
  * [Command-Er (currently private)](https://github.com/nicksen782/Command-Er) 

## Features:
- Use Command-Er MINI to send commands to Command-Er.
  - Command-Er MINI therefore acts like a remote control for Command-Er.
- Portable mostly self-contained remote client for Command-Er (potentially anything else too.)
- Battery as UPS
- LCD with button controls to control the application.
- Web server built-in for debugging.
  - The Web Client receives:
    - Canvas drawing changes (What is on the LCD screen.)
    - Various statistics.
  - The Web Client sends:
    - Button presses
    - Can set the server FPS.
    - Debug commands
  - Most features use WebSockets. Some use POST. 
    - Many of these features are available with both types.

## Tested with:
- Raspberry Pi Zero W
- Python 3.9.2
- NodeJs 16.9.1
- npm 7.2.1 or npm 8.18.0

## Connectivity:
- WiFi
- USB/Ethernet Gadget mode

# INSTALL INSTRUCTIONS:
## WRITE RASPBERRY PI OS LITE IMAGE TO THE SD CARD
  - Install Raspberry Pi Imager from: [Raspberry Pi Imager - https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/) 
    - Run the program.
    - CHOOSE OS > Raspberry PI OS (other) > Raspberry Pi OS Lite (32-bit)
    - CHOOSE STORAGE > <pick from the list.> (Be careful to choose the correct device/SD card)
    - (GEAR at the lower-right) > Configure as many settings as you can.
      - Specifically: Enable SSH, Configure wifi, Wifi country, Set locale settings.
        - I recommend also setting "Allow public-key authentication" and "Set authorized_keys for 'pi'".
      - Click "SAVE" at the bottom.
    - WRITE > YES.
      - Process takes between 5 - 10 minutes.
  - Once you have imaged your SD card put it in the Raspberry Pi and turn it on.
  - It will take a couple of minutes before your Pi will be accessible.
    - TIP: I have my DHCP server in my router assign an IP address to my Pi based on MAC address.
      - Therefore if you know the IP of the Pi you can just ping it until it responds so that you know when it is ready. Other than the blinking light there really are no other indications of readiness.
  - SSH into the Pi. Follow the directions below.

````sh
# Install git and dialog (they aren't included in a RPI OS Lite image.)
sudo apt install git dialog -y

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
    - It creates a backup of /boot/config.txt BEFORE apending to it.
    - NOTE: If you would like to do this step manually instead of overwriting /boot/config.txt then compare your own version and add the changes from the sample provided in: ~/MINI/setupScripts/boot/config.txt
  - The script will reboot the Pi after it finishes.
  - After the reboot is complete, SSH back into the Pi and continue with the command below.

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
  - The script will reboot the Pi after it finishes.
  - After the reboot is complete the process should be done. Within a minute you should see the app on the Pi LCD screen.
  - The app should start automatically after reboot (Take a little over 1 minute.)

## HELPFUL COMMANDS FOR PM2
  - Restart only:
    - pm2 restart COMMANDER_MINI
  - Log only: 
    - pm2 log COMMANDER_MINI
  - Restart and log: 
    - pm2 restart COMMANDER_MINI && pm2 log COMMANDER_MINI
  - PM2 Monitor: 
    - pm2 monit COMMANDER_MINI

# TODO:
- Connection to Command-Er to send commands through a selected terminal or a default terminal.
- Menu system to govern the usage of the device. 
- Status updates on a command that is sent. 

# TODO: USB/ETHERNET GADGET:
https://forums.raspberrypi.com/viewtopic.php?t=229208#p1405398
echo 'options g_ether host_addr='$(dmesg | awk '/: HOST MAC/{print $NF}')' dev_addr='$(dmesg | awk '/: MAC/{print $NF}') | sudo tee /etc/modprobe.d/g_ether.conf
sudo nano /etc/modprobe.d/g_ether.conf (replace line.)
g_ether.host_addr=e2:d2:89:d2:b2:e9 g_ether.dev_addr=e2:d2:89:d2:b2:eb
sudo nano /boot/cmdline.txt (add to the end.)
modules-load=dwc2,g_ether g_ether.host_addr=e2:d2:89:d2:b2:e9 g_ether.dev_addr=e2:d2:89:d2:b2:eb

# TODO:
Menus:
  Display connectivity data such as IP addresses and port.
  Turn on/off WiFi.
  Restart APP.
  Restart Linux.
  Shutdown Linux.
  Switch to other screens.
# TODO:
Menu Overlays:
  A method to copy the VRAM for the region to overwritten by the new menu.
  A method to overlay a smaller menu on the screen.
  A method to disable the previous menu cursors but still leave the uncovered portion of the previos menu displayed.
  A method to close the new menu, clear it, and restore the previous VRAM.
  A way to overlay the screen but save the previous VRAM in that region fir

# TODO: RPI3 Install:
~/MINI/setupScripts/01_rpi_config.sh
~/MINI/setupScripts/02_linux.sh
~/MINI/setupScripts/03_node_npm.sh
~/MINI/setupScripts/04_python.sh
~/MINI/setupScripts/05_fbcp.sh
~/MINI/setupScripts/06_app_install.sh
~/MINI/setupScripts/07_pm2.sh