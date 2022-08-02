var cp = require('child_process');
const fetch = require('node-fetch');
const WSClient = require('ws').WebSocket;

let _APP = null;

let _MOD = {
	// INTERVAL TIMER
	intervalId   : null,
	cp_child     : null,
	TYPE         : null,
	URL          : null,
	PORT         : null,
	wss          : null,
	wssConnecting : false,
	wssIsOpen     : false,
	wssPinged     : false,

	// INIT THIS MODULE.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Save some configs locally.
			// _MOD.URL  = _APP.m_config.config.server.host;
			_MOD.TYPE = _APP.m_config.config.python.serverType;
			_MOD.URL  = "http://127.0.0.1";

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);
			
			if(_MOD.TYPE == "http"){
				_MOD.PORT = _APP.m_config.config.python.http.port;
				
				// Remove the battery server if it is running. 
				await _MOD.http.stopServer();

				// Start the battery server.
				_MOD.http.startServer();
				
				// Wait until the battery server is online (max 10 seconds.)
				await _MOD.http.pingServer();
			}
			else if(_MOD.TYPE == "ws"){
				_MOD.PORT = _APP.m_config.config.python.ws.port;

				// Remove the battery server if it is running. 
				await _MOD.http.stopServer();

				// Start the battery server.
				await _MOD.ws.startServer();
			}
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
		_APP.m_lcd.canvas.fillTile(tile, x, y, str.length + 1, 1); 
		_APP.m_lcd.canvas.setTile(batIcon  , x, y); 
		if(Math.sign(json['A']) == 1){
			if(_MOD.chargeFlag){
				// _APP.m_lcd.canvas.setTile(tile  , x, y); 
				_APP.m_lcd.canvas.setTile("battcharge1"  , x, y); 
			}
			else{
				// _APP.m_lcd.canvas.setTile(tile  , x, y); 
				_APP.m_lcd.canvas.setTile("battcharge2"  , x, y); 
			}
			_MOD.chargeFlag = !_MOD.chargeFlag;
		}

		_APP.m_lcd.canvas.print(str, x+1, y);
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
			_MOD.cp_child = cp.exec(`python3 ${process.cwd()}/INA219_srv.py ${_MOD.TYPE} ${_MOD.PORT}`, { shell:"/bin/bash", cwd: `${process.cwd()}`, detatched: false }, function(){});
		},
		stopServer: async function(){
			let resp = cp.execSync( `yes yes| ~/.local/bin/freeport ${_MOD.PORT}`, [], { shell:"bash" } );
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
		
		x:0,
		y:0,
		tile:"tile1",

		ws: null,
		initWss   : function(app, express){

		},
		el_open   : function(ws){
			_MOD.wssIsOpen = true;
		},
		el_message: function(event){
			// Data is expected to be JSON.
			let json = JSON.parse(event.data);

			switch(json.mode){
				case "CONNECT"         : { 
					_MOD.wssPinged = true; 
					// console.log("WS MESSAGE:", json.mode, json.data);/
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
		},
		el_close  : function(event){
			if(_MOD.wssConnecting){ _MOD.wssIsOpen = false; _MOD.ws.removeHandlers(); return; }

			if (event.code == 3001) { console.log("WS CLOSE:", event.data); _MOD.ws.removeHandlers(); } 
			else { console.log("WS CLOSE/ERROR:", event.data); _MOD.ws.removeHandlers(); }
			_MOD.wssIsOpen = false;
		},
		el_error  : function(ws){
			if(_MOD.wssConnecting){ _MOD.wssIsOpen = false; _MOD.ws.removeHandlers(); return; }
			_MOD.wssIsOpen = true;
		},
		
		startServer : async function(){
			return new Promise(async function(resolve,reject){
				// Start the battery server. 
				_MOD.cp_child = cp.exec(`python3 ${process.cwd()}/INA219_srv.py ${_MOD.TYPE} ${_MOD.PORT}`, { shell:"/bin/bash", cwd: `${process.cwd()}`, detatched: false }, function(){});

				// Wait until the battery server is online (max 5 seconds.)
				let attempts=0;
				let ws_url = `ws://127.0.0.1:${_MOD.PORT}`;
				_MOD.wssConnecting = true;
				await new Promise((res, rej) => {
					let tryToConnect = function(){
						// console.log("tryToConnect");
						_MOD.ws.removeHandlers();
						_MOD.wss = new WSClient(ws_url); 
						_MOD.ws.addHandlers();
					};
					let tryToPing = function(){
						// console.log("tryToPing");
						_MOD.wss.send("ping");
					};
					let timed = async function(){
						// Max attempts?
						if(attempts >= 20){ console.log("FAILURE-"); res();  _MOD.ws.removeHandlers(); return; }

						// Done?
						if(_MOD.wssIsOpen && _MOD.wssPinged){
							// console.log(`Battery Server: READY. Tries: ${attempts}.`);
							res();
							_MOD.wssConnecting = false;
							return;
						}

						else{
							// Try to connect.
							if(!_MOD.wssIsOpen){ tryToConnect(); }

							// Connected. Try to ping. 
							if(_MOD.wssIsOpen && !_MOD.wssPinged){ tryToPing(); }

							// Increment attempts.
							attempts+=1;

							// console.log(`Battery Server: NOT READY. Tries: ${attempts}.`);
							
							// Wait.
							await new Promise(function(res2,rej2){ setTimeout(function(){ res2(); }, 250); });

							// Run the function again.
							timed();
						}
					};
					timed();
				});
				resolve();
			});
		},
		stopServer  : function(){ 
			let resp = cp.execSync( `yes yes| ~/.local/bin/freeport ${_MOD.PORT}`, [], { shell:"bash" } );
			_MOD.wss.close(); 
		},

		func: function(x=17, y=28, tile="tile1"){
		},
	},
};

module.exports = _MOD;