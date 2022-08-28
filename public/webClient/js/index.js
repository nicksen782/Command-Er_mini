// HTTP REQUESTS USING POST.
let http = {
	// Can use either "GET" or "POST" and type of either "json" or "text".
	send: async function(url, body=null, type="json", method="POST"){
		// await http.send("http://192.168.2.66:7777/ping.txt", null, "text", "GET");

		return new Promise(async function(resolve,reject){
			method = method.toUpperCase();
			let options = {
				method: method, 
				headers: {},
			};

			// Set body?
			switch(method){
				case "GET": { break; }
				case "POST": { options.body = JSON.stringify(body); break; }
				default : { throw "ERROR: INVALID METHOD: " + method; resolve(false); break; }
			}

			// Set headers.
			switch(type){
				case "json": { 
					options.headers = { 
						'Accept': 'application/json', 
						'Content-Type': 'application/json' 
					};
					break; 
				}
				case "text": { 
					options.headers = { 
						'Accept': 'text/plain', 
						'Content-Type': 'text/plain' 
					};
					break;
				}
				default : { throw "ERROR: INVALID TYPE: " + type; resolve(false); break; }
			};

			// Make the request.
			let resp;
			try{
				resp = await fetch(url, options).catch(e=>{ throw e; });
				if     (type=="json"){ resp = await resp.json(); }
				else if(type=="text"){ resp = await resp.text(); }
				
				// console.log(resp);
				resolve(resp);
			}
			catch(e){
				// console.log(`http.get ERROR: ${url}, ${type}:`, e);
				resolve(false);
			}
		});
	},

	// Can use "POST" and type of "json" .
	post: async function(url, body, type="json"){
		let options = {
			method: 'POST', 
			headers: {},
			body: JSON.stringify(body)
		};

		switch(type){
			case "json": { 
				options.headers = { 
					'Accept': 'application/json', 
					'Content-Type': 'application/json' 
				};
				break; 
			}
			default : { throw "ERROR: INVALID TYPE:"+type; break; }
		};

		// let resp = await fetch(url, {});
		let resp;
		try{
			resp = await fetch(url, options).catch(e=>{ throw e; });
			if     (type=="json"){ resp = await resp.json(); }
			
			// console.log(resp);
			return resp;
		}
		catch(e){
			// console.log(`http.post ERROR: ${url}, ${type}:`, e);
			return false;
		}

	},
	pingServer: async function(){
		return new Promise(async function(resolve,reject){
			// console.log( await http.pingServer() );
			
			// Store the previous connection icon.
			let prevHTML = buttons.DOM["ws_status"].innerHTML;

			// Set the blue icon.
			buttons.DOM["ws_status"].innerHTML = "&#128998;";

			let serverUrl = `` +
				`${window.location.protocol == "https:" ? "https" : "http"}://` +
				`${location.hostname}` + 
				`${location.port ? ':'+location.port : ''}`
			;
			// let resp = await http.send("http://192.168.2.67:7777/ping.txt", null, "text", "GET");
			let resp = await http.send(serverUrl, null, "text", "GET");
			resp = resp === false ? false : true;

			// Reset to the previous connection icon.
			buttons.DOM["ws_status"].innerHTML = prevHTML;

			// End.
			resolve(resp);
		});
	},
};
// WEBSOCKET
let websocket = {
	connecting:false,
	activeUuid:null,
	activeWs:null,
	wsArr:[],

	autoReconnect             : true,
	autoReconnect_counter     : 0,
	autoReconnect_counter_max : 30,
	autoReconnect_id          : false,
	autoReconnect_ms          : 2000,

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
	// HANDLERS TO SPECIFIC TYPES OF EVENTS.
	ws_event_handlers:{
		JSON  : {
			// OPENING A NEW CONNECTION.
			NEWCONNECTION: function(data){
				// console.log(`mode: ${data.mode}, data:`, data.data);
				websocket.activeUuid = data.data;
			},
			WELCOMEMESSAGE: function(data){
				// console.log(`mode: ${data.mode}, data:`, data.data);
			},

			SUBSCRIBE: function(data){
				// console.log(`mode: ${data.mode}, data:`, data.data);
				buttons.updateSubscriptionList(data.data);
			},
			UNSUBSCRIBE: function(data){
				// console.log(`mode: ${data.mode}, data:`, data.data);
				buttons.updateSubscriptionList(data.data);
			},

			TOGGLE_BACKLIGHT: function(data){
				console.log(`mode: ${data.mode}, data:`, data.data);
			},

			// VRAM UPDATES
			STATS0: function(data){
				console.log(data.data);
			},
			STATS1: function(data){
				{
					let tables = document.querySelectorAll("#controls_cont_view_vram .updateStats");
					let numTables = tables.length;
					
					let layers = Object.keys(data.data);
					let keys = Object.keys(data.data[0]);
					
					// For each table and layer in data.data:
					// console.log(tables, numTables, layers, keys);
					tables.forEach(function(d,i){
						// Find the table.
						let thisTable = d.querySelector("table") || false;

						// Create the table and data row if it is missing.
						if(!thisTable){
							// console.log(d, thisTable);
							// console.log("Missing table. Creating.", d, thisTable);
							let table = document.createElement("table");

							// Add the headers row.
							let tr = table.insertRow(-1);
							for(let k=0; k<keys.length; k+=1){
								let key = keys[k];
								// tr.insertCell(-1).outerHTML = `<th title="${key}">${key.substring(0,1).toUpperCase()}:${i}</th>`;
								tr.insertCell(-1).outerHTML = `<th layer="${i}" title="${key}">${key.toUpperCase()}</th>`;
							}

							// Add the data row.
							tr = table.insertRow(-1);
							for(let k=0; k<keys.length; k+=1){
								let key = keys[k];
								let td = tr.insertCell(-1);
								td.setAttribute("name", "updates_" + key);
								td.setAttribute("layer", i);
							}

							//
							d.append(table);

							// Save the table to local var. 
							thisTable = table;
						}
						
						// Update the data row.
						for(let r=1; r<thisTable.rows.length; r+=1){
							let row = thisTable.rows[r];
							for(let k=0; k<keys.length; k+=1){
								let key = keys[k];
								
								let td = row.querySelector(`[name='updates_${key}']`);
								let layer_i = td.getAttribute("layer");
								
								let rec = data.data[layer_i];
								let oldValue = td.innerText;
								let newValue = rec[key].toString();
								
								// Don't update if the new value is the same as the old value.
								if(oldValue != newValue){
									td.innerText = newValue;
								}
							}
						}
						
					});
				}
			},
			STATS2: function(data){
				if(draw.serverFps != data.data){
					draw.serverFps = data.data;
					draw.DOM.info_serverFps.innerText = data.data;

					// Reinit fps.
					draw.fps.init(data.data);
				}
			},
			STATS3: function(data){
				draw.display_stats3(data.data);
			},
			STATS4: function(data){
				draw.display_stats4(data.data);
			},
		},
		TEXT  : {
		},
		BINARY: {
		},
	},
	// UTILITIES
	ws_utilities: {
		// Start the WebSocket connection.
		initWss: async function(){
			return new Promise(async function(resolve,reject){
				if(websocket.connecting){ console.log("WS connection attempt already in progress."); resolve(false); return; }

				// GENERATE THE WEBSOCKET URL.
				let locUrl = `` +
					`${window.location.protocol == "https:" ? "wss" : "ws"}://` +
					`${location.hostname}` + 
					`${location.port ? ':'+location.port : ''}` +
					`${location.pathname != "/" ? ''+location.pathname : '/'}` +
					`LCD`
				;

				// Make sure that the server is up.
				
				let isServerUp = await http.pingServer() ;
				if(isServerUp === false) {
					// console.log("Server is unavailable");
					resolve(false);
					return; 
				};

				// Set the connection indicator.
				buttons.DOM["ws_status"].innerHTML = "&#128997;";

				// Close any existing connections. 
				websocket.ws_utilities.wsCloseAll();

				// Create new WebSocket connection. 
				websocket.connecting = true;
				let ws = new WebSocket(locUrl);
				ws.onopen   = websocket.ws_events.el_open   ;
				ws.onmessage= websocket.ws_events.el_message;
				ws.onclose  = websocket.ws_events.el_close  ;
				ws.onerror  = websocket.ws_events.el_error  ;
				// ws.addEventListener('open'   , (event)=> websocket.ws_events.el_open   (ws, event) );
				// ws.addEventListener('message', (event)=> websocket.ws_events.el_message(ws, event) );
				// ws.addEventListener('close'  , (event)=> websocket.ws_events.el_close  (ws, event) );
				// ws.addEventListener('error'  , (event)=> websocket.ws_events.el_error  (ws, event) );
				ws.binaryType = 'arraybuffer';
				websocket.activeWs = ws;

				// Add new to array of ws.
				websocket.wsArr.push(ws);

				resolve(true);
				return; 
			});
		},
		// Close all WebSocket connections. 
		wsCloseAll: function(){
			// Close existing. 
			if(websocket.activeWs){
				websocket.activeWs.close();
			}

			// Close/reclose previous ws connections. 
			for(let i=0; i<websocket.wsArr.length; i+=1){
				if(websocket.wsArr[i]){
					websocket.wsArr[i].close();
				}
			}
		},
		
		// Timeout function for automatically reconnecting after a connection loss.
		autoReconnect_func: async function(){
			// Is autoReconnect disabled?
			if(!websocket.autoReconnect){
				websocket.autoReconnect_counter = 0;
				clearTimeout(websocket.autoReconnect_id);
				return; 
			}

			// Have we reached the max number of attempts? 
			if(websocket.autoReconnect_counter > websocket.autoReconnect_counter_max){
				console.log(`  Reconntion has failed. Max number of attempts (${websocket.autoReconnect_counter_max}) was reached. ((${(( (websocket.autoReconnect_counter-1)*websocket.autoReconnect_ms)/1000).toFixed(1)})) seconds`);
				websocket.autoReconnect_counter = 0;
				clearTimeout(websocket.autoReconnect_id);
			}

			// No. Try to connect.
			else{
				// Increment the counter by 1.
				websocket.autoReconnect_counter += 1;

				console.log(`  Reconnection attempt ${websocket.autoReconnect_counter} of ${websocket.autoReconnect_counter_max}`);
				let resp = await websocket.ws_utilities.initWss();

				// Did the connection fail?
				if(resp === false){
					// If this was the last attempt then set the timeout delay to a smaller number.
					if(websocket.autoReconnect_counter >= websocket.autoReconnect_counter_max){
						websocket.autoReconnect_id = setTimeout(websocket.ws_utilities.autoReconnect_func, 100);
					}
					// Set the next attempt timeout.
					else{
						websocket.autoReconnect_id = setTimeout(websocket.ws_utilities.autoReconnect_func, websocket.autoReconnect_ms);
					}
				}
				// The connection was successful.
				else{
					console.log(`  Reconnection successful (${((websocket.autoReconnect_counter*websocket.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
					websocket.autoReconnect_counter = 0;
					clearTimeout(websocket.autoReconnect_id);
				}
			}

		},
	},
	// EVENT HANDLERS.
	ws_events:{
		el_open:function(event){
			// console.log("Web WebSockets Client: OPEN:", event); 

			// Green icon.
			buttons.DOM["ws_status"].innerHTML = "&#129001;";

			// draw.fps.updateDisplay();

			// Remove disconnected, add connected.
			let wsElems = document.querySelectorAll(".ws");
			wsElems.forEach(function(d){ d.classList.add("connected"); d.classList.remove("disconnected"); });

			// Init fps.
			draw.fps.init(1);

			// Request GET_VRAM.
			draw.getVram("ws");

			if(websocket.autoReconnect){
				autoReconnect_counter = 0;
				clearTimeout(websocket.autoReconnect_id);
			}
			websocket.connecting = false;
		},
		el_message:function(event){
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
				if(data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }

				// BLOB
				else if(data instanceof Blob){ tests.isBlob = true; }
				
				// TEXT
				else{ tests.isText = true; }
			}

			if(tests.isJson){
				if(websocket.ws_event_handlers.JSON[data.mode]){ websocket.ws_event_handlers.JSON[data.mode](data); return; }
				else{ console.log("JSON: Unknown handler for:", data.mode, event); return;  }
			}

			else if(tests.isText){
				if(websocket.ws_event_handlers.TEXT[data]){ websocket.ws_event_handlers.TEXT[data](data); }
				else{ console.log("TEXT: Unknown handler for:", data, event); return; }
			}
			
			// Expects VRAM in event.data.
			else if(tests.isArrayBuffer){
				// Apply view to the ArrayBuffer.
				data = new Uint8Array(data);
				
				// Strip off the last 4 bytes and convert to string.
				let type = data.slice(-6).reduce((p,c) => p + String.fromCharCode(c), "");
				
				// Separate out the actual data.
				let newData = data.slice(0, -6);
				
				// Run the correct drawing function based on the value of part.
				switch(type){
					// Draw the new VRAM.
					case "FULL__": { 
						if(!draw.isDrawing){ draw.drawVram_FULL(newData); } 
						else{ console.log("ALREADY IN A DRAW"); }
						break; 
					}
					// Draw the new VRAM.
					case "PART__": { 
						if(!draw.isDrawing){ draw.drawVram_CHANGES(newData); } 
						else{ console.log("ALREADY IN A DRAW"); }
						break; 
					}
					// Draw the stats.
					case "STATS3": { 
						newData = JSON.parse( String.fromCharCode.apply(null, newData) );
						draw.display_stats3(newData);
						break; 
					}
					default    : { console.log("Unknown type:", type, newData); break; }
				};
			}
			
			// else if(tests.isBlob){
			// 	console.log("tests: isBlob:", tests);
			// }

			// Catch-all.
			else{
				console.log("Unknown data for event.data.", event.data, event);
				return;
			}
		},
		el_close:function(event){
			// console.log("Web WebSockets Client: CLOSE:", event); 

			// Yellow icon.
			buttons.DOM["ws_status"].innerHTML = "&#129000;";

			websocket.activeUuid = null;
			event.currentTarget.close(); 

			// Remove connected, add disconnected.
			let wsElems = document.querySelectorAll(".ws");
			wsElems.forEach(function(d){ d.classList.add("disconnected"); d.classList.remove("connected"); });

			setTimeout(function(){
				// Gray icon.
				buttons.DOM["ws_status"].innerHTML = "&#11035;";
				websocket.activeWs=null; 
				websocket.connecting = false;

				if(websocket.autoReconnect){
					websocket.autoReconnect_counter = 0;
					console.log(`'autoReconnect' is active. Will try to reconnect ${websocket.autoReconnect_counter_max} times at ${websocket.autoReconnect_ms} ms intervals. (${((websocket.autoReconnect_counter_max*websocket.autoReconnect_ms)/1000).toFixed(1)} seconds)`);
					websocket.autoReconnect_id = setTimeout(websocket.ws_utilities.autoReconnect_func, websocket.autoReconnect_ms);
				}

			}, 1000);
			// draw.fps.updateDisplay();
		},
		// Connection closed unexpectedly. 
		el_error:function(ws, event){
			console.log("Web WebSockets Client: ERROR:", event); 
			
			// If not CLOSING or CLOSED.
			if(ws.readyState != 2 || ws.readyState != 3){
				// Red icon.
				buttons.DOM["ws_status"].innerHTML = "&#128997;";
			}
			// Close on error if not already closing or closed.
			else{
				ws.close();
			}

			// draw.fps.updateDisplay();
		},
	},
};
// VRAM DRAWING
let draw = {
	DOM: {},
	configs: {
		// config            {}, //
		// coordsByIndex     {}, // UNUSED
		// indexByCoords     {}, // (drawVram_CHANGES)
		// tileCoords        {}, // (getGraphics)
		// tileIdsByTilename {}, // UNUSED
		// tilenamesByIndex  {}, // UNUSED
		// subscriptionKeys  {}, // (populateSubscriptionKeys)
	},
	tilesetCanvas:null,
	tilesCache:[],
	canvases : {
		vram_l0 :null,
		vram_l1 :null,
		vram_l2 :null,
		vram_all:null,
	},
	_VRAM:[],
	_VRAM_prev:[],
	isDrawing:false,
	lastDraw: performance.now(),
	draws:0,
	showIndividualLayers: true,
	serverFps:1,

	//
	dispChk_numbers : false,
	dispChk_grid    : false,
	dispChk_display : true,

	// showVramLayers: function(){
	// 	draw.DOM.vram_div_layers.classList.remove("hide");
	// },
	// hideVramLayers: function(){
	// 	draw.DOM.vram_div_layers.classList.add("hide");
	// },
	initCanvases: async function(){
		// 
		draw.canvases.vram_l0  = document.getElementById("vram_l0").getContext("2d");
		draw.canvases.vram_l1  = document.getElementById("vram_l1").getContext("2d");
		draw.canvases.vram_l2  = document.getElementById("vram_l2").getContext("2d");
		draw.canvases.vram_all = document.getElementById("vram_all").getContext("2d");

		for(let key in draw.canvases){
			draw.canvases[key].canvas.width = draw.configs.config.lcd.width;
			draw.canvases[key].canvas.height = draw.configs.config.lcd.height;
			draw.setPixelated(draw.canvases[key]);
		}
		draw.clearAllCanvases();
	},

	clearAllCanvases: function(){
		for(let key in draw.canvases){
			draw.canvases[key].clearRect(0,0, draw.canvases[key].canvas.width, draw.canvases[key].canvas.height);
		}
	},

	// Draws only the specified changes to canvas and updates VRAM. (Expects Uint8Array)
	drawVram_CHANGES: async function(_changesFull){
		window.requestAnimationFrame(function(){
			let updateLayerCanvases = function(){
				let finalLayerCtx = draw.canvases["vram_all"];
				let w = draw.configs.config.lcd.tileset.tileWidth;
				let h = draw.configs.config.lcd.tileset.tileHeight;
				let x;
				let y;
				let rec;

				for(let i=0; i<_changesFull.length; i+=5){
					// Create the record.
					rec = {
						y:_changesFull[i+0],
						x:_changesFull[i+1],
						t0:_changesFull[i+2],
						t1:_changesFull[i+3],
						t2:_changesFull[i+4],
					};
					// console.log(`Change: ${(i/5)+1} of ${_changesFull.length/5}`, " :: rec:", rec);

					// Determine destination x and y on the canvas.
					x = rec.x * w;
					y = rec.y * h;
	
					// Clear and draw to the individual layers..
					draw.canvases["vram_l0"].clearRect( x, y, w, h );
					draw.canvases["vram_l0"].drawImage( draw.tilesCache[ rec.t0 ], x, y) ;
					draw.canvases["vram_l1"].clearRect( x, y, w, h );
					draw.canvases["vram_l1"].drawImage( draw.tilesCache[ rec.t1 ], x, y) ;
					draw.canvases["vram_l2"].clearRect( x, y, w, h );
					draw.canvases["vram_l2"].drawImage( draw.tilesCache[ rec.t2 ], x, y) ;

					// Clear and draw to finalLayerCtx.
					finalLayerCtx.clearRect( x, y, w, h );
					finalLayerCtx.drawImage( draw.tilesCache[ rec.t0 ], x, y) ;
					finalLayerCtx.drawImage( draw.tilesCache[ rec.t1 ], x, y) ;
					finalLayerCtx.drawImage( draw.tilesCache[ rec.t2 ], x, y) ;

					// Update VRAM.
					draw._VRAM_prev[draw.configs.indexByCoords[rec.y][rec.x] + 0] = rec.t0;
					draw._VRAM_prev[draw.configs.indexByCoords[rec.y][rec.x] + 1] = rec.t1;
					draw._VRAM_prev[draw.configs.indexByCoords[rec.y][rec.x] + 2] = rec.t2;
				}
			};
			
			draw.isDrawing=true;
			let now = performance.now();
			draw.fps.tick(now);
			draw.lastDraw = now;

			// Init _VRAM_prev if needed.
			if(!draw._VRAM_prev.length || !ArrayBuffer.isView(draw._VRAM_prev)){
				let rows       = draw.configs.config.lcd.tileset.rows;
				let cols       = draw.configs.config.lcd.tileset.cols;
				let tilesInCol = draw.configs.config.lcd.tileset.tilesInCol;
				draw._VRAM_prev =  new Uint8Array( rows * cols * tilesInCol );
				draw._VRAM_prev.fill(0);
			}

			updateLayerCanvases();
			let oldTime = draw.DOM.info_lastDraw.innerText;
			let newTime = draw.getTime();
			if(oldTime!= newTime){ draw.DOM.info_lastDraw.innerText = newTime; }
			// draw.draws += 1;
			// draw.DOM.info_draws.innerText = draw.draws;
			// draw.fps.updateDisplay();
			draw.isDrawing=false;
		});
	}, 
	// Draws only the specified changes to canvas and updates VRAM. (Expects Uint8Array)
	OLDdrawVram_CHANGES: async function(_changesFull){
		window.requestAnimationFrame(function(){
			let updateLayerCanvases = function(){
				let tileWidth  = draw.configs.config.lcd.tileset.tileWidth;
				let tileHeight = draw.configs.config.lcd.tileset.tileHeight;
				let tileCanvas, dx, dy, ctx;
				let ctx_all = draw.canvases["vram_all"];

				// let clearsOnAllCanvas = [];
				for(let i=0; i<_changesFull.length; i+=4){
					let rec = {
						l:_changesFull[i+0],
						x:_changesFull[i+1],
						y:_changesFull[i+2],
						t:_changesFull[i+3],
					};

					// Determine destination x and y on the canvas.
					dx = rec.x*tileWidth;
					dy = rec.y*tileHeight;
	
					// Get the tile image from cache.
					tileCanvas = draw.tilesCache[rec.t];
	
					// Determine which canvas needed to be drawn to.
					if     (rec.l==0){ ctx = draw.canvases["vram_l0"]; }
					else if(rec.l==1){ ctx = draw.canvases["vram_l1"]; }
					else if(rec.l==2){ ctx = draw.canvases["vram_l2"]; }
	
					// Draw to the all canvas.
					// ctx_all.clearRect(dx, dy, tileWidth, tileHeight);
					// ctx_all.drawImage(tileCanvas, dx, dy); 
	
					// Draw to the matching canvas.
					ctx.clearRect(dx, dy, tileWidth, tileHeight);
					ctx.drawImage(tileCanvas, dx, dy); 

					// Clear this tile on the all canvas.
					draw.canvases["vram_all"].clearRect(dx, dy, tileWidth, tileHeight);
					// clearsOnAllCanvas.push({ dx:dx, dy:dy, tileWidth:tileWidth, tileHeight:tileHeight });

					// Update VRAM.
					draw._VRAM_prev[draw.configs.indexByCoords[rec.y][rec.x] + rec.l] = rec.t;
				}

				// Combine the canvas layers into the ALL canvas.
				// draw.canvases["vram_all"].clearRect(0,0, draw.canvases["vram_all"].canvas.width, draw.canvases["vram_all"].canvas.height);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l0"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l1"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l2"].canvas, 0, 0);
			};
			
			draw.isDrawing=true;
			let now = performance.now();
			draw.fps.tick(now);
			draw.lastDraw = now;

			// Init _VRAM_prev if needed.
			if(!draw._VRAM_prev.length || !ArrayBuffer.isView(draw._VRAM_prev)){
				let rows       = draw.configs.config.lcd.tileset.rows;
				let cols       = draw.configs.config.lcd.tileset.cols;
				let tilesInCol = draw.configs.config.lcd.tileset.tilesInCol;
				draw._VRAM_prev =  new Uint8Array( rows * cols * tilesInCol );
				draw._VRAM_prev.fill(0);
			}

			updateLayerCanvases();
			let oldTime = draw.DOM.info_lastDraw.innerText;
			let newTime = draw.getTime();
			if(oldTime!= newTime){ draw.DOM.info_lastDraw.innerText = newTime; }
			// draw.draws += 1;
			// draw.DOM.info_draws.innerText = draw.draws;
			// draw.fps.updateDisplay();
			draw.isDrawing=false;
		});
	},

	// Draws the entire specified VRAM. (Expects Uint8Array)
	drawVram_FULL: async function(_VRAM_new, drawOverride=false){
		window.requestAnimationFrame(function(){
			let updateLayerCanvases = function(){
				let tileWidth  = draw.configs.config.lcd.tileset.tileWidth;
				let tileHeight = draw.configs.config.lcd.tileset.tileHeight;
				let tilesInCol = draw.configs.config.lcd.tileset.tilesInCol;
				let x, y, tileId, tileCanvas, dx, dy, ctx, VRAM_index;
				
				// let clearsOnAllCanvas = [];
				for(let index=0; index<draw.configs.coordsByIndex.length; index+=1){
					x = draw.configs.coordsByIndex[index][0];
					y = draw.configs.coordsByIndex[index][1];

					for(let v=0; v<tilesInCol; v+=1){
						// Get the tile id and make sure array bounds are respected.
						VRAM_index = (index*tilesInCol)+v;
						if(VRAM_index >= draw._VRAM_prev.length){ tileId_old = undefined; }
						else{ tileId_old = draw._VRAM_prev[VRAM_index]; }
						tileId     = _VRAM_new[VRAM_index];

						// Skip the drawing of any tile that has not changed.
						if(tileId == tileId_old && !drawOverride){ continue; }

						// Get the tile image from cache.
						tileCanvas = draw.tilesCache[tileId];

						// Determine destination x and y on the canvas.
						dx = x*tileWidth;
						dy = y*tileHeight;

						// Determine which canvas needed to be drawn to.
						if     (v==0){ ctx = draw.canvases["vram_l0"]; }
						else if(v==1){ ctx = draw.canvases["vram_l1"]; }
						else if(v==2){ ctx = draw.canvases["vram_l2"]; }
						
						// Clear this tile on the all canvas.
						draw.canvases["vram_all"].clearRect(dx, dy, tileWidth, tileHeight);
						// clearsOnAllCanvas.push({ dx:dx, dy:dy, tileWidth:tileWidth, tileHeight:tileHeight });

						// Draw to the matching canvas.
						ctx.clearRect(dx, dy, tileWidth, tileHeight);
						ctx.drawImage(tileCanvas, dx, dy); 

					}
				}
				// Combine the canvas layers into the ALL canvas.
				// draw.canvases["vram_all"].clearRect(0,0, draw.canvases["vram_all"].canvas.width, draw.canvases["vram_all"].canvas.height);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l0"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l1"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l2"].canvas, 0, 0);
			};
			let updateMainCanvas = function(){
				// Combine the canvas layers into the ALL canvas.
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l0"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l1"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l2"].canvas, 0, 0);
			};
			let saveNew_VRAM = function(){
				// Init the array if needed. Save new to prev.
				if(!draw._VRAM_prev.length || !ArrayBuffer.isView(draw._VRAM_prev)){
					draw._VRAM_prev =  new Uint8Array(_VRAM_new.length);
					draw._VRAM_prev.set(_VRAM_new, 0);
				}
				else{
					draw._VRAM_prev.set(_VRAM_new, 0);
				}
			};
			let end = function(drawn=true){
				let oldTime = draw.DOM.info_lastDraw.innerText;
				let newTime = draw.getTime();
				if(oldTime!= newTime){ draw.DOM.info_lastDraw.innerText = newTime; }
				// draw.draws += 1;
				// draw.DOM.info_draws.innerText = draw.draws;
				// draw.fps.updateDisplay();	
				draw.isDrawing=false;
			};

			draw.isDrawing=true;
			let now = performance.now();
			draw.fps.tick(now);
			draw.lastDraw = now;
			updateLayerCanvases();
			updateMainCanvas();
			saveNew_VRAM();
			end(true);
		});
	},

	getTime: function(){
		var d = new Date(); // for now
		let h = d.getHours();
		let ampm="AM";
		if (h > 12) { h -= 12; ampm="PM";} 
		else if (h === 0) { h = 12; }
		h = h.toString().padStart(2, " ");
		
		let m = d.getMinutes().toString().padStart(2, "0");
		let s = d.getSeconds().toString().padStart(2, "0");
		let str2 = `${h}:${m}:${s}${ampm}`;
		return str2;
	},
	// Calculates the average frames per second.
	fps : {
		// colxi: https://stackoverflow.com/a/55644176/2731377
		sampleSize : 60,    
		value   : 0, // Value and average are the same value.
		average : 0, // Value and average are the same value.
		_sample_ : [],
		_index_ : 0,
		_lastTick_: false,
		tick : function(now){
			// if is first tick, just set tick timestamp and return
			if( !this._lastTick_ ){
				// this._lastTick_ = performance.now();
				this._lastTick_ = now;
				return 0;
			}
			// calculate necessary values to obtain current tick FPS
			// let now = performance.now();
			let delta = (now - this._lastTick_)/1000;
			let fps = 1/delta;
			// add to fps samples, current tick fps value 
			this._sample_[ this._index_ ] = Math.round(fps);
			
			// iterate samples to obtain the average
			let average = 0;
			for(i=0; i<this._sample_.length; i++) average += this._sample_[ i ];
			average = Math.round( average / this._sample_.length);
	
			// set new FPS
			this.value = average;
			this.average = average;

			// store current timestamp
			this._lastTick_ = now;

			// increase sample index counter, and reset it
			// to 0 if exceded maximum sampleSize limit
			this._index_++;
			if( this._index_ === this.sampleSize) this._index_ = 0;
			
			return this.value;
		},
		init: function(sampleSize){
			// Set the values. 
			this.sampleSize = sampleSize;
			this.value      = 0;
			this.average    = 0;
			this._sample_   = [];
			this._index_    = 0;
			this._lastTick_ = performance.now();
			// draw.fps.updateDisplay();
		},
		// updateDisplay: function(){
		// 	document.getElementById("info_fps").innerText = `` +
		// 		`${draw.fps.average.toString().padStart(2, " ")} f/s ` +
		// 		`(${draw.fps._index_.toString()}/${draw.fps.sampleSize.toString()})`.padStart(7, " ") +
		// 		``
		// 		;
		// },
	},

	setPixelated: function(ctx){
		ctx.mozImageSmoothingEnabled    = false; // Firefox
		ctx.imageSmoothingEnabled       = false; // Firefox
		ctx.oImageSmoothingEnabled      = false; //
		ctx.webkitImageSmoothingEnabled = false; //
		ctx.msImageSmoothingEnabled     = false; //
	},

	// REQUESTS
	getGraphics: async function(){
		return new Promise(function(resolve,reject){
			let img = new Image();
			img.onload = function(){
				// Save the tileset image as a canvas.
				let canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				canvas.getContext("2d").drawImage(img, 0, 0);
				draw.tilesetCanvas = canvas;

				// Create a canvas cache of each tile.
				for(let key in draw.configs.tileCoords){
					let tileCanvas = document.createElement("canvas");
					tileCanvas.classList.add("tileCanvas");
					tileCanvas.width  = draw.configs.config.lcd.tileset.tileWidth;
					tileCanvas.height = draw.configs.config.lcd.tileset.tileHeight;
					
					let tileCanvasCtx = tileCanvas.getContext("2d");
					// tileCanvasCtx.mozImageSmoothingEnabled    = false; // Firefox
					// tileCanvasCtx.imageSmoothingEnabled       = false; // Firefox
					// tileCanvasCtx.oImageSmoothingEnabled      = false; //
					// tileCanvasCtx.webkitImageSmoothingEnabled = false; //
					// tileCanvasCtx.msImageSmoothingEnabled     = false; //
					draw.setPixelated(tileCanvasCtx);

					tileCanvasCtx.drawImage(
						draw.tilesetCanvas, 
						draw.configs.tileCoords[key.toString()].L * draw.configs.config.lcd.tileset.tileWidth, 
						draw.configs.tileCoords[key.toString()].T * draw.configs.config.lcd.tileset.tileHeight,
						draw.configs.config.lcd.tileset.tileWidth,
						draw.configs.config.lcd.tileset.tileHeight,
						0,
						0,
						draw.configs.config.lcd.tileset.tileWidth,
						draw.configs.config.lcd.tileset.tileHeight
					);
					draw.tilesCache.push(tileCanvas);
				}

				resolve();
			};
			img.src = "shared/"+draw.configs.config.lcd.tileset.file;
		});
	},

	getVram: async function(type){
		// Draw the new VRAM.
		if(type=="ws" && websocket.activeWs){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"GET_VRAM", "data":""}));
			}
		}
		else if(type=="post"){
			if(!draw.isDrawing){
				let data = await http.post("GET_VRAM", {}, "json");

				// Apply view to the ArrayBuffer.
				data = new Uint8Array(data);

				// Strip off the last 4 bytes and convert to string.
				let type = data.slice(-6).reduce((p,c) => p + String.fromCharCode(c), "");

				// Separate out the actual data.
				let newData = data.slice(0, -6);

				// Run the correct drawing function based on the value of part.
				switch(type){
					case "FULL__": { draw.drawVram_FULL(newData); break; }
					case "PART__": { draw.drawVram_CHANGES(newData); break; }
					default    : { console.log("Unknown type:", type, newData); break; }
				};
			} else{ console.log("ALREADY IN A DRAW"); }
		}
	},	
	toggleBacklight: async function(type){
		// Draw the new VRAM.
		if(type=="ws" && websocket.activeWs){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"TOGGLE_BACKLIGHT", "data":"BL_PIN"}));
			}
		}
		else if(type=="post"){
			if(!draw.isDrawing){
				let data = await http.post("TOGGLE_BACKLIGHT", {pin: "BL_PIN"}, "json");
				console.log(data);
			} else{ console.log("ALREADY IN A DRAW"); }
		}
	},

	display_stats3: function(data){
		// console.log("display_stats3:", data);
		let dest = document.getElementById("controls_cont_view_stats_output");
		let output = "";
		
		// Display the main keys in reverse order.
		let keys1 = Object.keys(data);
		keys1.reverse();

		for(let key1 of keys1){
			let longestKey2 = 0;
			for(let key in data[key1]){ if(key.length > longestKey2){ longestKey2 = key.length; } }

			// output += `${"*".repeat(45)}\n`;
			output += `${"-".repeat(key1.length + 4)}\n`;
			output += `| ${key1} |\n`;
			output += `${"-".repeat(key1.length + 4)}\n`;
			
			// Display the sub keys in reverse order.
			// let keys2 = Object.keys(data[key1]).reverse();
			let keys2 = Object.keys(data[key1]);
			for(let key2 of keys2){
				let value;
				try{
					value = data[key1][key2].t.toFixed(2);
				}
				catch(e){
					// console.log("key:", key2, "does not have a value.");
					value = "?????";
				}
				output += ` ->  ${key2.padEnd(longestKey2, " ")} : ${value.padStart(10, " ")} ms\n`;
			}
			output += " \n";
		}
		// output += " \n";
	
		// output += `${"*".repeat(45)}\n`;
		dest.innerText = output;
	},

	// TODO
	display_stats4: function(data){
		console.log("display_stats4:", data);
		let dest = document.getElementById("controls_cont_view_stats4_output");
		let output = "";
		return;
	},

	initDebugCanvasLayers: function(){
		let clearDebugCanvases = function(){
			let vram_all_l1 = document.getElementById("vram_all_l1");
			let vram_all_l1_ctx = vram_all_l1.getContext("2d");
			draw.setPixelated(vram_all_l1_ctx);
			vram_all_l1_ctx.clearRect(0,0,vram_all_l1.width, vram_all_l1.height);
		
			let vram_all_l2 = document.getElementById("vram_all_l2");
			let vram_all_l2_ctx = vram_all_l2.getContext("2d");
			draw.setPixelated(vram_all_l2_ctx);
			vram_all_l2_ctx.clearRect(0,0,vram_all_l2.width, vram_all_l2.height);
		};
		let drawNumbers = function(){
			let ts = draw.configs.config.lcd.tileset;
			let tw = ts.tileWidth;
			let th = ts.tileHeight;
			let rows = ts.rows;
			let cols = ts.cols;

			let numberTiles = [
				draw.tilesCache[ draw.configs.tileIdsByTilename["n0"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n1"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n2"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n3"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n4"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n5"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n6"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n7"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n8"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["n9"] ],

				draw.tilesCache[ draw.configs.tileIdsByTilename["A"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["B"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["C"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["D"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["E"] ],
				draw.tilesCache[ draw.configs.tileIdsByTilename["F"] ],
			];
			// let bgTile1 = draw.tilesCache[ draw.configs.tileIdsByTilename["tile1"] ]; // Teal.
			// let bgTile2 = draw.tilesCache[ draw.configs.tileIdsByTilename["tile2"] ]; // Gray/Black.
			// let bgTile3 = draw.tilesCache[ draw.configs.tileIdsByTilename["tile3"] ]; // Dark teal.
			let bgTile4 = draw.tilesCache[ draw.configs.tileIdsByTilename["tile4"] ]; // Mostly black.

			// Draw the numbers on row 0 and the last row.
			let vram_all_l1 = document.getElementById("vram_all_l1");
			let vram_all_l1_ctx = vram_all_l1.getContext("2d");
			let currentNumber = 0;
			for(let x=1; x<=cols; x+=1){
				vram_all_l1_ctx.drawImage( bgTile4, x*tw, 0*th) ; 
				vram_all_l1_ctx.drawImage( bgTile4, x*tw, (rows+1)*th) ; 
				vram_all_l1_ctx.drawImage( numberTiles[currentNumber], x*tw, 0*th) ; 
				vram_all_l1_ctx.drawImage( numberTiles[currentNumber], x*tw, (rows+1)*th) ; 
				currentNumber += 1;
				if(currentNumber > 15){ currentNumber = 0; }
			}

			// Draw the numbers on the column 0 and the last column.
			currentNumber = 0;
			for(let y=1; y<=cols; y+=1){
				vram_all_l1_ctx.drawImage( bgTile4, 0*tw, y*th) ; 
				vram_all_l1_ctx.drawImage( bgTile4, (cols+1)*tw, y*th) ; 
				vram_all_l1_ctx.drawImage( numberTiles[currentNumber], 0*tw, y*th) ; 
				vram_all_l1_ctx.drawImage( numberTiles[currentNumber], (cols+1)*tw, y*th) ; 
				currentNumber += 1;
				if(currentNumber > 15){ currentNumber = 0; }
			}
		};
		let drawGrid = function(){
			let vram_all_l2 = document.getElementById("vram_all_l2");
			let vram_all_l2_ctx = vram_all_l2.getContext("2d");

			let ts = draw.configs.config.lcd.tileset;
			let tw = ts.tileWidth;
			let th = ts.tileHeight;
			let rows = ts.rows;
			let cols = ts.cols;

			let w = vram_all_l2.width;
			let h = vram_all_l2.height;
			let tile = draw.tilesCache[ draw.configs.tileIdsByTilename["grid1"] ];

			for (let x=0; x<=w; x+=1) {
				for (let y=0; y<=h; y+=1) {
					vram_all_l2_ctx.drawImage( tile, x*tw, y*th) ; 
				}
			}
		};
		
		clearDebugCanvases();
		drawNumbers();
		drawGrid();
	},

	// POST.
	remoteConf: {
		DOM:{},
		// Request the remoteConf.json file from the server.
		reload: async function(){
			// Request the data.
			let data = await http.post("get_remoteConf", {}, "json");

			// Save the data.
			draw.configs.remoteConf = data;

			// Display the data.
			draw.remoteConf.display();
		},

		// Display the current cached remoteConf.json data.
		display: function(){
			let dest = draw.remoteConf.DOM.output;
			dest.value = JSON.stringify(draw.configs.remoteConf,null,1);
		},

		// Update local and the server with the displayed remoteConf.json data.
		update: async function(){
			let src;

			// Make sure that the JSON is parsable.
			try{ src = JSON.parse(draw.remoteConf.DOM.output.value); }
			catch(e){
				console.log(e);
				alert("The JSON could not be parsed. Please check it before trying again.");
				return;
			}

			// Send the data.
			let resp = await http.post("update_remoteConf", {remoteConf: src}, "json");
		},

		// Init this section. 
		init: function() {
			// DOM
			draw.remoteConf.DOM.reload = document.getElementById("remoteConf_reload");
			draw.remoteConf.DOM.update = document.getElementById("remoteConf_update");
			draw.remoteConf.DOM.output = document.getElementById("controls_cont_view_remoteConf_output");

			// EVENT LISTENERS.
			draw.remoteConf.DOM.reload.addEventListener("click", draw.remoteConf.reload, false);
			draw.remoteConf.DOM.update.addEventListener("click", draw.remoteConf.update, false);

			// DISPLAY
			draw.remoteConf.display();
		}
	},
};
// BUTTON INPUT
let buttons = {
	DOM:{},
	setup: function(){
		// ADD BUTTONS TO THE DOM CACHE.
		buttons.DOM["ws_status"]            = document.getElementById("ws_status");
		buttons.DOM["ws_connect"]           = document.getElementById("ws_connect");
		buttons.DOM["ws_disconnect"]        = document.getElementById("ws_disconnect");

		buttons.DOM["post_up"]                = document.getElementById("post_up");
		buttons.DOM["post_down"]              = document.getElementById("post_down");
		buttons.DOM["post_left"]              = document.getElementById("post_left");
		buttons.DOM["post_right"]             = document.getElementById("post_right");
		buttons.DOM["post_press"]             = document.getElementById("post_press");
		buttons.DOM["post_b1"]                = document.getElementById("post_b1");
		buttons.DOM["post_b2"]                = document.getElementById("post_b2");
		buttons.DOM["post_b3"]                = document.getElementById("post_b3");

		buttons.DOM["ws_up"]                = document.getElementById("ws_up");
		buttons.DOM["ws_down"]              = document.getElementById("ws_down");
		buttons.DOM["ws_left"]              = document.getElementById("ws_left");
		buttons.DOM["ws_right"]             = document.getElementById("ws_right");
		buttons.DOM["ws_press"]             = document.getElementById("ws_press");
		buttons.DOM["ws_b1"]                = document.getElementById("ws_b1");
		buttons.DOM["ws_b2"]                = document.getElementById("ws_b2");
		buttons.DOM["ws_b3"]                = document.getElementById("ws_b3");
		buttons.DOM["ws_requestVramDraw"]   = document.getElementById("ws_requestVramDraw");
		buttons.DOM["ws_requestToggleBacklight"] = document.getElementById("ws_requestToggleBacklight");
		
		buttons.DOM["post_requestVramDraw"] = document.getElementById("post_requestVramDraw");
		buttons.DOM["post_requestToggleBacklight"] = document.getElementById("post_requestToggleBacklight");
		buttons.DOM["post_requestDrawFlags"] = document.getElementById("post_requestDrawFlags");

		// Add listeners for each button.
		// buttons.DOM["ws_status"];
		buttons.DOM["ws_connect"]   .addEventListener("click", ()=>{ websocket.ws_utilities.initWss(); }, false);
		buttons.DOM["ws_disconnect"].addEventListener("click", ()=>{ 
			websocket.autoReconnect=false;
			buttons.DOM.ws_autoReconnect.checked = false;
			websocket.ws_utilities.wsCloseAll(false); 
		}, false);

		buttons.DOM["post_up"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY_UP_PIN");}, false);
		buttons.DOM["post_down"] .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY_DOWN_PIN");}, false);
		buttons.DOM["post_left"] .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY_LEFT_PIN");}, false);
		buttons.DOM["post_right"].addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY_RIGHT_PIN");}, false);
		buttons.DOM["post_press"].addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY_PRESS_PIN");}, false);
		buttons.DOM["post_b1"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY1_PIN");}, false);
		buttons.DOM["post_b2"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY2_PIN");}, false);
		buttons.DOM["post_b3"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("post", "KEY3_PIN");}, false);

		buttons.DOM["ws_up"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY_UP_PIN");}, false);
		buttons.DOM["ws_down"] .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY_DOWN_PIN");}, false);
		buttons.DOM["ws_left"] .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY_LEFT_PIN");}, false);
		buttons.DOM["ws_right"].addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY_RIGHT_PIN");}, false);
		buttons.DOM["ws_press"].addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY_PRESS_PIN");}, false);
		buttons.DOM["ws_b1"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY1_PIN");}, false);
		buttons.DOM["ws_b2"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY2_PIN");}, false);
		buttons.DOM["ws_b3"]   .addEventListener("click", ()=>{buttons.PRESS_BUTTONS("ws", "KEY3_PIN");}, false);
		buttons.DOM["ws_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('ws');}, false);
		buttons.DOM["ws_requestToggleBacklight"].addEventListener("click", ()=>{draw.toggleBacklight('ws');}, false);
		
		buttons.DOM["post_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('post');}, false);
		buttons.DOM["post_requestToggleBacklight"].addEventListener("click", ()=>{draw.toggleBacklight('post');}, false);
		buttons.DOM["post_requestDrawFlags"].addEventListener("click", async ()=>{
			let data = await http.post("GET_DRAW_FLAGS", {}, "json");
			console.log( 
				JSON.stringify(data, null, 1) 
			);
		}, false);
	},

	// REQUESTS
	PRESS_BUTTONS: function(type, buttonKey){
		let obj = {
			KEY_UP_PIN   : buttonKey == "KEY_UP_PIN",
			KEY_DOWN_PIN : buttonKey == "KEY_DOWN_PIN",
			KEY_LEFT_PIN : buttonKey == "KEY_LEFT_PIN",
			KEY_RIGHT_PIN: buttonKey == "KEY_RIGHT_PIN",
			KEY_PRESS_PIN: buttonKey == "KEY_PRESS_PIN",
			KEY1_PIN     : buttonKey == "KEY1_PIN",
			KEY2_PIN     : buttonKey == "KEY2_PIN",
			KEY3_PIN     : buttonKey == "KEY3_PIN",
		}
		if(type=="ws"){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"PRESS_BUTTONS", "data":obj}));
			}
		}
		else if(type=="post"){
			http.post("PRESS_BUTTONS", obj, "json") ;
		}
	},
	DEBUGCMD : function(type, cmd){
		let obj = {
			cmd   : cmd,
		}
		if(type=="ws"){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"DEBUGCMD", "data":obj}));
			}
		}
		else if(type=="post"){
			http.post("DEBUGCMD", obj, "json") ;
		}
	},

	populateFpsValues: function(){
		let select = draw.DOM.info_changeFps;
		let configFps = draw.configs.config.node.fps;

		let frag = document.createDocumentFragment();
		let option;
		for(let i=1; i<=60; i+=1){
			option = document.createElement("option");
			option.value = i;
			option.innerText = `${i} ${i==configFps ? "(D)" : ""}`;
			frag.appendChild(option);
		}
		select.options.length=0;
		select.append(frag);
	},
	populateSubscriptionKeys: function(){
		let subscriptionKeys = draw.configs.subscriptionKeys;
		// console.log("subscriptionKeys:", subscriptionKeys);

		let frag = document.createDocumentFragment();
		for(let i=0; i<subscriptionKeys.length; i+=1){
			let key = subscriptionKeys[i];
			// let div   = document.createElement("div");
			// div.classList.add("inlineBlock");
			// div.classList.add("subscriptionDiv");
			let label = document.createElement("label");
			label.classList.add("subscriptionContainer");
			let span = document.createElement("span");
			span.innerText = key;
			let input = document.createElement("input");
			input.type="checkbox";
			input.setAttribute("key", key);
			input.onclick = function(){ 
				if(this.checked){
					buttons.addSubscription(key); 
				}
				else{
					buttons.removeSubscription(key); 
				}
			};

			// label.append(span, input);
			label.append(input, span);
			// div.append(label);
			// frag.append(div);
			frag.append(label);
		}
		document.getElementById("info_subscriptionsDiv").append(frag);
		// document.body.append(frag);
	},
	changeFps: function(type, newFps){
		if(type=="ws"){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"CHANGE_FPS", "data":parseInt(newFps,10)}));
			}
		}
		else if(type=="post"){
		}
	},

	// SUBSCRIPTIONS
	getCheckboxState: function(key){
		// buttons.getCheckboxState("VRAM_FULL")
		// buttons.getCheckboxState("VRAM_CHANGES")
		let checkbox = document.getElementById("info_subscriptionsDiv").querySelector(`input[type='checkbox'][key='${key}'`);
		return checkbox.checked;
	},
	updateSubscriptionList: function(data){
		// Get the list of subscription checkboxes. 
		let checkboxes = document.getElementById("info_subscriptionsDiv").querySelectorAll(`input[type='checkbox']`);

		// Loop through each checkbox. 
		for(let i=0; i<checkboxes.length; i+=1){
			// Get this checkbox and the key.
			let rec = checkboxes[i];
			let key = rec.getAttribute("key");
			
			// Is the key of this checkbox one of the keys in data?

			// Check the box?
			if( data.indexOf(key) != -1 ){ rec.checked = true; }
			
			// Uncheck the box.
			else{ rec.checked = false; }
		}
	},
	addSubscription   : function(key){ 
		if(websocket.activeWs){ websocket.activeWs.send(JSON.stringify({mode:"SUBSCRIBE", data:key})); }
	},
	removeSubscription: function(key){ 
		if(websocket.activeWs){ websocket.activeWs.send(JSON.stringify({mode:"UNSUBSCRIBE", data:key})); }
	},

	// SCREENS
	populateScreens: function(){
		let info_screensDiv1 = document.getElementById("info_screensDiv1");
		let info_screensDiv2 = document.getElementById("info_screensDiv2");
		let screens = draw.configs.screens;

		// WS buttons.
		let frag = document.createDocumentFragment();
		for(let i=0; i<screens.length; i+=1){
			let value = screens[i];
			let button = document.createElement("button");
			button.innerText = value.replace("m_s_", "");
			button.onclick = function(){ 
				if(websocket.activeWs){ 
					websocket.activeWs.send(JSON.stringify({mode:"CHANGE_SCREEN", data:value})); 
				}
			};
			button.setAttribute("screen", value);
			frag.append(button);
		}
		info_screensDiv1.innerHTML = "";
		info_screensDiv1.append(frag);

		// POST buttons.
		frag = document.createDocumentFragment();
		for(let i=0; i<screens.length; i+=1){
			let value = screens[i];
			let button = document.createElement("button");
			button.innerText = value.replace("m_s_", "");
			button.onclick = function(){ http.post("changeScreen", {screen:value}, "json"); };
			button.setAttribute("screen", value);
			frag.append(button);
		}
		info_screensDiv2.innerHTML = "";
		info_screensDiv2.append(frag);
	},

};
// NAV
let nav = {
	hideAll:function(){
		// nav.hideAll();
		
		let navButtons = document.querySelectorAll("#controls_nav .navButton");
		navButtons.forEach(d=>{ d.classList.remove("active"); });

		let navViews = document.querySelectorAll("#controls_cont_views .view");
		navViews.forEach(d=>{ d.classList.remove("active"); });
	},
	showOne:function(navButtonId){
		// nav.showOne("controls_cont_nav_ws");
		// nav.showOne("controls_cont_nav_post");
		// nav.showOne("controls_cont_nav_vram");

		// Remove the active status on all nav buttons and nav views.
		nav.hideAll();
		
		// Get the nav button and the nav view.
		let navButton = document.getElementById(navButtonId);
		let view = document.getElementById( navButton.getAttribute("view") );
		
		// Add the active status on the nav button and nav view.
		navButton.classList.add("active");
		view.classList.add("active");
	},
};
// SHARED
let shared = {
	toggleFullscreen : function(elem) {
		if(!elem) { elem = document.documentElement; }
	  
		if (
			!document.fullscreenElement && 
			!document.mozFullScreenElement &&
			!document.webkitFullscreenElement && 
			!document.msFullscreenElement
		){
			if      (elem.requestFullscreen)       { elem.requestFullscreen(); } 
			else if (elem.msRequestFullscreen)     { elem.msRequestFullscreen(); } 
			else if (elem.mozRequestFullScreen)    { elem.mozRequestFullScreen(); } 
			else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
		} 
		else {
			if      (document.exitFullscreen)       { document.exitFullscreen(); } 
			else if (document.msExitFullscreen)     { document.msExitFullscreen(); } 
			else if (document.mozCancelFullScreen)  { document.mozCancelFullScreen(); } 
			else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
		}
	},
};
// APP INIT
window.onload = async function(){
	window.onload = null;
	
	console.log("CONFIGS");
	draw.configs = await http.post("get_configs", {}, "json");
	
	console.log("GRAPHICS");
	await draw.getGraphics();

	console.log("CANVASES INIT");
	await draw.initCanvases();

	buttons.DOM.ws_autoReconnect = document.getElementById("ws_autoReconnect");
	buttons.DOM.ws_autoReconnect.addEventListener("click", function(){
		websocket.autoReconnect = this.checked;
		if(!websocket.autoReconnect){ console.log("*"); clearTimeout(websocket.autoReconnect_id); }
	}, false);
	buttons.DOM.ws_autoReconnect.checked = websocket.autoReconnect;
	buttons.DOM.ws_autoReconnect.dispatchEvent(new Event("click"));

	// FPS changes.
	draw.DOM.info_changeFps = document.getElementById("info_changeFps");
	draw.DOM.info_changeFpsBtn = document.getElementById("info_changeFpsBtn");
	draw.DOM.info_changeFps.addEventListener("change", function(){ buttons.changeFps("ws", this.value); }, false);
	draw.DOM.info_changeFpsBtn.addEventListener("click", function(){ buttons.changeFps("ws", draw.DOM.info_changeFps.value); }, false);
	buttons.populateFpsValues();
	draw.DOM.info_changeFps.value = draw.configs.config.node.fps;
	buttons.populateSubscriptionKeys();

	buttons.populateScreens();

	draw.DOM.vram_div_layers = document.getElementById("vram_div_layers");
	
	// draw.DOM.info_fps          = document.getElementById("info_fps");
	// draw.DOM.info_draws        = document.getElementById("info_draws");
	draw.DOM.info_lastDraw     = document.getElementById("info_lastDraw");
	draw.DOM.info_changeFps    = document.getElementById("info_changeFps");
	
	draw.DOM.info_serverFps    = document.getElementById("info_serverFps");

	window.addEventListener("unload", function () {
		console.log("unload: Closing websockets.");
		websocket.ws_utilities.wsCloseAll();
	});
	window.addEventListener("beforeunload", function () {
		console.log("beforeunload: Closing websockets.");
		websocket.ws_utilities.wsCloseAll();
	});

	buttons.setup();

	// draw.DOM.info_VRAM_UPDATESTATS = document.getElementById("info_VRAM_UPDATESTATS");
	// VRAM layers toggle.
	// draw.DOM.vram_div_layersChk = document.getElementById("vram_div_layersChk");
	// draw.DOM.vram_div_layersChk.checked = draw.showIndividualLayers;
	// draw.DOM.vram_div_layersChk.addEventListener("click", function(){
	// 	draw.showIndividualLayers = this.checked; 
	// 	if(this.checked){ draw.showVramLayers(); }
	// 	else{ draw.hideVramLayers(); }
	// }, false);
	// draw.DOM.vram_div_layersChk.dispatchEvent(new Event("click"));

	// Init fps.
	draw.fps.init(1);

	nav.showOne("controls_cont_nav_ws");
	// nav.showOne("controls_cont_nav_post");
	// nav.showOne("controls_cont_nav_vram");

	buttons.DOM.dispChk_numbers = document.getElementById("dispChk_numbers");
	buttons.DOM.dispChk_numbers.addEventListener("click", function(){
		draw.dispChk_numbers = this.checked;
		let canvas = document.getElementById("vram_all_l1");
		if(this.checked){ canvas.classList.remove("displayNone"); }
		else{ canvas.classList.add("displayNone"); }
	}, false);
	buttons.DOM.dispChk_numbers.checked = draw.dispChk_numbers;
	buttons.DOM.dispChk_numbers.dispatchEvent(new Event("click"));

	buttons.DOM.dispChk_grid    = document.getElementById("dispChk_grid");
	buttons.DOM.dispChk_grid.addEventListener("click", function(){
		draw.dispChk_grid = this.checked;
		let canvas = document.getElementById("vram_all_l2");
		if(this.checked){ canvas.classList.remove("displayNone"); }
		else{ canvas.classList.add("displayNone"); }
	}, false);
	buttons.DOM.dispChk_grid   .checked = draw.dispChk_grid   ;
	buttons.DOM.dispChk_grid.dispatchEvent(new Event("click"));

	buttons.DOM.dispChk_display = document.getElementById("dispChk_display");
	buttons.DOM.dispChk_display.addEventListener("click", function(){
		draw.dispChk_display = this.checked;
		let canvas = document.getElementById("vram_all");
		if(this.checked){ canvas.classList.remove("displayNone"); }
		else{ canvas.classList.add("displayNone"); }
	}, false);
	buttons.DOM.dispChk_display.checked = draw.dispChk_display;
	buttons.DOM.dispChk_display.dispatchEvent(new Event("click"));

	draw.initDebugCanvasLayers();

	draw.remoteConf.init();
}
