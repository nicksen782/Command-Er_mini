// HTTP REQUESTS USING POST.
let http = {
	post: async function(url, body){
		let resp = await( await fetch(url, {
			method: 'POST', headers: { Accept: 'application.json', 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}) ).json();
		// console.log(resp);
		return resp;
	},
};
// WEBSOCKET
let websocket = {
	activeUuid:null,
	activeWs:null,
	wsArr:[],

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
				// console.log(`mode: ${data.mode}, data:`,data.data);
				websocket.activeUuid = data.data;
			},
			WELCOMEMESSAGE: function(data){
				// console.log(`mode: ${data.mode}, data:`,data.data);
			},

			// SUBSCRIPTIONS
			GET_SUBSCRIPTIONS: function(data){
				// console.log(`mode: ${data.mode}, data:`,data.data);
				buttons.updateSubscriptionList(data.data);
			},
			SUBSCRIBE: function(data){
				// console.log(`mode: ${data.mode}, data:`,data.data);
				buttons.updateSubscriptionList(data.data);
			},
			UNSUBSCRIBE: function(data){
				// console.log(`mode: ${data.mode}, data:`,data.data);
				buttons.updateSubscriptionList(data.data);
			},

			// VRAM UPDATES
			STATS1: function(data){
				// console.log(`mode: ${data.mode}, data:`,data.data);
				let outputText = "";
				for(let key in data.data){
					let rec = data.data[key];
					outputText += `` +
					`L:${rec.layer}, ` +
					`U:${rec.updates   .toString().padStart(3, " ")}, ` +
					`R:${rec.real      .toString().padStart(3, " ")}, ` +
					`O:${rec.overwrites.toString().padStart(3, " ")}  ` + 
					`\n`;
				}
				draw.DOM.info_VRAM_UPDATESTATS.innerText = outputText;
			},
			STATS2: function(data){
				// console.log(data);
				// console.log("update fps", draw.serverFps, data.data);
				if(draw.serverFps != data.data){
					draw.serverFps = data.data;
					draw.DOM.info_serverFps.innerText = data.data;
				}
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
		initWss: function(){
			// GENERATE THE WEBSOCKET URL.
			let locUrl = `` +
				`${window.location.protocol == "https:" ? "wss" : "ws"}://` +
				`${location.hostname}` + 
				`${location.port ? ':'+location.port : ''}` +
				`${location.pathname != "/" ? ''+location.pathname : '/'}` +
				`LCD`
			;

			// Close any existing connections. 
			websocket.ws_utilities.wsCloseAll();

			// Set the connection indicator.
			buttons.DOM["ws_status"].innerHTML = "&#128997;";

			// Create new. 
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
	},
	// EVENT HANDLERS.
	ws_events:{
		el_open:function(event){
			// console.log("Web WebSockets Client: OPEN:", event); 

			// Green icon.
			buttons.DOM["ws_status"].innerHTML = "&#129001;";

			draw.fps.updateDisplay();

			// Remove disconnected, add connected.
			let wsElems = document.querySelectorAll(".ws");
			wsElems.forEach(function(d){ d.classList.add("connected"); d.classList.remove("disconnected"); });

			// Init fps.
			draw.fps.init();

			// Request GET_VRAM.
			draw.getVram("ws");
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
				// Draw _VRAM..
				if(!draw.isDrawing){
					draw.drawVram( new Uint8Array(data) );
				}
				else{ draw.skippedDraws += 1; }
			}
			
			else if(tests.isBlob){
				console.log("tests: isBlob:", tests);
			}

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
				buttons.DOM["ws_status"].innerHTML = "";
				websocket.activeWs=null; 
			}, 1000);
			draw.fps.updateDisplay();
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

			draw.fps.updateDisplay();
		},
	},
};
// VRAM DRAWING
let draw = {
	DOM: {},
	configs: {},
	tilesetCanvas:null,
	tilesCache:[],
	canvases : {
		vram_l1 :null,
		vram_l2 :null,
		vram_l3 :null,
		vram_all:null,
	},
	_VRAM:[],
	_VRAM_prev:[],
	isDrawing:false,
	lastDraw: performance.now(),
	draws:0,
	skippedDraws:0,
	showIndividualLayers: true,
	serverFps:1,

	showVramLayers: function(){
		draw.DOM.vram_div_layers.classList.remove("hide");
	},
	hideVramLayers: function(){
		draw.DOM.vram_div_layers.classList.add("hide");

	},
	initCanvases: async function(){
		// 
		draw.canvases.vram_l1  = document.getElementById("vram_l1").getContext("2d");
		draw.canvases.vram_l2  = document.getElementById("vram_l2").getContext("2d");
		draw.canvases.vram_l3  = document.getElementById("vram_l3").getContext("2d");
		draw.canvases.vram_all = document.getElementById("vram_all").getContext("2d");

		for(let key in draw.canvases){
			draw.canvases[key].canvas.width = draw.configs.config.lcd.width;
			draw.canvases[key].canvas.height = draw.configs.config.lcd.height;
		}
		draw.clearAllCanvases("black");
	},
	clearOneCanvas: function(canvasCtx, fillStyle=null){
		// Clear all.
		canvasCtx.clearRect(0,0, canvasCtx.canvas.width, canvasCtx.canvas.height);

		// Make black;
		if(fillStyle){
			canvasCtx.fillStyle = "black";
			canvasCtx.fillRect(0,0, canvasCtx.canvas.width, canvasCtx.canvas.height);
		}
	},
	clearAllCanvases: function(fillStyle=null){
		for(let key in draw.canvases){
			draw.clearOneCanvas(draw.canvases[key], fillStyle);
		}
	},
	drawVram: async function(_VRAM_new){
		window.requestAnimationFrame(function(){
			let runCheck = function(){
				// let sinceLastDraw = performance.now() - draw.lastDraw;
				let sinceLastDraw = performance.now() - draw.fps._lastTick_;
				let fpsMs = 1000/(draw.serverFps);
				if(  (sinceLastDraw) >= (fpsMs) ){
					// console.log(`DRAW: YES: DIFF:${(sinceLastDraw-fpsMs).toFixed(8).padStart(14, " ")}, fpsMs:${fpsMs.toFixed(2).padStart(7, " ")}, sinceLastDraw:${sinceLastDraw.toFixed(2).padStart(7, " ")}`);
					draw.fps.tick();
					draw.lastDraw = performance.now();
					return true;
				}
				else{
					// console.log(`DRAW: NO : DIFF:${(sinceLastDraw-fpsMs).toFixed(8).padStart(14, " ")}, fpsMs:${fpsMs.toFixed(2).padStart(7, " ")}, sinceLastDraw:${sinceLastDraw.toFixed(2).padStart(7, " ")}`);
					return false;
				}
			};
			let updateLayerCanvases = function(){
				let tileWidth = draw.configs.config.lcd.tileset.tileWidth;
				let tileHeight = draw.configs.config.lcd.tileset.tileHeight;
				let tilesInCol = draw.configs.config.lcd.tileset.tilesInCol;
				let x,y,tileId,tileImage,dx,dy;
					
				// draw.clearAllCanvases();

				for(let index=0; index<draw.configs.coordsByIndex.length; index+=1){
					x = draw.configs.coordsByIndex[index][0];
					y = draw.configs.coordsByIndex[index][1];

					for(let v=0; v<tilesInCol; v+=1){
						// Get the tile id.
						tileId_old = draw._VRAM_prev[(index*tilesInCol)+v];
						tileId = _VRAM_new[(index*tilesInCol)+v];

						// Skip the drawing of any tile that has not changed.
						if(tileId == tileId_old){ continue; }

						// Get the tile image from cache.
						tileImage = draw.tilesCache[tileId];

						// Determine destination x and y on the canvas.
						dx = x*tileWidth;
						dy = y*tileHeight;

						// Draw to the matching canvas.
						if     (v==0){ 
							draw.canvases["vram_l1"].clearRect(dx, dy, tileWidth, tileHeight);
							draw.canvases["vram_l1"].drawImage(tileImage, dx, dy); 
						}
						else if(v==1){ 
							draw.canvases["vram_l2"].clearRect(dx, dy, tileWidth, tileHeight);
							draw.canvases["vram_l2"].drawImage(tileImage, dx, dy); 
						}
						else if(v==2){ 
							draw.canvases["vram_l3"].clearRect(dx, dy, tileWidth, tileHeight);
							draw.canvases["vram_l3"].drawImage(tileImage, dx, dy); 
						}
					}
				}
				// Combine the canvas layers into the ALL canvas.
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l1"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l2"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l3"].canvas, 0, 0);
			};
			let updateMainCanvas = function(){
				// Combine the canvas layers into the ALL canvas.
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l1"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l2"].canvas, 0, 0);
				draw.canvases["vram_all"].drawImage(draw.canvases["vram_l3"].canvas, 0, 0);
			};
			let saveNew_VRAM = function(){
				// Save new to prev.
				draw._VRAM_prev = new Uint8Array( Array.from(_VRAM_new) );
			};
			let end = function(drawn=true){
				draw.isDrawing=false;
				if(drawn){
					let oldTime = draw.DOM.info_lastDraw.innerText;
					let newTime = draw.getTime();
					if(oldTime!= newTime){ draw.DOM.info_lastDraw.innerText = newTime; }
					draw.draws += 1;
					draw.DOM.info_skippedDraws.innerText = draw.skippedDraws;
					draw.DOM.info_draws.innerText = draw.draws;
					draw.fps.updateDisplay();
				}
			};

			draw.isDrawing=true;
			if( !runCheck() ){ end(false); return; };
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
		tick : function(){
			// if is first tick, just set tick timestamp and return
			if( !this._lastTick_ ){
				this._lastTick_ = performance.now();
				return 0;
			}
			// calculate necessary values to obtain current tick FPS
			let now = performance.now();
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
		init: function(){
			// Set the values. 
			this.sampleSize = 60;
			this.value      = 0;
			this.average    = 0;
			this._sample_   = [];
			this._index_    = 0;
			this._lastTick_ = performance.now();
			draw.fps.updateDisplay();
		},
		updateDisplay: function(){
			document.getElementById("info_fps").innerText = `` +
				`${draw.fps.average.toString().padStart(2, " ")} f/s ` +
				`(${draw.fps._index_.toString()}/${draw.fps.sampleSize.toString()})`.padStart(7, " ") +
				``
				;
		},
	},

	requestFpsChange: function(newFps){
		// CONFIG.
		// CHANGE_FPS
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
					tileCanvasCtx.mozImageSmoothingEnabled    = false; // Firefox
					tileCanvasCtx.imageSmoothingEnabled       = false; // Firefox
					tileCanvasCtx.oImageSmoothingEnabled      = false; //
					tileCanvasCtx.webkitImageSmoothingEnabled = false; //
					tileCanvasCtx.msImageSmoothingEnabled     = false; //

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
		if(type=="ws" && websocket.activeWs){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"GET_VRAM", "data":""}));
			}
		}
		else if(type=="post"){
			if(!draw.isDrawing){
				draw.drawVram( await http.post("GET_VRAM", {}) );
			}
			else{ draw.skippedDraws += 1; }
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

		buttons.DOM["ws_up"]                = document.getElementById("ws_up");
		buttons.DOM["ws_down"]              = document.getElementById("ws_down");
		buttons.DOM["ws_left"]              = document.getElementById("ws_left");
		buttons.DOM["ws_right"]             = document.getElementById("ws_right");
		buttons.DOM["ws_press"]             = document.getElementById("ws_press");
		buttons.DOM["ws_b1"]                = document.getElementById("ws_b1");
		buttons.DOM["ws_b2"]                = document.getElementById("ws_b2");
		buttons.DOM["ws_b3"]                = document.getElementById("ws_b3");
		buttons.DOM["ws_requestVramDraw"]   = document.getElementById("ws_requestVramDraw");

		buttons.DOM["post_requestVramDraw"] = document.getElementById("post_requestVramDraw");

		// Add listeners for each button.
		// buttons.DOM["ws_status"];
		buttons.DOM["ws_connect"]   .addEventListener("click", ()=>{ websocket.ws_utilities.initWss(); }, false);
		buttons.DOM["ws_disconnect"].addEventListener("click", ()=>{ websocket.ws_utilities.wsCloseAll(); }, false);

		buttons.DOM["ws_up"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_UP_PIN");}, false);
		buttons.DOM["ws_down"] .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_DOWN_PIN");}, false);
		buttons.DOM["ws_left"] .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_LEFT_PIN");}, false);
		buttons.DOM["ws_right"].addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_RIGHT_PIN");}, false);
		buttons.DOM["ws_press"].addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_PRESS_PIN");}, false);
		buttons.DOM["ws_b1"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY1_PIN");}, false);
		buttons.DOM["ws_b2"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY2_PIN");}, false);
		buttons.DOM["ws_b3"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY3_PIN");}, false);
		buttons.DOM["ws_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('ws');}, false);

		buttons.DOM["post_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('post');}, false);
	},

	// REQUESTS
	toggle_button: function(type, buttonKey){
		if(websocket.activeWs){
			// websocket.activeWs.send(JSON.stringify({"mode":"GET_VRAM", "data":""}));
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
			option.innerText = `${i} ${i==configFps ? "(conf)" : ""}`;
			frag.appendChild(option);
		}
		select.options.length=0;
		select.append(frag);

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
	clearLayer: function(type, layer){
		if(type=="ws"){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"CLEAR_LAYER", "data":layer}));
			}
		}
		else if(type=="post"){
		}
	},

	// SUBSCRIPTIONS
	// draw.addSubscription('VRAM');
	updateSubscriptionList: function(list){
		let outputText = "";
		for(let i=0; i<list.length; i+=1){
			outputText += `${list[i]}`;
			if(i+1 != list.length){
				outputText += `, `;
			}
		}

		draw.DOM.info_SUBSCRIPTIONS.innerText = outputText;
	},
	getSubscriptions  : function()   { 
		if(websocket.activeWs){ websocket.activeWs.send("GET_SUBSCRIPTIONS"); }
	},
	addSubscription   : function(key){ 
		if(websocket.activeWs){ websocket.activeWs.send(JSON.stringify({mode:"SUBSCRIBE", data:key})); }
	},
	removeSubscription: function(key){ 
		if(websocket.activeWs){ websocket.activeWs.send(JSON.stringify({mode:"UNSUBSCRIBE", data:key})); }
	},
};

// APP INIT
window.onload = async function(){
	window.onload = null;
	
	console.log("CONFIGS");
	draw.configs = await http.post("get_configs", {});
	
	console.log("GRAPHICS");
	await draw.getGraphics();

	console.log("CANVASES INIT");
	await draw.initCanvases();

	// VRAM layers toggle.
	draw.DOM.vram_div_layersChk = document.getElementById("vram_div_layersChk");
	draw.DOM.vram_div_layersChk.addEventListener("click", function(){
		draw.showIndividualLayers = this.checked; 
		if(this.checked){ draw.showVramLayers(); }
		else{ draw.hideVramLayers(); }
	}, false)

	// FPS changes.
	draw.DOM.info_changeFps = document.getElementById("info_changeFps");
	draw.DOM.info_changeFpsBtn = document.getElementById("info_changeFpsBtn");
	draw.DOM.info_changeFps.addEventListener("change", function(){ buttons.changeFps("ws", this.value); }, false);
	draw.DOM.info_changeFpsBtn.addEventListener("click", function(){ buttons.changeFps("ws", draw.DOM.info_changeFps.value); }, false);
	buttons.populateFpsValues();
	draw.DOM.info_changeFps.value = draw.configs.config.node.fps;

	draw.DOM.vram_div_layers = document.getElementById("vram_div_layers");
	
	draw.DOM.info_fps          = document.getElementById("info_fps");
	draw.DOM.info_curFrame     = document.getElementById("info_curFrame");
	draw.DOM.info_draws        = document.getElementById("info_draws");
	draw.DOM.info_skippedDraws = document.getElementById("info_skippedDraws");
	draw.DOM.info_lastDraw     = document.getElementById("info_lastDraw");
	draw.DOM.info_changeFps    = document.getElementById("info_changeFps");
	
	draw.DOM.info_clearLayer0    = document.getElementById("info_clearLayer0");
	draw.DOM.info_clearLayer1    = document.getElementById("info_clearLayer1");
	draw.DOM.info_clearLayer2    = document.getElementById("info_clearLayer2");
	draw.DOM.info_clearLayerAll    = document.getElementById("info_clearLayerAll");
	draw.DOM.info_clearLayer0.addEventListener("click", function(){ buttons.clearLayer("ws", 0); }, false);
	draw.DOM.info_clearLayer1.addEventListener("click", function(){ buttons.clearLayer("ws", 1); }, false);
	draw.DOM.info_clearLayer2.addEventListener("click", function(){ buttons.clearLayer("ws", 2); }, false);
	draw.DOM.info_clearLayerAll.addEventListener("click", function(){ buttons.clearLayer("ws", "ALL"); }, false);
	
	draw.DOM.info_VRAM_UPDATESTATS    = document.getElementById("info_VRAM_UPDATESTATS");
	draw.DOM.info_VRAM_UPDATESTATS.innerText = "\n\n\n";

	draw.DOM.info_SUBSCRIPTIONS    = document.getElementById("info_SUBSCRIPTIONS");
	
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

	// Init fps.
	draw.fps.init();
}