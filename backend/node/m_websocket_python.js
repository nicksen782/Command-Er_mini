const fs = require('fs');
const path = require('path');
const os   = require('os');
const WSClient = require('ws').WebSocket;

const child_process = require('child_process'); 
// const { spawn } = require('child_process'); // Uses streams. - no shell
// const { exec } = require('child_process'); // Uses buffered output. - has shell

let _APP = null;

let _MOD = {
	moduleLoaded: false,
	
	serverFile:"",
	wshost:"",
	wsport:"",
	initString:"",
	cp_child:null,
	wsClient:null,
	pinged:false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				// Add routes.
				_APP.consolelog("addRoutes", 2);
				_MOD.addRoutes(_APP.app, _APP.express);
				
				// Update local config.
				_APP.consolelog("updateLocalConfig", 2);
				_MOD.serverFile = _APP.m_config.config.python.file;
				_MOD.wshost     = _APP.m_config.config.python.ws.host;
				_MOD.wsport     = _APP.m_config.config.python.ws.port;
				_MOD.initString = _APP.m_config.config.python.initString;

				if( _APP.m_config.config.toggles.isActive_pythonWsServer ){
					// Start the server process. After the initString is received a WebSockets connection will be created.
					_APP.consolelog("startServer", 2);
					_MOD.startServer();
					
					await new Promise(async function(res,rej){
						let maxAttempts = 10;
						for(let attempts=0; attempts<maxAttempts; attempts+=1){
							// Successful ping?
							if(_MOD.pinged){
								// _APP.consolelog("Server is ready", 4);
								res();
								return; 
							}
							//.Wait.
							else{
								if(attempts > 4){
									_APP.consolelog(`Server not ready. Attempts: ${attempts+1}/${maxAttempts}`, 4);
								}
								await new Promise(function(res2,rej2){ setTimeout(function(){ res2(); }, 1000); });
							}
						}
						console.log("ERROR: SERVER NOT READY");
						console.log("EXITING");
						process.exit(1);
					});
				}
				else{
					_APP.consolelog("DISABLED IN CONFIG", 2);
				}
				_MOD.moduleLoaded = true;
			}
			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	proc: {
		// *******
		el_stdout: function(data){ 
			let text = "";
			if(data && data !=null){ text = data.toString(); }
	
			// Check for the initString and if found start the WebSockets client.
			if(text.indexOf(_MOD.initString) != -1){
				_MOD.connectToServer();
			}

			// Display output.
			let lines = text.split("\n").map(l=>l.trim()).filter(l=>l);
			for(let i=0; i<lines.length; i+=1){
				_APP.consolelog(`PYTHON STDOUT: ${lines[i]}`, _MOD.moduleLoaded ? 0 : 4); 
			}
		},
		el_stderr: function(data){ 
			let text = "";
			if(data && data !=null){ text = data.toString(); }

			let lines = text.split("\n").map(l=>l.trim()).filter(l=>l);
			for(let i=0; i<lines.length; i+=1){
				_APP.consolelog(`PYTHON STDERR: ${lines[i]}`, _MOD.moduleLoaded ? 0 : 4); 
			}
		},
		el_close : function(data){ 
			let text = "";
			if(data && data !=null){ text = data.toString(); }
	
			let lines = text.split("\n").map(l=>l.trim()).filter(l=>l);
			for(let i=0; i<lines.length; i+=1){
				_APP.consolelog(`PYTHON CLOSE: ${lines[i]}`, _MOD.moduleLoaded ? 0 : 4); 
			}
		},
	},
	ws:{
		// STATUS CODES
		ws_statusCodes: {
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
		ws_readyStates: {
			"0":"CONNECTING",
			"1":"OPEN",
			"2":"CLOSING",
			"3":"CLOSED",
			"CONNECTING":0,
			"OPEN"      :1,
			"CLOSING"   :2,
			"CLOSED"    :3,
		},
		ws_event_handlers:{
			JSON  : {
				CONNECT: function(ws, data){
					// console.log(`mode: ${data.mode}, data: ${data.data}`);
				},
				PING: function(ws, data){
					// console.log(`mode: ${data.mode}, data: ${data.data}`);
					_MOD.pinged = true;
				},
				GET_BATTERY: function(ws, data){
					// console.log(`mode: ${data.mode}, data: ${data.data}`);
					_APP.screenLogic.shared.battery.lastBattery = data.data;
				},
			},
			TEXT  : {
			},
			BINARY: {
			},
		},
		ws_utilities: {
		},
		ws_events:{
			el_open:function(ws, event){
				// console.log("Node WebSockets Client: OPEN:", event.data || ""); 
				_MOD.wsClient.send("PING");
				_MOD.wsClient.send("GET_BATTERY");
			},
			el_message:function(ws, event){
				let data;
				let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };
	
				// Is event.data populated? (OPEN triggers message with no event data.)
				try{ if(event.data == null){ return; } }
				catch(e){ return; }
	
				// First, assume the data is JSON (verify this.)
				try{ data = JSON.parse(event.data); tests.isJson = true; }
				
				// Isn't JSON. What type is it?
				catch(e){ 
					// Get the data.
					data = event.data;
	
					// ARRAYBUFFER
					// if(data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }
	
					// BLOB
					// else if(data instanceof Blob){ tests.isBlob = true; }
					
					// TEXT
					// else{ tests.isText = true; }
					tests.isText = true;
				}
	
				if(tests.isJson){
					if(_MOD.ws.ws_event_handlers.JSON[data.mode]){ _MOD.ws.ws_event_handlers.JSON[data.mode](ws, data); return; }
					else{ console.log("JSON: Unknown handler for:", data.mode); return;  }
				}
	
				else if(tests.isText){
					if(_MOD.ws.ws_event_handlers.TEXT[data]){ _MOD.ws.ws_event_handlers.TEXT[data](ws, data); }
					else{ console.log("TEXT: Unknown handler for:", data); return; }
				}
	
				// else if(tests.isArrayBuffer){
				// 	console.log("tests: isArrayBuffer:", tests);
				// }
				
				// else if(tests.isBlob){
				// 	console.log("tests: isBlob:", tests);
				// }
	
				// Catch-all.
				else{
					console.log("WS DATA FROM PYTHON: UNKNOWN", data);
					return;
				}
			},
			el_close:function(ws, event){
				// console.log("Node WebSockets Client: CLOSE:", event); 
				ws.close(); 
				setTimeout(function(){
					ws=null; 
				}, 1000);
			},
			el_error:function(ws, event){
				console.log("Python WebSockets Client: ERROR:", event); 
				ws.close(); 
				setTimeout(function(){
					ws=null; 
				}, 1000);
			},
		},
	},

	startServer: async function(){
		// Remove the child process if it is set.
		if(_MOD.cp_child){ _MOD.cp_child.kill('SIGINT'); }
		
		// Remove the process if it already exists.
		let responses = await _APP.removeProcessByPort( [ _APP.m_config.config.python.ws.port ], true );
		for(let i=0; i<responses.length; i+=1){ _APP.consolelog(responses[i], 4); }

		// Start the server.
		_MOD.cp_child = child_process.spawn(
			// "python3", ["-u", _MOD.serverFile]
			"python3", [_MOD.serverFile]
		);

		// Add event handlers.
		_MOD.cp_child.stdout.on('data' , _MOD.proc.el_stdout);
		_MOD.cp_child.stderr.on('data' , _MOD.proc.el_stderr);
		_MOD.cp_child       .on('close', _MOD.proc.el_close);
	},
	connectToServer: async function(){
		let ws_url = `ws://${_MOD.wshost}:${_MOD.wsport}`;
		_MOD.wsClient = new WSClient(ws_url); 
		_MOD.wsClient.addEventListener('open'   , (event)=>{ _MOD.ws.ws_events.el_open   (_MOD.wsClient, event); });
		_MOD.wsClient.addEventListener('message', (event)=>{ _MOD.ws.ws_events.el_message(_MOD.wsClient, event); });
		_MOD.wsClient.addEventListener('close'  , (event)=>{ _MOD.ws.ws_events.el_close  (_MOD.wsClient, event); });
		_MOD.wsClient.addEventListener('error'  , (event)=>{ _MOD.ws.ws_events.el_error  (_MOD.wsClient, event); });
	},

	getBatteryUpdate: function(){
		if( _APP.m_config.config.toggles.isActive_battery ){
			// _APP.m_websocket_python.getBatteryUpdate()
			_MOD.wsClient.send("GET_BATTERY");
		}
		else{
			// _APP.consolelog("DISABLED IN CONFIG", 2);
		}
	},
};

module.exports = _MOD;
