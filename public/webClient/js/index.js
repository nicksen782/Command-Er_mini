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
		},
		el_message:function(ws, event){
			let data;
			let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };

			// Is event.data populated?
			if(event.data == null){ return; }

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
				// Graphics data. Replace _VRAM with this new data.
				draw._VRAM = new Uint8Array(data);
				
				// Draw _VRAM again.
				draw.drawVram();
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
		},
		el_error:function(ws, event){
			console.log("Web WebSockets Client: ERROR:", event); 
			buttons.DOM["ws_status"].innerText = "(ERROR)";
			ws.close(); 
			setTimeout(function(){
				ws=null; 
			}, 1000);
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

		// Add new to array of ws.
		websocket.wsArr.push(ws);
	},
};

let draw = {
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
		// let s = performance.now();
		// 4 output canvases total. 
		// The first 3 are the layers.
		// The last 1 is the combination of all 3 layers.

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
				if     (v==0){ draw.canvases["vram_l1"] .drawImage(tileImage, dx, dy); }
				else if(v==1){ draw.canvases["vram_l2"] .drawImage(tileImage, dx, dy); }
				else if(v==2){ draw.canvases["vram_l3"] .drawImage(tileImage, dx, dy); }

				// Always draw to the last canvas.
				draw.canvases["vram_all"].drawImage(tileImage, dx, dy);
			}
		}
		// let e = performance.now();

		// console.log((e-s).toFixed(3));
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
		if(type=="ws"){
			// let ws = new WebSocket("ws://192.168.2.66:7777")
			// ws.send(JSON.stringify({mode:"GET_VRAM"}));
		}
		else if(type=="post"){
			draw._VRAM = await http.post("GET_VRAM", {});
			draw.drawVram();
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
			// let ws = new WebSocket("ws://192.168.2.66:7777")
			// ws.send(JSON.stringify({mode:"GET_VRAM"}));
		}
		else if(type=="post"){
			// draw._VRAM = await http.post("GET_VRAM", {});
			// draw.drawVram();
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

	buttons.setup();
}