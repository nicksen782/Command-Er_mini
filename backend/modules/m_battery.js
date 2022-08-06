var cp = require('child_process');
const fetch = require('node-fetch');
const WSClient = require('ws').WebSocket;
const {Blob} = require('buffer');

let _APP = null;

let _MOD = {
	// INTERVAL TIMER
	intervalId   : null,
	cp_child     : null,
	TYPE         : null,
	URL          : null,
	PORT         : null,
	// serverFile   : "INA219_srv.py",
	serverFile   : "INA219_TEST.py",
	wss          : null,
	wssConnecting : false,
	wssIsOpen     : false,
	wssPinged     : false,
	getTileIdsInit: false,
	getTileIds    : false,

	// INIT THIS MODULE.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Save some configs locally.
			_MOD.TYPE = _APP.m_config.config.python.serverType;
			
			if(_MOD.TYPE == "http"){
				_MOD.URL  = "http://127.0.0.1";
				_MOD.PORT = _APP.m_config.config.python.http.port;
				
				// Start the battery server.
				_APP.consolelog("  startServer (http)"); 
				_MOD.http.startServer();
				
				// Wait until the battery server is online (max 10 seconds.)
				_APP.consolelog("  pingServer (http)"); 
				await _MOD.http.pingServer();
			}
			else if(_MOD.TYPE == "ws"){
				_MOD.PORT = _APP.m_config.config.python.ws.port;

				// Start the battery server.
				_APP.consolelog("  startServer (ws)"); 
				await _MOD.ws.startServer();
			}

			// Add routes.
			_APP.consolelog("  addRoutes"); 
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// ADDS ROUTES FOR THIS MODULE.
	addRoutes: function(app, express){
	},

	// UPDATE THE DISPLAY WITH THE BATTERY PERCENTAGE.
	prevBattStr : "",
	chargeFlag: false,
	func: function(x=17, y=28, tile="tile1"){
		return new Promise(async function(resolve,reject){
			// Run the correct function for the client that is in use.
			if    (_MOD.TYPE == "http"){ _MOD.http.func(x, y, tile); }
			else if(_MOD.TYPE == "ws" ){ 
				_MOD.ws.x    = x;
				_MOD.ws.y    = y;
				_MOD.ws.tile = tile;
				_MOD.wss.send("getBatteryData");
			}
			resolve();
		});
	},
	
	drawBattery: function(x=17, y=28, tile="tile1", json){
		// console.log(json);
		// json['%'] = 25.0;
		// json['%'] = 50.0;
		// json['%'] = 75.0;
		// json['%'] = 100.0;

		// CREATE THE STRING. 
		let str = (json['%'].toFixed(1)+"%").padStart(7, " ");
		if(str == _MOD.prevBattStr && 0){ 
			console.log("SAME BATT", _MOD.prevBattStr); 
			resolve(); return; 
		}
		_MOD.prevBattStr = str; 

		// DETERMINE WHICH BATTERY ICON TO DISPLAY.
		let batIcon;
		if     (json['%'] <=25){ batIcon = "batt1"; } // RED
		else if(json['%'] <=50){ batIcon = "batt2"; } // ORANGE
		else if(json['%'] <=80){ batIcon = "batt3"; } // YELLOW
		else { batIcon = "batt4"; } // GREEN
		
		// CLEAR THE LINE AND THEN DISPLAY THE ICON AND THE STRING. 
		_APP.m_lcd.canvas.draw.fillTile(tile, x, y, str.length + 1, 1); 
		_APP.m_lcd.canvas.draw.setTile(batIcon  , x, y); 
		if(Math.sign(json['A']) == 1){
			if(_MOD.chargeFlag){
				// _APP.m_lcd.canvas.draw.setTile(tile  , x, y); 
				_APP.m_lcd.canvas.draw.setTile("battcharge1"  , x, y); 
			}
			else{
				// _APP.m_lcd.canvas.draw.setTile(tile  , x, y); 
				_APP.m_lcd.canvas.draw.setTile("battcharge2"  , x, y); 
			}
			_MOD.chargeFlag = !_MOD.chargeFlag;
		}

		_APP.m_lcd.canvas.draw.print(str, x+1, y);
	},

	// As HTTP client.
	http: {
		func: function(x=17, y=28, tile="tile1"){
			return new Promise(async function(resolve,reject){
				// Save the value for the current screen.
				let currentScreen = _APP.currentScreen;
				
				// Fetch the data.
				let json;
				try{ json = await fetch(`${_MOD.URL}:${_MOD.PORT}/getBatteryData`); }
				catch(e){ console.log("ERROR: Battery Server:", e.code); resolve(); return; }
				json = await json.json(); 
	
				// Make sure that we are still on the same screen before continuing. 
				if(_APP.currentScreen != currentScreen){ resolve(); return; }
	
				_MOD.drawBattery(x,y,tile,json);

				resolve();
			});
		},
		startServer: async function(){
			_MOD.cp_child = cp.exec(`python3 ${process.cwd()}/${_MOD.serverFile} ${_MOD.TYPE} ${_MOD.PORT}`, { shell:"/bin/bash", cwd: `${process.cwd()}`, detatched: false }, function(){});
		},
		pingServer: async function(){
			// Ping up to 10 times with 1000ms between pings. (10 seconds max.)
			for(let i=0; i<10; i+=1){
				let resp;
				try{ resp = await fetch(`${_MOD.URL}:${_MOD.PORT}/ping`); }
				catch(e){ 
					// console.log(`Tries: ${i}. Battery Server: OFFLINE:`, e.code, resp);
					await new Promise(function(res,rej){ setTimeout(function(){ res(); }, 1000); });
					continue;
				}
	
				resp = await resp.text(); 
				if(resp=="PONG"){ 
					// console.log(`Tries: ${i}. Battery Server: ONLINE:`, resp);
					return true;
					break; 
				}
			}
			return false;
		},
	},
	
	// As WebSocket client.
	ws: {
		addHandlers   : function(){
			if(_MOD.wss){
				_MOD.wss.addEventListener('open'   , _MOD.ws.el_open);
				_MOD.wss.addEventListener('message', _MOD.ws.el_message);
				_MOD.wss.addEventListener('close'  , _MOD.ws.el_close);
				_MOD.wss.addEventListener('error'  , _MOD.ws.el_error);
			}
		},
		removeHandlers: function(){
			if(_MOD.wss){
				_MOD.wss.removeEventListener('open'   , _MOD.ws.el_open);
				_MOD.wss.removeEventListener('message', _MOD.ws.el_message);
				_MOD.wss.removeEventListener('close'  , _MOD.ws.el_close);
				_MOD.wss.removeEventListener('error'  , _MOD.ws.el_error);
			}
		},
		
		// x:0,
		// y:0,
		// tile:"tile1",

		ws: null,
		initWss   : function(app, express){

		},
		el_open   : function(ws){
			_MOD.wssIsOpen = true;
		},
		el_message: async function(event){
			// Data is expected to be JSON.
			let json;
			try{ 
				json = JSON.parse(event.data); 
				switch(json.mode){
					case "CONNECT"         : { 
						// console.log("WS MESSAGE:", json.mode, json.data);
						break; 
					}
					case "ping"            : { 
						_MOD.wssPinged = true; 
						// console.log("WS MESSAGE:", json.mode, json.data);
						break; 
					}
					case "getBatteryData"         : { 
						// console.log("WS MESSAGE:", json.mode, json.data);
						_MOD.drawBattery(_MOD.ws.x, _MOD.ws.y, _MOD.ws.tile, json.data);
						break; 
					}
					case "getTileIds"         : { 
						// console.log("WS MESSAGE:", json.mode, json.data);
						_APP.m_lcd.canvas.draw._tiles_ids = json.data;
						_APP.m_lcd.canvas.draw._tiles_keys = Object.keys(json.data);
						_MOD.getTileIds=true;
						// console.log("tiles_ids:", json.data);
						break; 
					}
					// case "updateVram"       : { 
					// 	console.log("WS MESSAGE:", json.mode, json.data);
					// 	// _APP.m_lcd.canvas.updatingLCD=true;
					// 	// await _APP.m_lcd.canvas.updateFrameBuffer(json.data);
					// 	await _APP.m_lcd.canvas.updateFrameBuffer(null);
					// 	_APP.timeIt("WS_DISPLAYUPDATE", "e");
					// 	break; 
					// }
					
					case ""                : { 
						console.log("WS MESSAGE:", json.mode, json.data);
						break; 
					}
					case "UNKNOWN_REQUEST" : { 
						console.log("WS MESSAGE:", json.mode, json.data);
						break; 
					}
					default : { break; }
				};
			}
			catch(e){
				let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };
				// console.log(" I shouldn't be here.");
				// Get the data.
				data = event.data;

				// ARRAYBUFFER
				if(data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }

				// BLOB
				if(data instanceof Blob){ tests.isBlob = true; }
				
				// TEXT
				if(1){ tests.isText = true; 
				}

				// console.log("TEXT? BINARY?", event);
				// console.log("TEXT? BINARY?", event.data);
				// console.log("TEXT? BINARY?", event.data.length, event.data.toString());
				// console.log("TEXT? BINARY?", event.data.length, tests);

				if(_APP.m_config.config.ws.active && _APP.m_lcd.WebSocket.getClientCount()){
					// _APP.m_lcd.canvas.draw.updateWsClients(event.data);
					// _APP.m_lcd.WebSocket.sendToAll(JSON.stringify({ "mode":"GET_VRAM", msg:_APP.m_lcd.canvas.draw._VRAM }));
					// _APP.m_lcd.WebSocket.sendToAll(JSON.stringify({ "mode":"GET_VRAM", msg:_APP.m_lcd.canvas.draw._VRAM2 }));
					_APP.m_lcd.WebSocket.sendToAll(JSON.stringify({
						"mode":"GET_VRAM", msg:_APP.m_lcd.canvas.draw._VRAM2, curFrame: _APP.m_lcd.canvas.draw.curFrame
					}));
					_APP.m_lcd.canvas.draw.curFrame += 1;
				}
				else{
					_APP.m_lcd.canvas.draw.clearDrawingFlags();
				}
				_APP.wait = false;
				// _APP.timeIt("WS_DISPLAYUPDATE", "e");
			}

		},
		el_close  : function(event){
			if(_MOD.wssConnecting){ _MOD.wssIsOpen = false; _MOD.ws.removeHandlers(); return; }

			if (event.code == 3001) { console.log("WS CLOSE:", event.data); _MOD.ws.removeHandlers(); } 
			else { console.log("WS CLOSE/ERROR:", event.data); _MOD.ws.removeHandlers(); }
			_MOD.wssIsOpen = false;
			// process.exit();
		},
		el_error  : function(ws){
			if(_MOD.wssConnecting){ _MOD.wssIsOpen = false; _MOD.ws.removeHandlers(); return; }
			_MOD.wssIsOpen = true;
		},
		
		startServer : async function(){
			return new Promise(async function(resolve,reject){
				// Start the battery server. 
				// _MOD.cp_child = cp.exec(`python3 ${process.cwd()}/${_MOD.serverFile} ${_MOD.TYPE} ${_MOD.PORT}`, { shell:"/bin/bash", cwd: `${process.cwd()}`, detatched: false }, function(){});

				// Wait until the battery server is online (Timeout if this repeatedly fails.)
				let attempts=0;
				let ws_url = `ws://127.0.0.1:${_MOD.PORT}`;
				_MOD.wssConnecting = true;
				await new Promise((res, rej) => {
					let timings = {
						"CONNECTING": { total:0, tries:0, lastTry:0 },
						"PINGING"   : { total:0, tries:0, lastTry:0 },
						"TILESINIT" : { total:0, tries:0, lastTry:0 },
					};
					let timingsUpdater = function(key, display=false){
						if(timings[key].tries == 0){ timings[key].lastTry = performance.now(); }
						timings[key].total += (performance.now() - timings[key].lastTry);
						timings[key].lastTry = performance.now();
						timings[key].tries += 1;
						if(display){
							_APP.consolelog( `  ` +
								`${key.padEnd(10, " ")} `+
								`(Tries: ${timings[key].tries.toString().padStart(2, " ")}, ` +
								`Time: ${(timings[key].total).toFixed(3).padStart(9, " ")} ms)`
							);
						}
					};
					let timingsEnd = function(){
						// console.log(`Battery Server:`, attempts);
						let lines = [];
						lines.push(`      Battery Server: timings:`);
						let total = 0;
						for(key in timings){
							total += timings[key].total;
							lines.push(
								`  ` +
								`    ${key.padEnd(10, " ")} `+
								`    (Tries: ${timings[key].tries.toString().padStart(2, " ")}, ` +
								`    Time: ${(timings[key].total).toFixed(3).padStart(9, " ")} ms)`
							);
						}
						lines.push(
							``+
							`      ${"-".repeat(20)}\n` +
							`      TOTAL: ${total.toFixed(3)} ms`
						);
						_APP.consolelog("\n" + lines.join("\n"));
					}
					let stage_open_flag          = 0;
					let stage_ping_flag          = 0;
					let stage_tilesInit_flag     = 0;
					let timed = async function(connected=false){
						let open          = _MOD.wssIsOpen      ? true : false;
						let ping          = _MOD.wssPinged      ? true : false;
						let tilesInit     = _MOD.getTileIdsInit ? true : false;
						let tilesInitDone = _MOD.getTileIds     ? true : false;
						let delayTime = 250;

						// CONNECT
						if(!open){
							if(!stage_open_flag){
								_APP.consolelog("    CONNECTING");
								stage_open_flag = 1;
							}

							if(timings["CONNECTING"].tries > 1){
								timingsUpdater("CONNECTING", true);
							}
							else{
								timingsUpdater("CONNECTING", false);
							}
							
							// Allow the initial attempt's delay to be longer.
							if(timings["CONNECTING"].tries == 1){ delayTime = 3500; }
							else{ delayTime = 250; }

							_MOD.ws.removeHandlers();
							_MOD.wss = new WSClient(ws_url); 
							_MOD.ws.addHandlers();
						}

						// PING
						else if(open && !ping){
							// timingsUpdater("PINGING", true);
							timingsUpdater("PINGING", false);

							if(!stage_ping_flag){
								_APP.consolelog("    PINGING");
								stage_ping_flag = 1;
							}

							delayTime = 1;
							_MOD.wss.send("ping");
						}

						// TILES INIT
						else if(open && ping && !tilesInit){
							// timingsUpdater("TILESINIT", true);
							timingsUpdater("TILESINIT", false);

							if(!stage_tilesInit_flag){
								_APP.consolelog("    TILESINIT");
								stage_tilesInit_flag = 1;
							}

							delayTime = 1;
							_MOD.getTileIdsInit = true;
							_MOD.wss.send("getTileIds");
						}

						// TILES INIT DONE -- full ready.
						else if(open && ping && tilesInit && tilesInitDone){
							timingsEnd();
							res();
							_MOD.wssConnecting = false;
							return;
						}

						// NOT READY

						// Increment attempts.
						attempts+=1;

						// Wait.
						await new Promise(function(res2,rej2){ setTimeout(function(){ res2(); }, delayTime); });

						// Run the function again.
						timed(); return;

						// Max attempts?
						if(attempts >= 20){ console.log("** FAILURE TO START PYTHON WS SERVER **"); res();  _MOD.ws.removeHandlers(); return; }
					};

					timed();
				});
				resolve();
			});
		},
	},
};

module.exports = _MOD;