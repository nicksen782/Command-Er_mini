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
			if( _APP.m_config.config.ws.active ){ 
				_APP.consolelog("  WebSocket.initWss");
				_MOD.WebSocket.initWss(_APP.app, _APP.express); 
			}
			else{ 
				_APP.consolelog("  WS DISABLED IN CONFIG"); 
			}

			// Generate the lookup tables (x,y,index). (Files used by Python.)
			let lookups = _APP.m_lcd.canvas.draw.getLookupTables();
			_APP.m_lcd.canvas.draw._byIndex = lookups.byIndex;
			_APP.m_lcd.canvas.draw._byCoord = lookups.byCoord;
			
			// Add routes.
			_APP.consolelog("  addRoutes"); 
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
			let c = {
				lcd        : _APP.m_config.config.lcd,
				_tiles_ids : _APP.m_lcd.canvas.draw._tiles_ids,
				_tiles_keys: _APP.m_lcd.canvas.draw._tiles_keys,
				_byIndex   : _APP.m_lcd.canvas.draw._byIndex,
				_byCoord   : _APP.m_lcd.canvas.draw._byCoord,
			};
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
					_MOD.canvas.draw.fillTile(tile, x, y, 11, 1); 
					_MOD.canvas.draw.setTile("clock1", x, y);
					_MOD.canvas.draw.print(str2, x+1, y);
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

		// LCD UPDATE FLAGS.
		updatingLCD:     false,
		lcdUpdateNeeded: false,
		
		// Functions used for "drawing".
		draw: {
			buff_abgr   : null, // Raw BGRA data (framebuffer).
			_tiles_ids  : {}  , // Tile ids to tile names. Populated during m_battery module_init via ws.
			_tiles_keys : []  , // Tile names to tile ids. Populated during m_battery module_init via ws.
			_byIndex    : {}  , // Get x,y by index. Populated during m_lcd module_init. 
			_byCoord    : []  , // Get index by x,y. Populated during m_lcd module_init. 
			_VRAM2      : []  , // (FLAT). Holds the tile ids for each tile of the screen.
			curFrame: 0,
			
			// Recreate VRAM and set all tiles to a default. 
			_clearVram: function(tile="tile4"){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];
				_MOD.canvas.draw._VRAM2 = Array(
					( ts.s._rows*ts.s._cols)*3 )
					.fill(_MOD.canvas.draw._tiles_ids[tile]
				);

				_MOD.canvas.lcdUpdateNeeded = true;
			},
			
			// Get the lookup table files if they exist. Create them otherwise.
			getLookupTables: function(){
				let fileExists_byIndex = fs.existsSync( "./byIndex.json" );
				let fileExists_byCoord = fs.existsSync( "./byCoord.json" );

				let byIndex;
				let byCoord;

				if(fileExists_byIndex && fileExists_byCoord){
					byIndex = JSON.parse( fs.readFileSync('./byIndex.json', {encoding:'utf8'}) );
					byCoord = JSON.parse( fs.readFileSync('./byCoord.json', {encoding:'utf8'}) );
					_APP.consolelog("  getLookupTables")
				}
				else{
					let lookups = _APP.m_lcd.canvas.draw.createLookupTables(true);
					byIndex = lookups.byIndex;
					byCoord = lookups.byCoord;
				}

				// Return the data.
				return {
					byIndex:byIndex,
					byCoord:byCoord,
				};
			},

			createLookupTables: function(save=true){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];
				let tilesInCol = 3;

				// Outputs.
				let byIndex = {};
				let byCoord = [];

				// Create the outputs. 
				for(let row=0;row<30;row+=1){
					byCoord.push([]);
					for(let col=0;col<30;col+=1){
						let index = ( row * ( ts.s._cols * tilesInCol ) ) + ( col * tilesInCol );
						// GOOD
						byIndex[index] = [col, row]; 
						
						// GOOD
						byCoord[row].push(index);
					}
				}

				if(save){
					// Save these lookup files to disk if they do not exist.
					let fileExists_byIndex = fs.existsSync( "./byIndex.json" );
					if(!fileExists_byIndex){
						_APP.consolelog("  createLookupTables: Saving... (./byIndex.json)")
						fs.writeFileSync("./byIndex.json", JSON.stringify(byIndex));
					}
					let fileExists_byCoord = fs.existsSync( "./byCoord.json" );
					if(!fileExists_byCoord){
						_APP.consolelog("  createLookupTables: Saving... (./byCoord.json)")
						fs.writeFileSync("./byCoord.json", JSON.stringify(byCoord));
					}
					// _APP.consolelog("  createLookupTables: DONE")
				}

				// Return the data.
				return {
					byIndex:byIndex,
					byCoord:byCoord,
				};
			},

			// Update one tile in _VRAM.
			_updateVramTile_flat: function(tileName, x, y){
				tileName = tileName.toString();

				// Get the lookups.
				// let _byIndex = _APP.m_lcd.canvas.draw._byIndex;
				let _byCoord = _APP.m_lcd.canvas.draw._byCoord;

				let index = _byCoord[y][x];
				
				// DEBUG
				// let coords = _byIndex[index] 
				// console.log(`tileName:${tileName}, x:${x}, y:${y}, index:${index}, coords:${coords}`);
				
				// Get the values of the tiles. 
				let tile2  = _MOD.canvas.draw._VRAM2[index+1];
				let tile3  = _MOD.canvas.draw._VRAM2[index+2];
				let tileId = _APP.m_lcd.canvas.draw._tiles_ids[tileName];

				// Don't update and shift if the same tile is being drawn again.
				if(tileId != tile3){
					// Set the tiles.
					_MOD.canvas.draw._VRAM2[index+0] = tile2;
					_MOD.canvas.draw._VRAM2[index+1] = tile3;
					_MOD.canvas.draw._VRAM2[index+2] = tileId;

					// Set the lcdUpdateNeeded flag.
					_MOD.canvas.lcdUpdateNeeded = true;
				}
				else{
					// console.log("WARN: Same tile drawn over same tile.", tileName, tileId, tile3, `x:$x}, y:${y}`);
				}
			},

			// DRAW ONE TILE TO THE CANVAS.
			setTile    : function(tileName, x, y){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];

				// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
				let oob_x = x >= ts.s._cols ? true : false;
				let oob_y = y >= ts.s._rows ? true : false;
				if(oob_x){ console.log("oob_x"); return; }
				if(oob_y){ console.log("oob_y"); return; }

				if(tileName.length == 1 && tileName.match(/[0-9\s]/g)){
					tileName = `n${tileName}`;
				}

				// Check for the tile. If not found then use 'nochar'.
				if(_MOD.canvas.draw._tiles_keys.indexOf(tileName) == -1){ 
					// console.log("setTile: Tile not found:", tileName); 
					tileName = 'nochar'; 
				};

				
				// "Draw" the tile to VRAM.
				_MOD.canvas.draw._updateVramTile_flat(tileName, x, y);
			},

			// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
			fillTile   : function(tileName, x, y, w, h){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];

				for(let dy=0; dy<h; dy+=1){
					for(let dx=0; dx<w; dx+=1){
						_MOD.canvas.draw.setTile(tileName, x+dx, y+dy);
					}
				}
			},

			// DRAW TEXT TO THE CANVAS. 
			print      : function(str, x, y){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];
	
				let chars = str.split("");
				let dx=0;
				for(let i=0; i<chars.length; i+=1){
					let tileName = chars[i].toString().toUpperCase();
					_MOD.canvas.draw.setTile(tileName, x+dx, y);
					dx+=1;
				}
			},

			// CLEAR THE CANVAS AND REDRAW THE DEFAULT BACKGROUND COLORS.
			clearScreen: function(tile="tile4"){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];
	
				// Clear the active region of the LCD.
				_MOD.canvas.draw.fillTile(tile, 0, 0, ts.s._cols, ts.s._rows); 
			},

			// Clear the drawing flags. 
			clearDrawingFlags: function(){
				_APP.m_lcd.canvas.updatingLCD=false;
				_APP.m_lcd.canvas.lcdUpdateNeeded = false;
			},

			// WEBSOCKET: Send framebuffer.
			updateWsClients: function(fb_data){
				_APP.timeIt("ws_buff_send", "s");
				_APP.m_lcd.canvas.draw.buff_abgr = fb_data;
				_APP.m_lcd.WebSocket.sendToAll(_APP.m_lcd.canvas.draw.buff_abgr);
				_APP.timeIt("ws_buff_send", "e");
				_APP.m_lcd.canvas.draw.clearDrawingFlags();
			},
		},

		//
		init: async function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let c = _APP.m_config.config.lcd;
				let ts = c.tilesets[c.activeTileset];

				// COMPLETE CLEAR OF THE SCREEN.
				_MOD.canvas.draw._clearVram("tile3");
				resolve(); return; 
			});
		},
	},

	// As WebSocket server.
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
					// ws.send(_MOD.canvas.buff_abgr); 
					ws.send(_MOD.canvas.draw.buff_abgr); 
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

				GET_VRAM:    async function(ws, event){
					// let json = JSON.parse(event.data);
					// let result = await _APP.m_gpio.toggle_pin(json.button); 
					// ws.send(JSON.stringify({ "mode":"TOGGLE_PIN", msg:result }));

					ws.send(JSON.stringify({ "mode":"GET_VRAM", msg:_APP.m_lcd.canvas.draw._VRAM2 }));
				},
			},
			TEXT: {
			},
		},

		el_message: function(ws, event){
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
			console.log("WS LCD: close:", ws.id ); 
			ws.close(); 
			setTimeout(function(){ws.terminate(); }, 1000);
		},
		el_error  : function(ws, event){ 
			console.log("WS LCD: error:", event); 
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

				console.log("WS LCD: open :", ws.id);
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
