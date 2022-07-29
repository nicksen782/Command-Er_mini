# Command-Er Mini

Designed with this hardware in mind: 
* [Raspberry Pi Zero WH Package F, with UPS Module and 1.3inch LCD](https://www.waveshare.com/raspberry-pi-zero-wh-package-f.htm) 
Designed to interact with this software:
* [Command-Er (currently private)](https://github.com/nicksen782/Command-Er) 

## Features:
* Portable mostly self-contained client for Command-Er (or anything else really.)
* Battery as UPS, and LCD with button controls to control the application.
* Web server built-in for debugging.
  * Server keeps a canvas and can output that data to the LCD framebuffer
  * Can send the canvas data to a webclient via WebSocket.
  * Can control the device via the web server and see the LCD screen on your computer.

## TODO:
* Connection to Command-Er to send commands through a selected terminal or a default terminal.
* Menu system to govern the usage of the device. 
* Status updates on a command that is sent. 