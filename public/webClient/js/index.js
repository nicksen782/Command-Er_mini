let http = {
	post: async function(url, body){
		let resp = await( await fetch(url, {
			method: 'POST', headers: { Accept: 'application.json', 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}) ).json();
		// console.log(resp);
		return resp;
	},
	ws: {
	},
};
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
	ws_event_handlers:{
		JSON  : {
			NEWCONNECTION: function(ws, data){
				// console.log(`mode: ${data.mode}, data: ${data.data}`);
				websocket.activeUuid = data.data;
			},
			WELCOMEMESSAGE: function(ws, data){
				// console.log(`mode: ${data.mode}, data: ${data.data}`);
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
			// console.log("Web WebSockets Client: OPEN:", event); 
			buttons.DOM["ws_status"].innerText = "(OPENED)";
			draw.fps.updateDisplay();
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
				if(data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }

				// BLOB
				else if(data instanceof Blob){ tests.isBlob = true; }
				
				// TEXT
				else{ tests.isText = true; }
			}

			if(tests.isJson){
				if(websocket.ws_event_handlers.JSON[data.mode]){ websocket.ws_event_handlers.JSON[data.mode](ws, data); return; }
				else{ console.log("JSON: Unknown handler for:", data.mode); return;  }
			}

			else if(tests.isText){
				if(websocket.ws_event_handlers.TEXT[data]){ websocket.ws_event_handlers.TEXT[data](ws, data); }
				else{ console.log("TEXT: Unknown handler for:", data); return; }
			}

			else if(tests.isArrayBuffer){
				// Draw _VRAM again.
				if(!draw.isDrawing){
					// Graphics data. Replace _VRAM with this new data.
					draw._VRAM = new Uint8Array(data);
					draw.draws += 1;
					draw.drawVram();
				}
				else{ draw.skippedDraws += 1; }
			}
			
			else if(tests.isBlob){
				console.log("tests: isBlob:", tests);
			}

			// Catch-all.
			else{
				console.log("Unknown data for event.data.", event.data);
				return;
			}
		},
		el_close:function(ws, event){
			// console.log("Web WebSockets Client: CLOSE:", event); 
			buttons.DOM["ws_status"].innerText = "(CLOSED)";
			ws.close(); 
			setTimeout(function(){
				ws=null; 
			}, 1000);
			draw.fps.updateDisplay();
		},
		el_error:function(ws, event){
			console.log("Web WebSockets Client: ERROR:", event); 
			buttons.DOM["ws_status"].innerText = "(ERROR)";
			ws.close(); 
			setTimeout(function(){
				ws=null; 
			}, 1000);
			draw.fps.updateDisplay();
		},
	},

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
		websocket.wsCloseAll();

		// Create new. 
		let ws = new WebSocket(locUrl);
		ws.addEventListener('open'   , (event)=> websocket.ws_events.el_open   (ws, event) );
		ws.addEventListener('message', (event)=> websocket.ws_events.el_message(ws, event) );
		ws.addEventListener('close'  , (event)=> websocket.ws_events.el_close  (ws, event) );
		ws.addEventListener('error'  , (event)=> websocket.ws_events.el_error  (ws, event) );
		ws.binaryType = 'arraybuffer';
		websocket.activeWs = ws;

		// Add new to array of ws.
		websocket.wsArr.push(ws);
	},
};
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
	isDrawing:false,
	draws:0,
	skippedDraws:0,
	drawIndividualLayers: true,
	showIndividualLayers: function(){
		// draw.showIndividualLayers
		draw.DOM.vram_div_layers.classList.remove("hide");
	},
	hideIndividualLayers: function(){
		// draw.hideIndividualLayers
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
	drawVram: async function(){
		window.requestAnimationFrame(function(){
			draw.isDrawing=true;
			// let s = performance.now();
			// 4 output canvases total. 
			// The first 3 are the layers.
			// The last 1 is the combination of all 3 layers.
			draw.fps.tick();
			draw.fps.updateDisplay();

			let tileWidth = draw.configs.config.lcd.tileset.tileWidth;
			let tileHeight = draw.configs.config.lcd.tileset.tileHeight;
			let tilesInCol = draw.configs.config.lcd.tileset.tilesInCol;
			let x,y,tileId,tileImage,dx,dy;
				
			draw.clearAllCanvases();

			for(let index=0; index<draw.configs.coordsByIndex.length; index+=1){
				x = draw.configs.coordsByIndex[index][0];
				y = draw.configs.coordsByIndex[index][1];

				for(let v=0; v<tilesInCol; v+=1){
					// Get the tile id.
					tileId = draw._VRAM[(index*tilesInCol)+v];

					// Get the tile image from cache.
					tileImage = draw.tilesCache[tileId];

					// Determine destination x and y on the canvas.
					dx = x*tileWidth;
					dy = y*tileHeight;

					// Draw the correct canvas.
					if(draw.drawIndividualLayers){
						if     (v==0){ draw.canvases["vram_l1"] .drawImage(tileImage, dx, dy); }
						else if(v==1){ draw.canvases["vram_l2"] .drawImage(tileImage, dx, dy); }
						else if(v==2){ draw.canvases["vram_l3"] .drawImage(tileImage, dx, dy); }
					}

					// Always draw to the last canvas.
					draw.canvases["vram_all"].drawImage(tileImage, dx, dy);
				}
			}
			// let e = performance.now();

			// console.log((e-s).toFixed(3));

			draw.isDrawing=false;
			draw.DOM.info_lastDraw.innerText = new Date().getTime();
			draw.DOM.info_skippedDraws.innerText = draw.skippedDraws;
			draw.DOM.info_draws.innerText = draw.draws;
		});
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
			this._sample_   = []   ;
			this._index_    = 0    ;
			this._lastTick_ = false;
		},
		clearDisplay: function(){
			document.getElementById("info_fps").innerText = `0 f/s`;
		},
		updateDisplay: function(){
			document.getElementById("info_fps").innerText = `${draw.fps.average} f/s`;
		},
	},	
	OLDfps:{
		// draw.DOM.info_fps
		// draw.DOM.info_curFrame
		// draw.DOM.info_lastDraw
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
			draw._VRAM = await http.post("GET_VRAM", {});
			if(!draw.isDrawing){
				draw.draws += 1;
				draw.drawVram();
			}
			else{ draw.skippedDraws += 1; }
		}
	},	
};
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

		buttons.DOM["post_up"]              = document.getElementById("post_up");
		buttons.DOM["post_down"]            = document.getElementById("post_down");
		buttons.DOM["post_left"]            = document.getElementById("post_left");
		buttons.DOM["post_right"]           = document.getElementById("post_right");
		buttons.DOM["post_press"]           = document.getElementById("post_press");
		buttons.DOM["post_b1"]              = document.getElementById("post_b1");
		buttons.DOM["post_b2"]              = document.getElementById("post_b2");
		buttons.DOM["post_b3"]              = document.getElementById("post_b3");
		buttons.DOM["post_requestVramDraw"] = document.getElementById("post_requestVramDraw");

		// Add listeners for each button.
		// buttons.DOM["ws_status"];
		buttons.DOM["ws_connect"]   .addEventListener("click", ()=>{ websocket.initWss(); }, false);
		buttons.DOM["ws_disconnect"].addEventListener("click", ()=>{ websocket.wsCloseAll(); }, false);

		buttons.DOM["ws_up"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_UP_PIN");}, false);
		buttons.DOM["ws_down"] .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_DOWN_PIN");}, false);
		buttons.DOM["ws_left"] .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_LEFT_PIN");}, false);
		buttons.DOM["ws_right"].addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_RIGHT_PIN");}, false);
		buttons.DOM["ws_press"].addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY_PRESS_PIN");}, false);
		buttons.DOM["ws_b1"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY1_PIN");}, false);
		buttons.DOM["ws_b2"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY2_PIN");}, false);
		buttons.DOM["ws_b3"]   .addEventListener("click", ()=>{buttons.toggle_button("ws", "KEY3_PIN");}, false);
		buttons.DOM["ws_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('ws');}, false);

		buttons.DOM["post_up"]   .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY_UP_PIN");}, false);
		buttons.DOM["post_down"] .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY_DOWN_PIN");}, false);
		buttons.DOM["post_left"] .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY_LEFT_PIN");}, false);
		buttons.DOM["post_right"].addEventListener("click", ()=>{buttons.toggle_button("post", "KEY_RIGHT_PIN");}, false);
		buttons.DOM["post_press"].addEventListener("click", ()=>{buttons.toggle_button("post", "KEY_PRESS_PIN");}, false);
		buttons.DOM["post_b1"]   .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY1_PIN");}, false);
		buttons.DOM["post_b2"]   .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY2_PIN");}, false);
		buttons.DOM["post_b3"]   .addEventListener("click", ()=>{buttons.toggle_button("post", "KEY3_PIN");}, false);
		buttons.DOM["post_requestVramDraw"].addEventListener("click", ()=>{draw.getVram('post');}, false);
	},

	// REQUESTS
	toggle_button: function(type, buttonKey){
		console.log("toggle_button:", type, buttonKey);
		if(type=="ws"){
			if(websocket.activeWs){
				// websocket.activeWs.send(JSON.stringify({"mode":"GET_VRAM", "data":""}));
			}
		}
		else if(type=="post"){
			// draw._VRAM = await http.post("GET_VRAM", {});
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
	changeFps: function(ws, newFps){
		if(type=="ws"){
			if(websocket.activeWs){
				websocket.activeWs.send(JSON.stringify({"mode":"CHANGE_FPS", "data":parseInt(newFps,10)}));
			}
		}
		else if(type=="post"){
		}
	},
};

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
		draw.drawIndividualLayers = this.checked; 
		if(this.checked){ draw.showIndividualLayers(); }
		else{ draw.hideIndividualLayers(); }
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

	window.addEventListener("unload", function () {
		console.log("unload: Closing websockets.");
		websocket.wsCloseAll();
	});
	window.addEventListener("beforeunload", function () {
		console.log("beforeunload: Closing websockets.");
		websocket.wsCloseAll();
	});

	buttons.setup();
}