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
			
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		//
		_APP.addToRouteList({ path: "/LCD", method: "ws", args: ["REQUEST_LCD_FRAMEBUFFER"]    , file: __filename, desc: "Return current framebuffer as PNG blob." });
		_APP.addToRouteList({ path: "/LCD", method: "ws", args: ["REQUEST_LCD_FRAMEBUFFER_ALL"], file: __filename, desc: "Send LCD update to all connected WebSocket clients. " });
		_APP.addToRouteList({ path: "/LCD", method: "ws", args: ["REQUEST_UUID"]               , file: __filename, desc: "Request your own UUID." });
		_APP.addToRouteList({ path: "/LCD", method: "ws", args: ["REQUEST_LCD_CONFIG"]         , file: __filename, desc: "Request LCD config." });
		_APP.addToRouteList({ path: "/LCD", method: "ws", args: ["GET_CLIENT_IDS"]             , file: __filename, desc: "Request all UUIDs." });
	},
	timeUpdate: {
		intervalId: null,
		prevTimeString: "",
		delay: 500,
		func: function(){
			return new Promise(async function(resolve,reject){
				var d = new Date(); // for now
				let h = d.getHours();
				let ampm="AM";
				if (h > 12) { h -= 12; ampm="PM";} 
				else if (h === 0) { h = 12; }
				h=h.toString().padStart(2, " ");
		
				let m = d.getMinutes().toString().padStart(2, "0");
				let s = d.getSeconds().toString().padStart(2, "0");
				let str2 = `${h}:${m}:${s}${ampm}`;
		
				// Only update the canvas if the timestring has changed.
				if(str2 != _MOD.timeUpdate.prevTimeString){
					let x=0; let y=24;
					_MOD.timeUpdate.prevTimeString = str2;
					_MOD.canvas.fillTile("tile1", x, y, 11, 1); 
					_MOD.canvas.setTile("clock1", x, y);
					_MOD.canvas.print(str2, x+1, y);
				}
				resolve();
			});
		},
		startInterval: function(){
			_MOD.timeUpdate.intervalId = setInterval(_MOD.timeUpdate.func, _MOD.timeUpdate.delay);
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
			" " : { L:0  , T:0 },
			"!" : { L:1  , T:0 },
			'"' : { L:2  , T:0 },
			"#" : { L:3  , T:0 },
			"$" : { L:4  , T:0 },
			"%" : { L:5  , T:0 },
			"&" : { L:6  , T:0 },
			"'" : { L:7  , T:0 },
			"(" : { L:8  , T:0 },
			")" : { L:9  , T:0 },
			"*" : { L:10 , T:0 },
			"+" : { L:11 , T:0 },
			"," : { L:12 , T:0 },
			"-" : { L:13 , T:0 },
			"." : { L:14 , T:0 },
			"/" : { L:15 , T:0 },

			"0" : { L:0  , T:1 },
			"1" : { L:1  , T:1 },
			"2" : { L:2  , T:1 },
			"3" : { L:3  , T:1 },
			"4" : { L:4  , T:1 },
			"5" : { L:5  , T:1 },
			"6" : { L:6  , T:1 },
			"7" : { L:7  , T:1 },
			"8" : { L:8  , T:1 },
			"9" : { L:9  , T:1 },
			":" : { L:10 , T:1 },
			";" : { L:11 , T:1 },
			"<" : { L:12 , T:1 },
			"=" : { L:13 , T:1 },
			">" : { L:14 , T:1 },
			"?" : { L:15 , T:1 },

			"@" : { L:0  , T:2 },
			"A" : { L:1  , T:2 },
			"B" : { L:2  , T:2 },
			"C" : { L:3  , T:2 },
			"D" : { L:4  , T:2 },
			"E" : { L:5  , T:2 },
			"F" : { L:6  , T:2 },
			"G" : { L:7  , T:2 },
			"H" : { L:8  , T:2 },
			"I" : { L:9  , T:2 },
			"J" : { L:10 , T:2 },
			"K" : { L:11 , T:2 },
			"L" : { L:12 , T:2 },
			"M" : { L:13 , T:2 },
			"N" : { L:14 , T:2 },
			"O" : { L:15 , T:2 },

			"P" : { L:0  , T:3 },
			"Q" : { L:1  , T:3 },
			"R" : { L:2  , T:3 },
			"S" : { L:3  , T:3 },
			"T" : { L:4  , T:3 },
			"U" : { L:5  , T:3 },
			"V" : { L:6  , T:3 },
			"W" : { L:7  , T:3 },
			"X" : { L:8  , T:3 },
			"Y" : { L:9  , T:3 },
			"Z" : { L:10 , T:3 },
			"[" : { L:11 , T:3 },
			"\\": { L:12 , T:3 },
			"]" : { L:13 , T:3 },
			"^" : { L:14 , T:3 },
			"_" : { L:15 , T:3 },
		},

		// CORDS FOR TILES.
		tileCoords: {
			"tile1"      : { L:0  , T:5 },
			"tile2"      : { L:1  , T:5 },
			"tile3"      : { L:2  , T:5 },
			"tile4"      : { L:3  , T:5 },
			"cursor1"    : { L:17 , T:0 },
			"cursor2"    : { L:17 , T:1 },
			"cursor3"    : { L:17 , T:2 },
			"cursor4"    : { L:17 , T:3 },
			"nochar"     : { L:16 , T:0 },
			"clock1"     : { L:12 , T:5 },
			"battcharge" : { L:13 , T:5 },
			"batt1"      : { L:14 , T:5 },
			"batt2"      : { L:15 , T:5 },
			"batt3"      : { L:16 , T:5 },
			"batt4"      : { L:17 , T:5 },
		},

		// DRAW ONE TILE TO THE CANVAS.
		setTile: function(tileName, x, y){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;

			let rec = _MOD.canvas.tileCoords[tileName];

			// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
			let oob_x = x >= c.cols ? true : false;
			let oob_y = y >= c.rows ? true : false;
			if(oob_x){ return; }
			if(oob_y){ return; }

			if(rec){
				_MOD.canvas.ctx.drawImage(
					_MOD.canvas.tileset , // image
					(rec.L*c.tileWidth) ,  // sx
					(rec.T*c.tileHeight),  // sy
					c.tileWidth         ,  // sWidth
					c.tileHeight        ,  // sHeight
					(x*c.tileWidth)     ,  // dx
					(y*c.tileHeight)    ,  // dy
					c.tileWidth         ,  // dWidth
					c.tileHeight           // dHeight
				);
				_MOD.canvas.lcdUpdateNeeded = true;
			}
			else{
				console.log("setTile: NOT FOUND:", tileName);
			}
		},

		// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
		fillTile: function(tileName, x, y, w, h){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			
			let rec = _MOD.canvas.tileCoords[tileName];
		
			if(rec){
				for(let dy=0; dy<h; dy+=1){
					// Bounds-checking. (Ignore oob on y.)
					let oob_y = y >= c.rows ? true : false;
					if(oob_y){ continue; }

					for(let dx=0; dx<w; dx+=1){
						// Bounds-checking. (Ignore oob on X.)
						let oob_x = x >= c.cols ? true : false;
						if(oob_x){ continue; }

						_MOD.canvas.ctx.drawImage(
							_MOD.canvas.tileset                  , // image
							(rec.L*c.tileWidth)                  , // sx
							(rec.T*c.tileHeight)                 , // sy
							c.tileWidth                          , // sWidth
							c.tileHeight                         , // sHeight
							(x*c.tileWidth)  + (dx*c.tileWidth)  , // dx
							(y*c.tileHeight) + (dy*c.tileHeight) , // dy
							c.tileWidth                          , // dWidth
							c.tileHeight                           // dHeight
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
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;

			let chars = str.split("");
			for(let i=0; i<chars.length; i+=1){
				// Get the source data for the char.
				let rec = _MOD.canvas.charCoords[chars[i].toUpperCase()];

				// If the char was not found then use the 'nochar' data.
				if(!rec){ rec = _MOD.canvas.tileCoords['nochar']; }

				// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
				let oob_x = x >= c.cols ? true : false;
				let oob_y = y > c.rows ? true : false;
				if(oob_x){ continue; }
				if(oob_y){ continue; }
				
				// Draw it.
				_MOD.canvas.ctx.drawImage(
					_MOD.canvas.tileset  , // image
					(rec.L*c.tileWidth)  , // sx
					(rec.T*c.tileHeight) , // sy
					c.tileWidth          , // sWidth
					c.tileHeight         , // sHeight
					(x*c.tileWidth)      , // dx
					(y*c.tileHeight)     , // dy
					c.tileWidth          , // dWidth
					c.tileHeight           // dHeight
				);
				x+=1;
			}
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// CLEAR THE CANVAS AND REDRAW THE DEFAULT BACKGROUND COLORS.
		fullClearScreen: function(){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;

			// Clear the screen (entire.)
			_MOD.canvas.ctx.clearRect(0,0, c.width, c.height);

			// Repaint the screen with a color. 
			_MOD.canvas.ctx.fillStyle = "#333333"; 
			_MOD.canvas.ctx.fillRect(0, 0, c.width, c.height);

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// CLEAR THE VISIBLE REGION OF THE LCD DISPLAY.
		clearScreen: function(tile="tile4"){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;

			// Clear the active region of the LCD.
			_MOD.canvas.fillTile(tile, 0, 0, c.cols, c.rows); 
			
			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// FILL A REGION OF THE CANVAS WITH A COLOR.
		fillRect : function(x,y,w,h,fillStyle){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;

			// Boundry checking.
			x = Math.min(x, c.cols);
			y = Math.min(y, c.rows);

			// Repaint the screen with a color. 
			_MOD.canvas.ctx.fillStyle = fillStyle; 
			_MOD.canvas.ctx.fillRect(x,y,w,h);

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// ACTUALLY UPDATE THE LCD SCREEN.
		tooLongs: 0,
		lastStamp:0,
		updateFrameBuffer : function (){
			return new Promise(function(resolve,reject){
				// Skip if there was not an update.
				if(!_MOD.canvas.lcdUpdateNeeded){ console.log("skipped"); resolve(); return; }

				// Skip if an update is already in progress.
				if(_MOD.canvas.updatingLCD){ console.log("LCD is already in an update."); resolve(); return; }

				// Set the updating flag. 
				_MOD.canvas.updatingLCD=true;

				_APP.timeIt("rawBuffer_gen", "s");
				_MOD.canvas.buff = _MOD.canvas.canvas.toBuffer("raw");
				_APP.timeIt("rawBuffer_gen", "e");

				_APP.timeIt("rawBuffer_write", "s");
				fs.writeSync(_MOD.canvas.fb, _MOD.canvas.buff, 0, _MOD.canvas.buff.byteLength, 0);
				_APP.timeIt("rawBuffer_write", "e");
				
				// 
				
				if(_APP.m_lcd.WebSocket.getClientCount()){
					// Works but is slower.
					// _APP.timeIt("ws_buff", "s");
					// _APP.m_lcd.canvas.buff2 = _APP.m_lcd.canvas.canvas.toBuffer('image/png', { compressionLevel: 0, filters: _APP.m_lcd.canvas.canvas.PNG_FILTER_NONE })
					// _APP.timeIt("ws_buff", "e");
					// _APP.timeIt("ws_send", "s");
					// _APP.m_lcd.WebSocket.sendToAll(_APP.m_lcd.canvas.buff2);
					// _APP.timeIt("ws_send", "e");
					// _MOD.canvas.updatingLCD=false;
					// _MOD.canvas.lcdUpdateNeeded = false;
					// resolve();

					// Does not work.
					// _APP.timeIt("ws_buff", "s");
					// _APP.timeIt("ws_buff", "e");
					// _APP.timeIt("ws_send", "s");
					// _APP.m_lcd.WebSocket.sendToAll(_MOD.canvas.buff);
					// _APP.timeIt("ws_send", "e");
					// _MOD.canvas.updatingLCD=false;
					// _MOD.canvas.lcdUpdateNeeded = false;
					// resolve();

					// Works.
					_APP.timeIt("ws_buff", "s");
					_APP.m_lcd.canvas.canvas.toBuffer((err, buf) => {
						_APP.timeIt("ws_buff", "e");
						if (err) throw err // encoding failed
						_APP.m_lcd.canvas.buff2 = buf;
						
						_APP.timeIt("ws_send", "s");
						_APP.m_lcd.WebSocket.sendToAll(_APP.m_lcd.canvas.buff2);
						_APP.timeIt("ws_send", "e");
						
						_MOD.canvas.updatingLCD=false;
						_MOD.canvas.lcdUpdateNeeded = false;
						resolve();
					}, 'image/jpeg', { quality: 0.25} );
				}
				else{
					_APP.timeIt("ws_send", "s");
					_APP.timeIt("ws_send", "e");
					_APP.timeIt("ws_buff", "s");
					_APP.timeIt("ws_buff", "e");

					// Clear the updating flag. 
					_MOD.canvas.updatingLCD=false;
	
					// Clear the update needed flag. 
					_MOD.canvas.lcdUpdateNeeded = false;
	
					resolve();
				}
			});
		},

		// INTERVAL TIMER FOR LCD UPDATES.
		// interval : null,
		// delay: (1/30)*1000,
		// startInterval : async function(){
		// 	// Clear the current interval timer if it is already set. 
		// 	if(_MOD.canvas.interval){ clearInterval(_MOD.canvas.interval); }

		// 	// Start the interval timer and store the interval id.
		// 	_MOD.canvas.interval = setInterval(async function(){
		// 		// Update only if the lcdUpdateNeeded flag is set. 
		// 		if(_MOD.canvas.lcdUpdateNeeded){ 
		// 			setImmediate( ()=>{
		// 				// UPDATE THE LCD DISPLAY.
		// 				_MOD.canvas.updateFrameBuffer();
						
		// 				// SEND AN UPDATE TO ALL CONNECTED CLIENTS. 
		// 				setImmediate( ()=>{
		// 					_MOD.canvas.buff2 = _MOD.canvas.canvas.toBuffer();
		// 					_APP.m_lcd.WebSocket.sendToAll(_MOD.canvas.buff2);
		// 				});
		// 			});
		// 		}
		// 	}, _MOD.canvas.delay);
		// },

		// INITIALIZE THE CANVAS. 
		init: async function(){
			// CANVAS SETUP.
			_MOD.canvas.canvas = createCanvas(_APP.m_config.config.lcd.width, _APP.m_config.config.lcd.height ); // (not the whole screen.) VNC
			_MOD.canvas.ctx    = _MOD.canvas.canvas.getContext("2d");	
			_MOD.canvas.ctx.translate(4, 0);
			_MOD.canvas.ctx.mozImageSmoothingEnabled    = false; // Firefox
			_MOD.canvas.ctx.imageSmoothingEnabled       = false; // Firefox
			_MOD.canvas.ctx.oImageSmoothingEnabled      = false; //
			_MOD.canvas.ctx.webkitImageSmoothingEnabled = false; //
			_MOD.canvas.ctx.msImageSmoothingEnabled     = false; //

			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			_MOD.canvas.fb = fs.openSync("/dev/fb0", "w");

			// Load the tileset graphic.
			// _MOD.canvas.tileset = await loadImage("test2.png");
			_MOD.canvas.tileset = await loadImage("test3.png");
			// _MOD.canvas.tileset = await loadImage("ExportedFont.bmp");

			// COMPLETE CLEAR OF THE SCREEN.
			_MOD.canvas.fullClearScreen();
			
			// CLEAR THE ACTIVE AREA OF THE SCREEN. 
			_MOD.canvas.clearScreen();
			
			// DEBUG TEXT.
			_MOD.canvas.fillTile("tile1"  , 0, 0, 16, 1); 
			_MOD.canvas.print("COMMAND-ER MINI:"  , 0 , 0);
			// _MOD.canvas.startInterval(); return; 

			_MOD.canvas.fillTile("tile2"  , 0, 1, 24, 1); 

			_MOD.canvas.print("FILLTILE:"  , 0 , 3);
			_MOD.canvas.fillTile("tile1"   , 10, 3, 2, 1); 
			_MOD.canvas.fillTile("tile2"   , 10, 4, 2, 1); 
			_MOD.canvas.fillTile("tile3"   , 12, 3, 1, 2); 
			_MOD.canvas.fillTile("cursor2" , 14, 3, 2, 2); 
			_MOD.canvas.fillTile("cursor3" , 17, 3, 1, 2); 
			_MOD.canvas.fillTile("cursor4" , 19, 3, 1, 2); 
			_MOD.canvas.fillTile("nochar"  , 21, 3, 3, 3); 

			_MOD.canvas.print("SETTILE :"   , 0 , 7);
			_MOD.canvas.setTile("tile1"     , 10, 7); 
			_MOD.canvas.setTile("tile2"     , 11, 7); 
			_MOD.canvas.setTile("tile3"     , 12, 7); 
			_MOD.canvas.setTile("cursor1"   , 13, 7); 
			_MOD.canvas.setTile("cursor2"   , 14, 7); 
			_MOD.canvas.setTile("cursor3"   , 15, 7); 
			_MOD.canvas.setTile("cursor4"   , 16, 7); 
			_MOD.canvas.setTile("nochar"    , 17, 7); 
			_MOD.canvas.setTile("battcharge", 18, 7); 
			_MOD.canvas.setTile("batt1"     , 19, 7); 
			_MOD.canvas.setTile("batt2"     , 20, 7); 
			_MOD.canvas.setTile("batt3"     , 21, 7); 
			_MOD.canvas.setTile("batt4"     , 22, 7); 
			_MOD.canvas.setTile("clock1"    , 23, 7); 
			
			_MOD.canvas.print("FONTTEST:", 0, 9);
			_MOD.canvas.print(" !\"#$%&'()*+,-./", 8, 10);
			_MOD.canvas.print("0123456789:;<=>?" , 8, 11);
			_MOD.canvas.print("@ABCDEFGHIJKLMNO" , 8, 12);
			_MOD.canvas.print("PQRSTUVWXYZ[\\]^_", 8, 13);
			
			_MOD.canvas.print("OOB TEST:", 0, 15);
			_MOD.canvas.print("NO WRAP: HAS 23 CHARS..", 0, 16);
			_MOD.canvas.print("NO WRAP: HAS 24 CHARS...", 0, 17);
			_MOD.canvas.print("CUTOFF : HAS 25 CHARS....", 0, 18);
			
			// Create a bar near the bottom.
			_MOD.canvas.fillTile("tile2"  , 0, 23, 24, 1); 
			// _MOD.canvas.print("..........11111111112222", 0, 24);
			// _MOD.canvas.fillTile("cursor4" , 0, 24, 24, 1); 
			// _MOD.canvas.fillTile("cursor3" , 0, 0, 1, 25); 
			// _MOD.canvas.clearScreen("tile1");

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
			// _MOD.canvas.startInterval();
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
		el_close  : async function(ws, event){ 
			console.log("close"); 
			ws.close(); 
			setTimeout(function(){ws.terminate(); }, 1000);
		},
		el_error  : async function(ws, event){ 
			console.log("error:", event); 
			ws.close(); 
			setTimeout(function(){ws.terminate(); }, 1000);
		},

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
