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
			_MOD.WebSocket.initWss(_APP.app, _APP.express);
			
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
	},
	timeUpdate: {
		intervalId: null,
		prevTimeString: "",
		delay: 500,
		startInterval: function(){
			_MOD.timeUpdate.intervalId = setInterval(function(){
				var d = new Date(); // for now
				let h = d.getHours();
				let ampm="AM";
				if (h > 12) { h -= 12; ampm="PM";} 
				else if (h === 0) { h = 12; }
				h=h.toString().padStart(2, "0");

				let m = d.getMinutes().toString().padStart(2, "0");
				let s = d.getSeconds().toString().padStart(2, "0");
				let str2 = `${h}:${m}:${s} ${ampm}`;

				// Only update the canvas if the timestring has changed.
				if(str2 != _MOD.timeUpdate.prevTimeString){
					let x=0; let y=23;
					_MOD.timeUpdate.prevTimeString = str2;
					// _MOD.canvas.fillRect(x*12, y*12, 23*12, 1*12, "#101010");
					_APP.m_lcd.canvas.fillTile("tile2"  , x, y, 11, 1); 
					_MOD.canvas.print(str2, x, y);
				}
			}, _MOD.timeUpdate.delay);
		},
	},
	canvas: {
		// CANVAS
		canvas: null,
		ctx   : null,

		// TEXT PRINTING
		tileset: null, // Graphics assets. 
		fb     : null, // The framebuffer used by the lcd.
		buff   : null, // Raw canvas data for the framebuffer.
		buff2  : null, // ArrayBuffer of the canvas.

		// LCD UPDATE FLAGS.
		updatingLCD:     false,
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
			"\\": { x:(12)*12 , y:(12)*3, w:12, h:12 },
			"]" : { x:(12)*13 , y:(12)*3, w:12, h:12 },
			"^" : { x:(12)*14 , y:(12)*3, w:12, h:12 },
			"_" : { x:(12)*15 , y:(12)*3, w:12, h:12 },
		},

		// CORDS FOR TILES.
		tileCoords: {
			"tile1"  : { x:(12)*0 , y:(12)*5, w:12, h:12 },
			"tile2"  : { x:(12)*1 , y:(12)*5, w:12, h:12 },
			"tile3"  : { x:(12)*2 , y:(12)*5, w:12, h:12 },
			"cursor1": { x:(12)*17 , y:(12)*0, w:12, h:12 },
			"cursor2": { x:(12)*17 , y:(12)*1, w:12, h:12 },
			"cursor3": { x:(12)*17 , y:(12)*2, w:12, h:12 },
			"cursor4": { x:(12)*17 , y:(12)*3, w:12, h:12 },
			"nochar" : { x:(12)*16 , y:(12)*0, w:12, h:12 },
		},

		// DRAW ONE TILE TO THE CANVAS.
		setTile: function(tileName, x, y){
			let rec = _MOD.canvas.tileCoords[tileName];
			if(rec){
				_MOD.canvas.ctx.drawImage(
					_MOD.canvas.tileset, // image
					rec.x    ,           // sx
					rec.y    ,           // sy
					rec.w    ,           // sWidth
					rec.h    ,           // sHeight
					(x*rec.w),           // dx
					(y*rec.h),           // dy
					rec.w    ,           // dWidth
					rec.h                // dHeight
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
						if( (x*rec.w) + (dx*rec.w) > 296 ){ continue; }
						if( (y*rec.h) + (dy*rec.h) > 300 ){ continue; }
						_MOD.canvas.ctx.drawImage(
							_MOD.canvas.tileset    , // image
							rec.x                  , // sx
							rec.y                  , // sy
							rec.w                  , // sWidth
							rec.h                  , // sHeight
							(x*rec.w) + (dx*rec.w) , // dx
							(y*rec.h) + (dy*rec.h) , // dy
							rec.w                  , // dWidth
							rec.h                    // dHeight
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
		print: function(str, x, y){
			let startX = x; 
			let startY = y;
			let chars = str.split("");
			for(let i=0; i<chars.length; i+=1){
				let rec = _MOD.canvas.charCoords[chars[i].toUpperCase()];
				// if(i==5){ rec = false; }
				if(!rec){ rec = _MOD.canvas.tileCoords['nochar']; }
				if(rec){
					if((x*rec.w) > 296){ console.log("x wrap", str, str.length, rec.w+(x*rec.w)); x=startX; y+=1; }
					if((y*rec.h) > 300){ console.log("y wrap", str, str.length, rec.y+(y*rec.h)); x=startX; y=startY; }
					_MOD.canvas.ctx.drawImage(
						_MOD.canvas.tileset,   // image
						rec.x    , // sx
						rec.y    , // sy
						rec.w    , // sWidth
						rec.h    , // sHeight
						(x*rec.w), // dx
						(y*rec.h), // dy
						rec.w    , // dWidth
						rec.h      // dHeight
					);
				}
				x+=1;
			}
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// DRAW TEXT LINE TO THE CANVAS BY LINE NUMBER. 
		// printLine: function(str, lineNum){
		// },

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
		tooLongs: 0,
		lastStamp:0,
		updateFrameBuffer : function (){
			// Skip if there was not an update.
			if(!_MOD.canvas.lcdUpdateNeeded){ console.log("skipped"); return; }

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
				_MOD.canvas.tooLongs +=1;
				console.log(
					`tooLongs: ${_MOD.canvas.tooLongs}, ` +
					`timeSince: ${((performance.now() - _MOD.canvas.timeSince)/1000).toFixed(2) } seconds, ` +
					`${t.toFixed(2)} vs ${_MOD.canvas.delay.toFixed(2)}`,
					(t > _MOD.canvas.delay ? "TOO LONG" : "STILL GOOD"),
					new Date().toLocaleString('us-en'))
				;
				_MOD.canvas.timeSince = performance.now();
			}
		},

		// INTERVAL TIMER FOR LCD UPDATES.
		interval : null,
		delay: (1/30)*1000,
		startInterval : async function(){
			// Clear the current interval timer if it is already set. 
			if(_MOD.canvas.interval){ clearInterval(_MOD.canvas.interval); }

			// Start the interval timer and store the interval id.
			_MOD.canvas.interval = setInterval(async function(){
				// Update only if the lcdUpdateNeeded flag is set. 
				if(_MOD.canvas.lcdUpdateNeeded){ 
					setImmediate( ()=>{
						// UPDATE THE LCD DISPLAY.
						_MOD.canvas.updateFrameBuffer();
						
						// SEND AN UPDATE TO ALL CONNECTED CLIENTS. 
						setImmediate( ()=>{
							_MOD.canvas.buff2 = _MOD.canvas.canvas.toBuffer();
							_APP.m_lcd.WebSocket.sendToAll(_MOD.canvas.buff2);
						});
					});
				}
			}, _MOD.canvas.delay);
		},

		// INITIALIZE THE CANVAS. 
		init: async function(){
			// CANVAS SETUP.
			_MOD.canvas.canvas = createCanvas(_APP.m_config.config.lcd.width, _APP.m_config.config.lcd.height ); // (not the whole screen.) VNC
			_MOD.canvas.ctx    = _MOD.canvas.canvas.getContext("2d");	
			_MOD.canvas.ctx.mozImageSmoothingEnabled    = false; // Firefox
			_MOD.canvas.ctx.imageSmoothingEnabled       = false; // Firefox
			_MOD.canvas.ctx.oImageSmoothingEnabled      = false; //
			_MOD.canvas.ctx.webkitImageSmoothingEnabled = false; //
			_MOD.canvas.ctx.msImageSmoothingEnabled     = false; //
			_MOD.canvas.ctx.translate(2, 0);

			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			_MOD.canvas.fb = fs.openSync("/dev/fb0", "w");

			// Load the tileset graphic.
			// _MOD.canvas.tileset = await loadImage("test2.png");
			_MOD.canvas.tileset = await loadImage("test3.png");
			// _MOD.canvas.tileset = await loadImage("ExportedFont.bmp");

			// CLEAR THE SCREEN (LEAVE GRAY THE PART OF THE SCREEN THAT CANNOT BE SEEN ON THE LCD.)
			_MOD.canvas.clearRect(0,0, _MOD.canvas.canvas.width, _MOD.canvas.canvas.height);
			_MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width, _MOD.canvas.canvas.height, "darkgray");
			_MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width-16, _MOD.canvas.canvas.height, "#191919");
			// _MOD.canvas.fillRect(0, 0, _MOD.canvas.canvas.width-8, _MOD.canvas.canvas.height, "blue");
			console.log("_MOD.canvas.canvas.width, _MOD.canvas.canvas.height:", _MOD.canvas.canvas.width, _MOD.canvas.canvas.height);
			// DEBUG TEXT.

			_MOD.canvas.fillTile("tile1"  , 0, 0, 16, 1); 
			_MOD.canvas.print("COMMAND-ER MINI:"  , 0 , 0);

			_MOD.canvas.print("FILLTILE:"  , 0 , 3);
			_MOD.canvas.fillTile("tile1"   , 10, 3, 2, 1); 
			_MOD.canvas.fillTile("tile2"   , 10, 4, 2, 1); 
			_MOD.canvas.fillTile("tile3"   , 12, 3, 1, 2); 
			_MOD.canvas.fillTile("cursor2" , 14, 3, 2, 2); 
			_MOD.canvas.fillTile("cursor3" , 17, 3, 1, 2); 
			_MOD.canvas.fillTile("cursor4" , 19, 3, 1, 2); 
			_MOD.canvas.fillTile("nochar"  , 21, 3, 3, 3); 

			_MOD.canvas.print("SETTILE:"  , 0 , 6);
			_MOD.canvas.setTile("tile1"   , 10, 6); 
			_MOD.canvas.setTile("tile2"   , 11, 6); 
			_MOD.canvas.setTile("tile3"   , 12, 6); 
			_MOD.canvas.setTile("cursor1" , 13, 6); 
			_MOD.canvas.setTile("cursor2" , 14, 6); 
			_MOD.canvas.setTile("cursor3" , 15, 6); 
			_MOD.canvas.setTile("cursor4" , 16, 6); 
			_MOD.canvas.setTile("nochar"  , 17, 6); 
			
			_MOD.canvas.print("FONTTEST:", 0, 8);
			_MOD.canvas.print(" !\"#$%&'()*+,-./", 0, 9);
			_MOD.canvas.print("0123456789:;<=>?", 0,  10);
			_MOD.canvas.print("@ABCDEFGHIJKLMNO", 0,  11);
			_MOD.canvas.print("PQRSTUVWXYZ[\\]^_", 0, 12);

			// CURSOR TEST.
			let cursor = 0;
			setInterval(function(){
				if(cursor==0){
					_MOD.canvas.setTile("cursor2", 22, 23); 
					_MOD.canvas.setTile("cursor3", 23, 23); 
				}
				else{
					_MOD.canvas.setTile("cursor1", 22, 23); 
					_MOD.canvas.setTile("cursor4", 23, 23); 
				}
				cursor = !cursor;
			}, 250);

			// START THE FRAMEBUFFER UPDATE TIMER.
			_MOD.canvas.startInterval();
		},
	},
	WebSocket: {
		// Generate and return a uuid v4.
		uuidv4: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},

		// Returns a list of connected clients. 
		getClientCount: function(){
			// _APP.m_lcd.WebSocket.getClientCount();
			let i=0;
			_APP.wss.clients.forEach(function each(ws) { i+=1 });
			return i;
		},

		// Returns a list of connected client ids. 
		getClientIds: function(){
			// _APP.m_lcd.WebSocket.getClientIds();
			let arr=[];
			_APP.wss.clients.forEach(function each(ws) { arr.push(ws.id); });
			return arr;
		},

		// Sends the specified data to ALL connected clients. 
		sendToAll: function(data){
			// _APP.m_lcd.WebSocket.sendToAll("HEY EVERYONE!");
			_APP.wss.clients.forEach(function each(ws) { ws.send(data); });
		},

		// THESE CAN BE REQUESTED BY THE CLIENT VIA THE WEBSOCKET CONNECTION.
		request_handlers: {
			JSON: {
				// SEND THE CURRENT CANVAS BUFFER TO THE CLIENT. 
				REQUEST_LCD_FRAMEBUFFER:     function(ws){ 
					ws.send(_MOD.canvas.buff2); 
				},

				// FLAG THE LCD TO BE UPDATED. THIS ALSO PUSHES THE UPDATE TO ALL CONNECTED CLIENTS. 
				REQUEST_LCD_FRAMEBUFFER_ALL: function(ws){ 
					_MOD.canvas.lcdUpdateNeeded = true; 
				},

				// RETURNS THE USER'S UUID.
				REQUEST_UUID:                function(ws){ 
					ws.send(JSON.stringify({ "mode":"REQUEST_UUID", msg:ws.id })); 
				},

				// RETURNS THE LCD CONFIG.
				REQUEST_LCD_CONFIG:          function(ws){ 
					ws.send(JSON.stringify({ "mode":"REQUEST_LCD_CONFIG", msg:_APP.m_config.config.lcd })); 
				},

				// RETURNS A LIST OF UNIQUE CLIENT IDS THAT ARE CONNECTED VIA WEBSOCKET TO THE SERVER.
				GET_CLIENT_IDS:              function(ws){
					let arr = _MOD.WebSocket.getClientIds();
					ws.send(JSON.stringify({ "mode":"GET_CLIENT_IDS", msg:arr }));
				},
			},
			TEXT: {
			},
		},

		el_message: async function(ws, event){
			// console.log("message:", event.data);
			let data;
			let tests = { isJson: false, isText: false };

			// First, assume the data is JSON (verify this.)
			try{ data = JSON.parse(event.data); tests.isJson = true; }
			
			// Isn't JSON. Assume that it is text. 
			catch(e){ data = event.data; tests.isText = true; }

			if(tests.isJson){
				if(_MOD.WebSocket.request_handlers.JSON[data.mode]){
					_MOD.WebSocket.request_handlers.JSON[data.mode](ws);
				}
				else{
					ws.send(JSON.stringify({"mode":"ERROR", msg:"UNKNOWN MODE: " + data.mode}));
					return; 
				}
			}
			else if(tests.isText){
				if(_MOD.WebSocket.request_handlers.TEXT[data.mode]){
					_MOD.WebSocket.request_handlers.TEXT[data.mode](ws);
				}
				else{
					ws.send(JSON.stringify({"mode":"ERROR", msg:"UNKNOWN MODE: " + data}));
					return;
				}
			}
		},
		el_close  : async function(ws, event){ console.log("close"); ws.close(); },
		el_error  : async function(ws, event){ console.log("error:", event); ws.close(); },

		// INIT THE WEBSOCKET CONNECTION.
		initWss: async function(app, express){
			// THIS IS APPLIED FOR ALL NEW WEBSOCKET CONNECTIONS.
			_APP.wss.on('connection', function connection(ws, res) {
				// GENERATE A UNIQUE ID FOR THIS CONNECTION. 
				ws.id = _MOD.WebSocket.uuidv4();

				// SEND THE UUID.
				ws.send(JSON.stringify( {"mode":"NEWCONNECTION", msg:ws.id } ));
				
				// SEND THE NEW CONNECTION MESSAGE.
				ws.send(JSON.stringify( {"mode":"WELCOMEMESSAGE", msg:`WELCOME TO COMMAND-ER MINI.`} ));

				// ADD LISTENERS.
				ws.addEventListener('message', (event)=>_MOD.WebSocket.el_message(ws, event) );
				ws.addEventListener('close'  , (event)=>_MOD.WebSocket.el_close  (ws, event) );
				ws.addEventListener('error'  , (event)=>_MOD.WebSocket.el_error  (ws, event) );
			});
		},
	}

};

module.exports = _MOD;
