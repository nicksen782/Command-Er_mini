#!/bin/bash

# ###
# PM2
# ###

echo
echo "******************"
echo "* INSTALLING PM2 *"
echo "******************"
echo

# Change to the home directory.
cd ~

echo
echo "-- PM2 AND PM2-LOGROTATE --"
sudo npm i -g pm2
pm2 install pm2-logrotate

echo
echo "-- CONFIGURE PM2 LOG DIR AS TMPFS (RAM-DISK) --"
sudo su -c "echo 'tmpfs                 /home/pi/.pm2/logs   tmpfs   defaults,noatime  0 0' >> /etc/fstab"

echo
echo "-- COPY ECOSYSTEM.CONFIG.JS TO ~ --"
cp MINI/setupScripts/ecosystem.config.js ~

echo
echo "-- SETUP PM2 STARTUP --"
CMD=$(pm2 startup | tail -n 1)
eval $CMD

echo
echo "-- START PM2 WITH ECOSYSTEM.CONFIG.JS --"
pm2 start ecosystem.config.js

echo
echo "-- SAVE PM2 CONFIG --"
pm2 save