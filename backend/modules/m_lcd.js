const fs = require("fs");
const {createCanvas, loadImage} = require("canvas");

let _APP = null;

let _MOD = {

	// Init this module.
	module_init: async function(parent){
		return new Promise(function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// INITIALIZE WEBSOCKETS EVENTS.
			if( _APP.m_config.config.ws.active ){ _MOD.WebSocket.initWss(_APP.app, _APP.express); }
			else{ console.log("WS DISABLED IN CONFIG"); }
			
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

		// REQUEST_LCD_CONFIG
		_APP.addToRouteList({ path: "/REQUEST_LCD_CONFIG", method: "post", args: [], file: __filename, desc: "REQUEST_LCD_CONFIG" });
		app.post('/REQUEST_LCD_CONFIG'    ,express.json(), (req, res) => {
			let c = _APP.m_config.config.lcd;
			res.json(c);
		});
	},
	timeUpdate: {
		intervalId: null,
		prevTimeString: "",
		delay: 500,
		func: function(x=0, y=28, tile="tile1"){
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
				if(str2 != _MOD.timeUpdate.prevTimeString || 1){
					// let x=0; let y=28;
					_MOD.timeUpdate.prevTimeString = str2;
					_MOD.canvas.fillTile(tile, x, y, 11, 1); 
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
			
			"tile_red"   : { L:4  , T:5 },
			"tile_green" : { L:5  , T:5 },
			"tile_blue"  : { L:6  , T:5 },

			"cursor1"    : { L:17 , T:0 },
			"cursor2"    : { L:17 , T:1 },
			"cursor3"    : { L:17 , T:2 },
			"cursor4"    : { L:17 , T:3 },
			"nochar"     : { L:16 , T:0 },
			"clock1"     : { L:12 , T:5 },
			"battcharge1": { L:13 , T:5 },
			"battcharge2": { L:13 , T:4 },
			"batt1"      : { L:14 , T:5 },
			"batt2"      : { L:15 , T:5 },
			"batt3"      : { L:16 , T:5 },
			"batt4"      : { L:17 , T:5 },
		},
		tileImages: {
		},

		loadTilesetImageToCanvas: function(tilesetKey){
			return new Promise(function(resolve,reject){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
	
				// Load the image. 
				loadImage(c.tilesets[tilesetKey].file)
				.then(function(img){
					// Create the canvas for the image.
					_MOD.canvas.tileset = createCanvas(img.width, img.height ); 
		
					// Create temporary drawing context.
					let ctx = _MOD.canvas.tileset.getContext("2d");	
		
					// Disable all anti-aliasing effects.
					ctx.mozImageSmoothingEnabled    = false; // Firefox
					ctx.imageSmoothingEnabled       = false; // Firefox
					ctx.oImageSmoothingEnabled      = false; //
					ctx.webkitImageSmoothingEnabled = false; //
					ctx.msImageSmoothingEnabled     = false; //
		
					// Draw the image to the new canvas. 
					ctx.drawImage(img, 0, 0);
					resolve();
				})
				.catch(function(e){ console.log("loadTilesetImageToCanvas: Error using loadImage.", c.tilesets[tilesetKey].file, e); reject(e); throw e;});

			});
		},
		tmpCanvas : null,
		tmpCtx    : null,
		genCachedTiles: function(){
			for(let k in _MOD.canvas.charCoords){
				// Check the cache. Create it if it doesn't exist. 
				if(!_APP.m_lcd.canvas.tileImages[k]){
					_MOD.canvas.genCachedTile(k, _MOD.canvas.charCoords[k]);
				}
			}
			for(let k in _MOD.canvas.tileCoords){
				// Check the cache. Create it if it doesn't exist. 
				if(!_APP.m_lcd.canvas.tileImages[k]){
					_MOD.canvas.genCachedTile(k, _MOD.canvas.tileCoords[k]);
				}
			}
		},
		genCachedTile : function(tileName, coordsObj){
			return new Promise(function(resolve,reject){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];

				// Try to find the tile object.
				let rec = coordsObj;
				if(!rec){ console.log("genCachedTile: tileName NOT found:", tileName, coordsObj); return; }
				
				// Create the cache canvas and cache it.
				_MOD.canvas.tmpCanvas = createCanvas(ts.s.tileWidth ,ts.s.tileHeight);
				_MOD.canvas.tmpCtx    = _MOD.canvas.tmpCanvas.getContext('2d');
				
				// Disable all anti-aliasing effects.
				_MOD.canvas.tmpCtx.mozImageSmoothingEnabled    = false; // Firefox
				_MOD.canvas.tmpCtx.imageSmoothingEnabled       = false; // Firefox
				_MOD.canvas.tmpCtx.oImageSmoothingEnabled      = false; //
				_MOD.canvas.tmpCtx.webkitImageSmoothingEnabled = false; //
				_MOD.canvas.tmpCtx.msImageSmoothingEnabled     = false; //

				_APP.m_lcd.canvas.tileImages[tileName] = _MOD.canvas.tmpCanvas;
				
				// Draw to the cached canvas.
				let args = [
					_MOD.canvas.tileset    , // image
					(rec.L*ts.n.tileWidth) , // sx
					(rec.T*ts.n.tileHeight), // sy
					ts.n.tileWidth         , // sWidth
					ts.n.tileHeight        , // sHeight
					0                      , // dx
					0                      , // dy
					ts.s.tileWidth         , // dWidth
					ts.s.tileHeight          // dHeight
				];
				_MOD.canvas.tmpCtx.drawImage(...args);

				resolve();
			});
		},

		// DRAW ONE TILE TO THE CANVAS.
		setTile: function(tileName, x, y){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
			let oob_x = x >= ts.s._cols ? true : false;
			let oob_y = y >= ts.s._rows ? true : false;
			if(oob_x){ return; }
			if(oob_y){ return; }

			// Check the cache. If not found then use 'nochar'.
			if(!_APP.m_lcd.canvas.tileImages[tileName]){
				// console.log("setTile: Tile not found:", tileName);
				tileName = 'nochar';
			}

			// Draw from the cache.
			args = [
				_APP.m_lcd.canvas.tileImages[tileName],
				(x*ts.s.tileWidth),
				(y*ts.s.tileHeight)
				// (x*8),
				// (y*8)
			];
			_MOD.canvas.ctx.drawImage(...args);

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
		fillTile: function(tileName, x, y, w, h){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];
			
			// Check the cache. If not found then use 'nochar'.
			if(!_APP.m_lcd.canvas.tileImages[tileName]){
				// console.log("fileTile: Tile not found:", tileName);
				tileName = 'nochar';
			}

			// Create a temp canvas/ctx.
			_MOD.canvas.cached_canvas = createCanvas( (ts.s.tileWidth*w) ,(ts.s.tileHeight*h) );
			_MOD.canvas.cached_ctx    = _MOD.canvas.cached_canvas.getContext('2d');

			// Draw the tiles (from cache.)
			for(let dy=0; dy<h; dy+=1){
				// Bounds-checking. (Ignore oob on y.)
				let oob_y = y >= ts.s._rows ? true : false;
				if(oob_y){ 
					console.log("fillTile: oob y"); 
					continue; 
				}

				for(let dx=0; dx<w; dx+=1){
					// Bounds-checking. (Ignore oob on X.)
					let oob_x = x >= ts.s._cols ? true : false;
					if(oob_x){ 
						console.log("fillTile: oob x"); 
						continue; 
					}

					let args = [
						_APP.m_lcd.canvas.tileImages[tileName],
						(dx*ts.s.tileWidth),
						(dy*ts.s.tileHeight)
					];

					// _MOD.canvas.ctx.drawImage(...args);
					_MOD.canvas.cached_ctx.drawImage(...args);
				}
			}

			// Draw the cached canvas. 
			_MOD.canvas.ctx.drawImage(_MOD.canvas.cached_canvas, (x*ts.s.tileWidth), (y*ts.s.tileHeight));

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// DRAW TEXT TO THE CANVAS. 
		print: function(str, x, y){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			let chars = str.split("");
			for(let i=0; i<chars.length; i+=1){
				let tileName = chars[i].toUpperCase();

				// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
				let oob_x = x >= ts.s._cols ? true : false;
				let oob_y = y >  ts.s._rows ? true : false;
				if(oob_x){ 
					console.log("print: oob: x", tileName); 
					continue; 
				}
				if(oob_y){ 
					console.log("print: oob: y", tileName); 
					continue; 
				}
				
				// Check the cache. If not found then use 'nochar'.
				if(!_APP.m_lcd.canvas.tileImages[ tileName ]){
					// console.log("print: Tile not found:", tileName);
					tileName = 'nochar';
				}

				// Draw it from the cache.
				args = [
					_APP.m_lcd.canvas.tileImages[ tileName ],
					(x*ts.s.tileWidth),
					(y*ts.s.tileHeight)
				];
				_MOD.canvas.ctx.drawImage(...args);
				
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
			// _MOD.canvas.ctx.fillStyle = "#333333"; 
			// _MOD.canvas.ctx.fillRect(0, 0, c.width, c.height);
			_MOD.canvas.clearScreen("tile4");

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// CLEAR THE VISIBLE REGION OF THE LCD DISPLAY.
		clearScreen: function(tile="tile4"){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			// Clear the screen (entire.)
			_MOD.canvas.ctx.clearRect(0,0, ts.s._cols*ts.s.tileWidth, ts.s._rows*ts.s.tileHeight);

			// Clear the active region of the LCD.
			_MOD.canvas.fillTile(tile, 0, 0, ts.s._cols, ts.s._rows); 
			
			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// FILL A REGION OF THE CANVAS WITH A COLOR.
		fillRect : function(x,y,w,h,fillStyle){
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			// Boundry checking.
			x = Math.min(x, ts.s._cols);
			y = Math.min(y, ts.s._rows);

			// Repaint the screen with a color. 
			_MOD.canvas.ctx.fillStyle = fillStyle; 
			_MOD.canvas.ctx.fillRect(x,y,w,h);

			// Set the lcdUpdateNeeded flag.
			_MOD.canvas.lcdUpdateNeeded = true;
		},

		// ACTUALLY UPDATE THE LCD SCREEN.
		tooLongs: 0,
		lastStamp:0,
		flag:1,
		updateFrameBuffer : function (){
			return new Promise(function(resolve,reject){
				// Skip if there was not an update.
				if(!_MOD.canvas.lcdUpdateNeeded){ console.log(`updateFrameBuffer: skipped: lcdUpdateNeeded: ${lcdUpdateNeeded}`); resolve(); return; }

				// Skip if an update is already in progress.
				if(_MOD.canvas.updatingLCD){ console.log("LCD is already in an update."); resolve(); return; }

				// Set the updating flag. 
				_MOD.canvas.updatingLCD=true;

				// UPDATE THE LOCAL LCD DISPLAY.
				if( _APP.m_config.config.lcd.active ){
					_APP.timeIt("lcd_buff_gen", "s");
					_MOD.canvas.buff = _MOD.canvas.canvas.toBuffer("raw");
					_APP.timeIt("lcd_buff_gen", "e");
	
					_APP.timeIt("lcd_buff_send", "s");
					fs.writeSync(_MOD.canvas.fb, _MOD.canvas.buff, 0, _MOD.canvas.buff.byteLength, 0);
					_APP.timeIt("lcd_buff_send", "e");
				}
				else{
					_APP.timeIt("lcd_buff_gen", "s");
					_APP.timeIt("lcd_buff_gen", "e");
	
					_APP.timeIt("lcd_buff_send", "s");
					_APP.timeIt("lcd_buff_send", "e");
				}
				
				// 
				
				// UPDATE REMOTE CLIENT DISPLAYS.
				if(_APP.m_config.config.ws.active){
					if( _APP.m_lcd.WebSocket.getClientCount() ){
						let sendAs;
						// sendAs = "svg";
						// sendAs = "svg";
						// sendAs = "dataurl";
						sendAs = "raw";

						// Send as SVG. (takes longer to generate the buffer.)
						if(sendAs == "svg"){
							// Copy the main canvas to the canvasSVG (around 8.2k)
							_APP.timeIt("ws_buff_gen", "s");
							let c = _APP.m_config.config.lcd;
							_APP.m_lcd.canvas.createSvgCanvas(); // Has to be created each time???!!!
							_MOD.canvas.ctxSVG.drawImage(_MOD.canvas.canvas, 0, 0);
							_APP.m_lcd.canvas.buff2 = _MOD.canvas.canvasSVG.toBuffer();
							_APP.timeIt("ws_buff_gen", "e");
	
							// Send the canvasSVG buffer to the client. 
							_APP.timeIt("ws_buff_send", "s");
							_APP.m_lcd.WebSocket.sendToAll( _APP.m_lcd.canvas.buff2 );
							// _APP.m_lcd.WebSocket.sendToAll( _MOD.canvas.buff ); // OLD way.
							_APP.timeIt("ws_buff_send", "e");
	
							// DEBUG - runs one time.
							if(_MOD.canvas.flag){
								// fs.writeFileSync('public/out_raw.png', _APP.m_lcd.canvas.canvas.toBuffer());
								fs.writeFileSync('public/out_svg.svg', _APP.m_lcd.canvas.canvasSVG.toBuffer());
								_MOD.canvas.flag = 0;
							}

							_MOD.canvas.updatingLCD=false;
							_MOD.canvas.lcdUpdateNeeded = false;
							resolve();
						}

						// Send as data url. (takes longer to generate the buffer.)
						if(sendAs == "dataurl"){
							// 
							_APP.timeIt("ws_buff_gen", "s");
							_APP.m_lcd.canvas.buff2 = _MOD.canvas.canvas.toDataURL();
							_APP.timeIt("ws_buff_gen", "e");

							// 
							_APP.timeIt("ws_buff_send", "s");
							_APP.m_lcd.WebSocket.sendToAll(
								JSON.stringify({
									mode:"DATAURL", dataurl:_APP.m_lcd.canvas.buff2
								})
							);
							// _APP.m_lcd.WebSocket.sendToAll( _MOD.canvas.buff ); // OLD way.
							_APP.timeIt("ws_buff_send", "e");

							_MOD.canvas.updatingLCD=false;
							_MOD.canvas.lcdUpdateNeeded = false;
							resolve();
						}

						// Send as raw. Fastest. large transfer (365k). (RAW from LCD buff. TO BE CONVERTED BY THE CLIENT.)
						if(sendAs == "raw"){
							// Copy the raw buffer to the second buffer.
							_APP.timeIt("ws_buff_gen", "s");
							_APP.m_lcd.canvas.buff2 = (_MOD.canvas.buff);
							_APP.timeIt("ws_buff_gen", "e");

							_APP.timeIt("ws_buff_send", "s");
							_APP.m_lcd.WebSocket.sendToAll(_APP.m_lcd.canvas.buff2);
							_APP.timeIt("ws_buff_send", "e");

							_MOD.canvas.updatingLCD=false;
							_MOD.canvas.lcdUpdateNeeded = false;
							resolve();
						}
					}
					else{
						_APP.timeIt("ws_buff_send", "s");
						_APP.timeIt("ws_buff_send", "e");
						_APP.timeIt("ws_buff_gen", "s");
						_APP.timeIt("ws_buff_gen", "e");
	
						// Clear the updating flag. 
						_MOD.canvas.updatingLCD=false;
		
						// Clear the update needed flag. 
						_MOD.canvas.lcdUpdateNeeded = false;
		
						resolve();
					}
				}
				else{
					_APP.timeIt("ws_buff_send", "s");
					_APP.timeIt("ws_buff_send", "e");
					_APP.timeIt("ws_buff_gen", "s");
					_APP.timeIt("ws_buff_gen", "e");

					// Clear the updating flag. 
					_MOD.canvas.updatingLCD=false;
	
					// Clear the update needed flag. 
					_MOD.canvas.lcdUpdateNeeded = false;
	
					resolve();
				}
			});
		},

		// INITIALIZE THE CANVAS. 
		createMainCanvas: function(){
			_MOD.canvas.canvas = createCanvas(_APP.m_config.config.lcd.width, _APP.m_config.config.lcd.height ); // (not the whole screen.) VNC
			_MOD.canvas.ctx    = _MOD.canvas.canvas.getContext("2d");	
			// _MOD.canvas.ctx.translate(4, 0);
			_MOD.canvas.ctx.mozImageSmoothingEnabled    = false; // Firefox
			_MOD.canvas.ctx.imageSmoothingEnabled       = false; // Firefox
			_MOD.canvas.ctx.oImageSmoothingEnabled      = false; //
			_MOD.canvas.ctx.webkitImageSmoothingEnabled = false; //
			_MOD.canvas.ctx.msImageSmoothingEnabled     = false; //
		},
		createSvgCanvas: function(){
			_MOD.canvas.canvasSVG = createCanvas(_APP.m_config.config.lcd.width, _APP.m_config.config.lcd.height, 'svg' );
			_MOD.canvas.ctxSVG    = _MOD.canvas.canvasSVG.getContext("2d");	
			// _MOD.canvas.ctxSVG.translate(4, 0);
			_MOD.canvas.ctxSVG.mozImageSmoothingEnabled    = false; // Firefox
			_MOD.canvas.ctxSVG.imageSmoothingEnabled       = false; // Firefox
			_MOD.canvas.ctxSVG.oImageSmoothingEnabled      = false; //
			_MOD.canvas.ctxSVG.webkitImageSmoothingEnabled = false; //
			_MOD.canvas.ctxSVG.msImageSmoothingEnabled     = false; //
		},
		init: async function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];

				// CANVAS SETUP.
				_MOD.canvas.createMainCanvas();
				_MOD.canvas.createSvgCanvas();
				await _MOD.canvas.loadTilesetImageToCanvas(c.activeTileset);

				// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
				_MOD.canvas.fb = fs.openSync("/dev/fb0", "w");

				// Generate cached tiles. 
				_APP.timeIt("genCachedTiles", "s");
				_MOD.canvas.genCachedTiles();
				_APP.timeIt("genCachedTiles", "e");

				// COMPLETE CLEAR OF THE SCREEN.
				_MOD.canvas.fullClearScreen();
				
				// CLEAR THE ACTIVE AREA OF THE SCREEN. 
				_MOD.canvas.clearScreen();
				resolve(); return; 
			});
		},
	},
	WebSocket: {
		// STATUS CODES
		statusCodes: {
			"1000": "Normal Closure",
			"1001": "Going Away",
			"1002": "Protocol error",
			"1003": "Unsupported Data",
			"1004": "Reserved",
			"1005": "No Status Rcvd",
			"1006": "Abnormal Closure",
			"1007": "Invalid frame payload data",
			"1008": "Policy Violation",
			"1009": "Message Too Big",
			"1010": "Mandatory Ext",
			"1011": "Internal Error",
			"1012": "Service Restart",
			"1013": "Try Again Later",
			"1014": "The server was acting as a gateway or proxy and received an invalid response from the upstream server. This is similar to 502 HTTP Status Code",
			"1015": "TLS handshake",
		},

		// READYSTATES
		readyStates: {
			"0":"CONNECTING",
			"1":"OPEN",
			"2":"CLOSING",
			"3":"CLOSED",
			"CONNECTING":0,
			"OPEN"      :1,
			"CLOSING"   :2,
			"CLOSED"    :3,
		},

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
			_APP.wss.clients.forEach(function each(ws) { 
				if (ws.readyState === _MOD.WebSocket.readyStates.OPEN) {
					i+=1 
				}
			});
			return i;
		},

		// Returns a list of connected client ids. 
		getClientIds: function(){
			// _APP.m_lcd.WebSocket.getClientIds();
			let arr={
				"connected":[],
				"disconnected":[],
			};
			_APP.wss.clients.forEach(function each(ws) { 
				if (ws.readyState === _MOD.WebSocket.readyStates.OPEN) { arr.connected.push(ws.id); }
				else{ arr.disconnected.push(ws.id) }
			});
			return arr;
		},

		// Sends the specified data to ALL connected clients. 
		sendToAll: function(data){
			// _APP.m_lcd.WebSocket.sendToAll("HEY EVERYONE!");
			_APP.wss.clients.forEach(function each(ws) { 
				if (ws.readyState === _MOD.WebSocket.readyStates.OPEN) {
					ws.send(data); 
				}
			});
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
				
				PRESS_AND_RELEASE_BUTTON:    async function(ws, event){
					let json = JSON.parse(event.data);
					let result = await _APP.m_gpio.pressAndRelease_button(json.button); 
					ws.send(JSON.stringify({ "mode":"PRESS_AND_RELEASE_BUTTON", msg:result }));
				},

				TOGGLE_PIN:    async function(ws, event){
					let json = JSON.parse(event.data);
					let result = await _APP.m_gpio.toggle_pin(json.button); 
					ws.send(JSON.stringify({ "mode":"TOGGLE_PIN", msg:result }));
				},
			},
			TEXT: {
			},
		},

		el_message: function(ws, event){
			// console.log("message:", event.data);
			let data;
			let tests = { isJson: false, isText: false };

			// First, assume the data is JSON (verify this.)
			try{ data = JSON.parse(event.data); tests.isJson = true; }
			
			// Isn't JSON. Assume that it is text. 
			catch(e){ data = event.data; tests.isText = true; }

			if(tests.isJson){
				if(_MOD.WebSocket.request_handlers.JSON[data.mode]){
					_MOD.WebSocket.request_handlers.JSON[data.mode](ws, event);
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
		el_close  : function(ws, event){ 
			console.log("close:", ws.id ); 
			ws.close(); 
			setTimeout(function(){ws.terminate(); }, 1000);
		},
		el_error  : function(ws, event){ 
			console.log("error:", event); 
			ws.close(); 
			setTimeout(function(){ws.terminate(); }, 1000);
		},

		// INIT THE WEBSOCKET CONNECTION.
		initWss: function(app, express){
			// THIS IS APPLIED FOR ALL NEW WEBSOCKET CONNECTIONS.
			_APP.wss.on('connection', function connection(ws, res) {
				// ws.binaryType = "arraybuffer";

				// GENERATE A UNIQUE ID FOR THIS CONNECTION. 
				ws.id = _MOD.WebSocket.uuidv4();

				console.log("open :", ws.id);
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
