const fs = require("fs");
const {createCanvas, loadImage} = require("canvas");

let _APP = null;

let _MOD = {

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// INITIALIZE WEBSOCKETS.
			_MOD.webSockets.initWss(_APP.app, _APP.express);
			
			// INITIALIZE CANVAS.
			await _MOD.canvas.init();

			// INITIALIZE TIME UPDATER.
			await _MOD.timeUpdate.startInterval();

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		//
		// _APP.addToRouteList({ path: "/get_config", method: "post", args: [], file: __filename, desc: "get_config" });
		// app.post('/get_config'    ,express.json(), async (req, res) => {
		// 	try{ 
		// 		let result = await _MOD.get_config(); 
		// 		res.json(result);
		// 	}
		// 	catch(e){
		// 		res.json(e);
		// 	}
		// });

	},
	timeUpdate: {
		intervalId: null,
		prevTimeString: "",
		delay: 500,
		startInterval: function(){
			_MOD.timeUpdate.intervalId = setInterval(function(){
				let x=0*12; let y=23*12;
				var d = new Date(); // for now
				let h = d.getHours();
				if (h > 12) { h -= 12; } 
				else if (h === 0) { h = 12; }
				h.toString().padStart(2, "0"); //

				let m = d.getMinutes().toString().padStart(2, "0");
				let s = d.getSeconds().toString().padStart(2, "0");
				let str2 = `${h}:${m}:${s}`;

				// Only update the canvas if the timestring has changed.
				if(str2 != _MOD.timeUpdate.prevTimeString){
					_MOD.timeUpdate.prevTimeString = str2;
					_MOD.canvas.fillRect(x, y, 12*23, 12*1, "#101010");
					_MOD.canvas.print(str2, x, y, 12);
				}
			}, _MOD.timeUpdate.delay);
		},
	},
	canvas: {
		// CANVAS
		canvas:null,
		ctx   :null,

		// TEXT PRINTING
		tileset: null, // Graphics assets. 
		fb     : null, // The framebuffer used by the lcd.
		buff   : null, // Raw canvas data for the framebuffer.
		buff2  : null, // ArrayBuffer

		// LCD UPDATE FLAGS.
		updatingLCD: false,
		lcdUpdateNeeded: false,

		// CORDS FOR CHARS.
		charCoords: {
			" " : { x:(12)*0  , y:(12)*0, w:12, h:12 },
			"!" : { x:(12)*1  , y:(12)*0, w:12, h:12 },
			'"' : { x:(12)*2  , y:(12)*0, w:12, h:12 },
			"#" : { x:(12)*3  , y:(12)*0, w:12, h:12 },
			"$" : { x:(12)*4  , y:(12)*0, w:12, h:12 },
			"%" : { x:(12)*5  , y:(12)*0, w:12, h:12 },
			"&" : { x:(12)*6  , y:(12)*0, w:12, h:12 },
			"'" : { x:(12)*7  , y:(12)*0, w:12, h:12 },
			"(" : { x:(12)*8  , y:(12)*0, w:12, h:12 },
			")" : { x:(12)*9  , y:(12)*0, w:12, h:12 },
			"*" : { x:(12)*10 , y:(12)*0, w:12, h:12 },
			"+" : { x:(12)*11 , y:(12)*0, w:12, h:12 },
			"," : { x:(12)*12 , y:(12)*0, w:12, h:12 },
			"-" : { x:(12)*13 , y:(12)*0, w:12, h:12 },
			"." : { x:(12)*14 , y:(12)*0, w:12, h:12 },
			"/" : { x:(12)*15 , y:(12)*0, w:12, h:12 },
			"0" : { x:(12)*0  , y:(12)*1, w:12, h:12 },
			"1" : { x:(12)*1  , y:(12)*1, w:12, h:12 },
			"2" : { x:(12)*2  , y:(12)*1, w:12, h:12 },
			"3" : { x:(12)*3  , y:(12)*1, w:12, h:12 },
			"4" : { x:(12)*4  , y:(12)*1, w:12, h:12 },
			"5" : { x:(12)*5  , y:(12)*1, w:12, h:12 },
			"6" : { x:(12)*6  , y:(12)*1, w:12, h:12 },
			"7" : { x:(12)*7  , y:(12)*1, w:12, h:12 },
			"8" : { x:(12)*8  , y:(12)*1, w:12, h:12 },
			"9" : { x:(12)*9  , y:(12)*1, w:12, h:12 },
			":" : { x:(12)*10 , y:(12)*1, w:12, h:12 },
			";" : { x:(12)*11 , y:(12)*1, w:12, h:12 },
			"<" : { x:(12)*12 , y:(12)*1, w:12, h:12 },
			"=" : { x:(12)*13 , y:(12)*1, w:12, h:12 },
			">" : { x:(12)*14 , y:(12)*1, w:12, h:12 },
			"?" : { x:(12)*15 , y:(12)*1, w:12, h:12 },
			"@" : { x:(12)*0  , y:(12)*2, w:12, h:12 },
			"A" : { x:(12)*1  , y:(12)*2, w:12, h:12 },
			"B" : { x:(12)*2  , y:(12)*2, w:12, h:12 },
			"C" : { x:(12)*3  , y:(12)*2, w:12, h:12 },
			"D" : { x:(12)*4  , y:(12)*2, w:12, h:12 },
			"E" : { x:(12)*5  , y:(12)*2, w:12, h:12 },
			"F" : { x:(12)*6  , y:(12)*2, w:12, h:12 },
			"G" : { x:(12)*7  , y:(12)*2, w:12, h:12 },
			"H" : { x:(12)*8  , y:(12)*2, w:12, h:12 },
			"I" : { x:(12)*9  , y:(12)*2, w:12, h:12 },
			"J" : { x:(12)*10 , y:(12)*2, w:12, h:12 },
			"K" : { x:(12)*11 , y:(12)*2, w:12, h:12 },
			"L" : { x:(12)*12 , y:(12)*2, w:12, h:12 },
			"M" : { x:(12)*13 , y:(12)*2, w:12, h:12 },
			"N" : { x:(12)*14 , y:(12)*2, w:12, h:12 },
			"O" : { x:(12)*15 , y:(12)*2, w:12, h:12 },
			"P" : { x:(12)*0  , y:(12)*3, w:12, h:12 },
			"Q" : { x:(12)*1  , y:(12)*3, w:12, h:12 },
			"R" : { x:(12)*2  , y:(12)*3, w:12, h:12 },
			"S" : { x:(12)*3  , y:(12)*3, w:12, h:12 },
			"T" : { x:(12)*4  , y:(12)*3, w:12, h:12 },
			"U" : { x:(12)*5  , y:(12)*3, w:12, h:12 },
			"V" : { x:(12)*6  , y:(12)*3, w:12, h:12 },
			"W" : { x:(12)*7  , y:(12)*3, w:12, h:12 },
			"X" : { x:(12)*8  , y:(12)*3, w:12, h:12 },
			"Y" : { x:(12)*9  , y:(12)*3, w:12, h:12 },
			"Z" : { x:(12)*10 , y:(12)*3, w:12, h:12 },
			"[" : { x:(12)*11 , y:(12)*3, w:12, h:12 },
			"©" : { x:(12)*12 , y:(12)*3, w:12, h:12 },
			"]" : { x:(12)*13 , y:(12)*3, w:12, h:12 },
			"^" : { x:(12)*14 , y:(12)*3, w:12, h:12 },
			"_" : { x:(12)*15 , y:(12)*3, w:12, h:12 },
		},

		// CORDS FOR TILES.
		tileCoords: {
			"tile1"  : { x:(12)*0 , y:(12)*5, w:12, h:12 },
			"cursor1": { x:(12)*1 , y:(12)*5, w:12, h:12 },
			"cursor2": { x:(12)*2 , y:(12)*5, w:12, h:12 },
		},

		// DRAW ONE TILE TO THE CANVAS.
		setTile: function(tileName, x, y){
			let rec = _MOD.canvas.tileCoords[tileName];
			if(rec){
				_MOD.canvas.ctx.drawImage(
					_MOD.canvas.tileset,   // image
					rec.x , // sx
					rec.y , // sy
					rec.w , // sWidth
					rec.h , // sHeight
					x     , // dx
					y     , // dy
					rec.w , // dWidth
					rec.h // dHeight
				);
				_MOD.canvas.lcdUpdateNeeded = true;
			}
			else{
				console.log("setTile: NOT FOUND:", tileName);
			}
		},

		// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
		fillTile: function(tileName, x, y, w, h){
			let rec = _MOD.canvas.tileCoords[tileName];
			if(rec){
				for(let dy=0; dy<h; dy+=1){
					for(let dx=0; dx<w; dx+=1){
						_MOD.canvas.ctx.drawImage(
							_MOD.canvas.tileset,   // image
							rec.x    , // sx
							rec.y    , // sy
							rec.w    , // sWidth
							rec.h    , // sHeight
							x + dx*rec.w , // dx
							y + dy*rec.h , // dy
							rec.w    , // dWidth
							rec.h      // dHeight
						);
					}
				}
				_MOD.canvas.lcdUpdateNeeded = true;
			}
			else{
				console.log("fileTile: NOT FOUND:", tileName);
			}
		},

		// DRAW TEXT TO THE CANVAS. 
		print: function(str, x, y, rep=12){
			let startX = x; 
			let startY = y;
			let chars = str.split("");
			for(let i=0; i<chars.length; i+=1){
				if(rep+x > 296){ x=startX; y+=rep; }
				if(rep+y > 296){ x=startX; y=startY; }
				let rec = _MOD.canvas.charCoords[chars[i].toUpperCase()];
				if(rec){
					_MOD.canvas.ctx.drawImage(
						_MOD.canvas.tileset,   // image
						rec.x, // sx
						rec.y, // sy
						rec.w,   // sWidth
						rec.h,   // sHeight
						x, // rec.x*8, // dx
						y, // rec.y*8, // dy
						rep,   // dWidth
						rep    // dHeight
					);
				}
				x+=rep;
			}
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// CLEAR A REGION OF THE CANVAS. 
		clearRect: function(x,y,w,h){
			_MOD.canvas.ctx.clearRect(x,y,w,h);
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// FILL A REGION OF THE CANVAS WITH A COLOR.
		fillRect : function(x,y,w,h,fillStyle){
			_MOD.canvas.ctx.fillStyle = fillStyle; 
			_MOD.canvas.ctx.fillRect(x,y,w,h);
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// ACTUALLY UPDATE THE LCD SCREEN.
		updateFrameBuffer : function (){
			// Skip if there was not an update.
			// if(!_MOD.canvas.lcdUpdateNeeded){ return; }

			// Skip if an update is already in progress.
			if(_MOD.canvas.updatingLCD){ console.log("LCD is already in an update."); return; }

			// Set the updating flag. 
			_MOD.canvas.updatingLCD=true;

			_APP.timeIt("updateFrameBuffer", "s");
			_MOD.canvas.buff = _MOD.canvas.canvas.toBuffer("raw");
			fs.writeSync(_MOD.canvas.fb, _MOD.canvas.buff, 0, _MOD.canvas.buff.byteLength, 0);
			_APP.timeIt("updateFrameBuffer", "e");
			
			// Clear the updating flag. 
			_MOD.canvas.updatingLCD=false;

			// Clear the update needed flag. 
			_MOD.canvas.lcdUpdateNeeded = false;

			// DEBUG
			let t = _APP.timeIt("updateFrameBuffer", "t");
			if(t>15){
				console.log(`${t.toFixed(2)} vs ${_MOD.canvas.delay.toFixed(2)}`, (t > _MOD.canvas.delay ? "TOO LONG" : "STILL GOOD"));
			}
		},

		// INTERVAL TIMER
		interval : null,
		delay: (1/30)*1000,
		startInterval : async function(){
			if(_MOD.canvas.interval){ clearInterval(_MOD.canvas.interval); }
			_MOD.canvas.interval = setInterval(async function(){
				// Update only if the lcdUpdateNeeded flag is set. 
				if(_MOD.canvas.lcdUpdateNeeded){ 
					// console.log("update needed", _MOD.canvas.lcdUpdateNeeded);

					// UPDATE THE LCD DISPLAY.
					_MOD.canvas.updateFrameBuffer();
					
					// SEND AN UPDATE TO ALL CONNECTED CLIENTS. 
					_MOD.canvas.buff2 = _MOD.canvas.canvas.toBuffer();
					_APP.m_lcd.webSockets.sendToAll(_MOD.canvas.buff2);
				}
			}, _MOD.canvas.delay);
		},

		// INITIALIZE THE CANVAS. 
		init: async function(){
			// Canvas setup.
			_MOD.canvas.canvas = createCanvas(_APP.m_config.config.lcd.width, _APP.m_config.config.lcd.height ); // (not the whole screen.) VNC
			_MOD.canvas.ctx    = _MOD.canvas.canvas.getContext("2d");	
			_MOD.canvas.ctx.mozImageSmoothingEnabled    = false; // Firefox
			_MOD.canvas.ctx.imageSmoothingEnabled       = false; // Firefox
			_MOD.canvas.ctx.oImageSmoothingEnabled      = false; //
			_MOD.canvas.ctx.webkitImageSmoothingEnabled = false; //
			_MOD.canvas.ctx.msImageSmoothingEnabled     = false; //

			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			_MOD.canvas.fb = fs.openSync("/dev/fb0", "w");

			// Load the tileset graphic.
			_MOD.canvas.tileset = await loadImage("test2.png");

			// Clear the screen (leave gray the part of the screen that cannot be seen on the LCD.)
			_MOD.canvas.clearRect(0,0, _MOD.canvas.canvas.width, _MOD.canvas.canvas.height);
			_MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width, _MOD.canvas.canvas.height, "darkgray");
			_MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width-8, _MOD.canvas.canvas.height, "#101010");
			// _MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width-8, _MOD.canvas.canvas.height, "red");

			let x,y=0;
			x=0;  _MOD.canvas.print("FILLTILE:", x*12, y*12);
			x=10; _MOD.canvas.fillTile("tile1"  , x*12, y*12, 4, 1); 
			x=15; _MOD.canvas.fillTile("cursor1", x*12, y*12, 4, 2); 
			x=20; _MOD.canvas.fillTile("cursor2", x*12, y*12, 4, 3); 
			// setTimeout(function(){
				// x=0;y=10;  _MOD.canvas.print("TEST", x*12, y*12);
				// console.log(_MOD.canvas.fb);
				// console.log(_MOD.canvas.buff);
			// }, 5000);

			// START THE FRAMEBUFFER UPDATE TIMER.
			_MOD.canvas.startInterval();
		},
	},
	webSockets: {
		// Generate and return a uuid v4.
		uuidv4: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},

		// Returns a list of connected clients. 
		getClientCount: function(){
			// _APP.m_lcd.webSockets.getClientCount();
			let i=0;
			_APP.wss.clients.forEach(function each(ws) { i+=1 });
			return i;
		},

		// Returns a list of connected client ids. 
		getClientIds: function(){
			// _APP.m_lcd.webSockets.getClientIds();
			let arr=[];
			_APP.wss.clients.forEach(function each(ws) { arr.push(ws.id); });
			return arr;
		},

		// Sends the specified data to ALL connected clients. 
		sendToAll: function(data){
			// _APP.m_lcd.webSockets.sendToAll("HEY EVERYONE!");
			_APP.wss.clients.forEach(function each(ws) { ws.send(data); });
		},

		// Init the WebSocket connection.
		initWss: async function(app, express){
			// return new Promise(async function(resolve,reject){
				// This will be called whenever a new WebSocket client connects to the server:
				_APP.wss.on('connection', function connection(ws, res) {
					// WELCOME MESSAGE AND CLIENT NUMBER.
					ws.id = _MOD.webSockets.uuidv4();
					ws.send(JSON.stringify({"mode":"NEWCONNECTION", msg:ws.id}));
					ws.send(JSON.stringify({"mode":"WELCOMEMESSAGE", msg:`WELCOME TO COMMAND-ER MINI.`}));

					ws.addEventListener('message', async function(event){
						// console.log("message:", event.data);
						let data;
						let tests = { isJson: false, isText: false };
	
						// First, assume the data is JSON (verify this.)
						try{ data = JSON.parse(event.data); tests.isJson = true; }
						
						// Isn't JSON. Assume that it is text. 
						catch(e){ data = event.data; tests.isText = true; }
	
						if(tests.isJson){
							console.log("JSON:", data);
	
							// Check the mode.
							switch(data.mode){
								case "REQUEST_LCD_FRAMEBUFFER": { 
									ws.send(_MOD.canvas.buff2);
									// _MOD.canvas.lcdUpdateNeeded = true;
									break; 
								}
								case "REQUEST_LCD_FRAMEBUFFER_ALL": { 
									// ws.send(_MOD.canvas.buff2);
									_MOD.canvas.lcdUpdateNeeded = true;
									break; 
								}
								case "REQUEST_UUID": { 
									ws.send(JSON.stringify({ "mode":"REQUEST_UUID", msg:ws.id }));
									break; 
								}
								case "REQUEST_LCD_CONFIG": { 
									ws.send(JSON.stringify({ "mode":"REQUEST_LCD_CONFIG", msg:_APP.m_config.config.lcd }));
									break; 
								}
								case "GET_CLIENT_IDS": { 
									let arr = _MOD.webSockets.getClientIds();
									ws.send(JSON.stringify({ "mode":"GET_CLIENT_IDS", msg:arr }));
									break; 
								 }
								default: { 
									ws.send(JSON.stringify({"mode":"ERROR", msg:"UNKNOWN MODE: " + data.mode}));
									return; break; 
								}
							};
						}
						else if(tests.isText){
							console.log("TEXT:", data);
							
							// Check the mode. Assume that the text is the mode.
							switch(data){
								default: { 
									ws.send(JSON.stringify({"mode":"ERROR", msg:"UNKNOWN MODE: " + data}));
									return; break; 
								}
							}
						}
	
					});
					ws.addEventListener('close', async function(event){
						// console.log("close:", event);
						// console.log("close:");
						ws.close();
					});
					ws.addEventListener('error', async function(event){
						// console.log("error:", event);
						console.log("error:", event);
					});
				});
				// resolve();
			// });
		},
	}

};

module.exports = _MOD;
