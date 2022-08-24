#!/bin/bash

# ######
# PYTHON
# ######

echo
echo "******************************"
echo "* INSTALLING PYTHON PACKAGES *"
echo "******************************"
echo

# Change to the home directory and install Python packages.
echo
echo "-- INSTALLING PYTHON PACKAGES --"
cd ~
pip3 install simple-websocket-server
pip3 install smbus

echo
echo "-- PYTHON VERSION --"
# Show the Python version.
python3 --version
