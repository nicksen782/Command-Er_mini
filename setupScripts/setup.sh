#!/bin/bash

cd ~

# time bash ~/MINI/setupScripts/01_rpi_config.sh
time bash ~/MINI/setupScripts/02_linux.sh
time bash ~/MINI/setupScripts/03_node_npm.sh
time bash ~/MINI/setupScripts/04_python.sh
time bash ~/MINI/setupScripts/05_fbcp.sh
time bash ~/MINI/setupScripts/06_app_install.sh
time bash ~/MINI/setupScripts/07_pm2.sh

echo
echo "-- INSTALL IS COMPLETE - REBOOTING --"
sudo reboot
