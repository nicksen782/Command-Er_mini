// GLOBALS

let lcd = {
	tileCache: [
	],

	// HARDCODED - TODO FIX
	_tiles_ids:[],
	_tiles_keys:{},
	_byIndex:{},
	_byCoord:[],

	tileCoords:{},
	populateTileCache: function(){
		let tileWidth  = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileWidth;
		let tileHeight = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileHeight;
		let width  = lcd.lcdconfig.width;
		let height = lcd.lcdconfig.height;
		let canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		let ctx = canvas.getContext("2d");

		let tilesetFile = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].file;
		// let tilesetImage = await fetch(tilesetFile)
		let tilesetImage = new Image();

		tilesetImage.onload = function(){
			tilesetImage.onload = null;
			ctx.drawImage(tilesetImage, 0, 0);

			// console.log(tilesetImage, tilesetImage.width, tilesetImage.height);
			for(let key in lcd.tileCoords){
				let canvas2 = document.createElement("canvas");
				canvas2.classList.add("tileCanvas");
				canvas2.width = tileWidth;
				canvas2.height = tileHeight;
				let ctx2 = canvas2.getContext("2d");
				ctx2.drawImage(
					// canvas, 
					tilesetImage, 
					lcd.tileCoords[key.toString()].L * tileWidth, 
					lcd.tileCoords[key.toString()].T * tileHeight,
					tileWidth,
					tileHeight,
					0,
					0,
					tileWidth,
					tileHeight
				);
				lcd.tileCache.push(canvas2);
			}
		};

		tilesetImage.src = tilesetFile;
	},
	createVramTable : function(){
		// lcd.lcdconfig
		let _cols      = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s._cols;
		let _rows      = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s._rows;
		let tileWidth  = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileWidth;
		let tileHeight = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileHeight;

		let table = document.createElement("table");
		table.id = "vramtable";
		let thead = document.createElement("thead");
		let tbody = document.createElement("tbody");
		let caption = document.createElement("caption");
		caption.innerText = "VRAM VIEWER";
		
		let span = document.createElement("span");
		span.id="fps2";
		span.innerText=" (FPS: 0)";

		let span2 = document.createElement("span");
		span2.id="fps2_curFrame";
		span2.innerText="";

		caption.append(span,span2);

		table.append(caption, thead, tbody);
		for(let y=0; y<_rows; y+=1){
			let tr = tbody.insertRow(-1);
			for(let x=0; x<_cols; x+=1){
				let td = tr.insertCell(-1);
				td.classList.add("vram_smallfont")
				td.setAttribute("y", y);
				td.setAttribute("x", x);
				td.setAttribute("coord", `${y}_${x}`);
				td.setAttribute("title", `coord:${y}_${x}, y:${y}, x:${x}`);
				for(let v=0; v<3; v+=1){
					let canvas2 = document.createElement("canvas");
					canvas2.classList.add("tileCanvas");
					canvas2.width = tileWidth;
					canvas2.height = tileHeight;
					td.append(canvas2)
				}
			}
		}
		let debugOutput_VRAM = document.getElementById("debugOutput_VRAM");
		debugOutput_VRAM.innerHTML = "";
		debugOutput_VRAM.append(table);

	},
	populateVramTable: function(vram, curFrame){
		if(lcd.currentlyDrawing2){console.log("skip");return;}
		lcd.currentlyDrawing2 = true;
		let _cols      = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s._cols;
		let _rows      = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s._rows;
		let tileWidth  = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileWidth;
		let tileHeight = lcd.lcdconfig.tilesets[lcd.lcdconfig.activeTileset].s.tileHeight;
		
		lcd.fps2.tick();

		for(let index=0; index<vram.length; index+=3){
			let x = lcd._byIndex[index][0];
			let y = lcd._byIndex[index][1];
			// console.log(index, lcd._byIndex[index]);

			let td = document.querySelector(`[coord="${y}_${x}"]`);
			// td.innerHTML = "";

			let canvases = td.querySelectorAll("canvas");
			// console.log(canvases);
			for(let v=0; v<3; v+=1){
				let canvas = canvases[v];
				let ctx = canvas.getContext("2d");

				// Hide all but the top layer.
				if(v!=2) {
					canvas.style.display="none";
					continue;
				}

				ctx.clearRect(0,0, canvas.width,canvas.height);
				let tileId = vram[index+v];
				try{
					ctx.drawImage(lcd.tileCache[tileId], 0, 0);
				}
				catch(e){
					// console.log(e);
				}
			}
		}

		lcd.fps2.updateDisplay(curFrame);
		lcd.currentlyDrawing2 = false;
	},
	canvas: null,
	ctx   : null,
	ws:null,
	currentlyDrawing: false,
	currentlyDrawing2: false, // VRAM UPDATES
	
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
			document.getElementById("fps").innerText = `(FPS: 0)`;
		},
		updateDisplay: function(){
			document.getElementById("fps").innerText = `(FPS: ${lcd.fps.average})`;
		},
	},	
	
	// Calculates the average frames per second.
	fps2 : {
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
			document.getElementById("fps2").innerText = ` (FPS: 0)`;
			document.getElementById("fps2_curFrame").innerText = ``;
		},
		updateDisplay: function(curFrame){
			document.getElementById("fps2").innerText = ` (FPS: ${lcd.fps2.average})`;
			document.getElementById("fps2_curFrame").innerText = ` (${curFrame}) `;
		},
	},	

	// WEBSOCKET OBJECT.
	WebSocket: {
		uuid: null,
		autoReconnectWs: true,
		tryingToConnect: false,

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

		// RUNS ON WEBSOCKET OPEN.
		onopen   : async function(e){
			// console.log(`onopen: readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}, binaryType: ${e.currentTarget.binaryType}`); 
			document.getElementById("container1").classList.remove("disconnected");
			document.getElementById("debugControls").classList.remove("disconnected");
			document.getElementById("debugOutput").classList.remove("disconnected");
			console.log("Connection: OPEN");
			lcd.WebSocket.tryingToConnect = false;
		},

		// RUNS ON WEBSOCKET CLOSE.
		onclose   : async function(e){ 
			lcd.fps.clearDisplay();
			// console.log(`onclose: statusCode: ${e.code}: ${lcd.WebSocket.statusCodes[e.code]}, readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}`); 
			// lcd.ws.close();
			document.getElementById("container1").classList.add("disconnected");
			document.getElementById("debugControls").classList.add("disconnected");
			document.getElementById("debugOutput").classList.add("disconnected");
			if(lcd.WebSocket.autoReconnectWs){
				console.log("Connection: CLOSED. Will try to reconnect.");
				// lcd.WebSocket.tryingToConnect = true;
				setTimeout(function(){ lcd.WebSocket.tryToConnect("onclose"); }, 2000);
			}
			else{
				lcd.WebSocket.tryingToConnect = false;
				console.log("Connection: CLOSED. Will NOT try to reconnect.");
			}
		},

		// RUNS ON WEBSOCKET ERROR.
		onerror  : async function(e){ 
			lcd.fps.clearDisplay();
			// console.log(`onerror: statusCode: ${e.code}: ${lcd.WebSocket.statusCodes[e.code]}, readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}`); 
			// lcd.ws.close();
			document.getElementById("container1").classList.add("disconnected");
			document.getElementById("debugControls").classList.add("disconnected");
			document.getElementById("debugOutput").classList.add("disconnected");
			if(lcd.WebSocket.autoReconnectWs){
				console.log("Connection: ERROR. Will try to reconnect.");
				// lcd.WebSocket.tryingToConnect = true;
				setTimeout(function(){ lcd.WebSocket.tryToConnect("onerror"); }, 2000);
			}
			else{
				console.log("Connection: CLOSED. Will NOT try to reconnect.");
				lcd.WebSocket.tryingToConnect = false;
			}
		},

		// UTILITY FUNCTION TO SEND DATA TO THE WEBSOCKET. 
		send: async function(obj){
			if(lcd.ws){ 
				// Add the client UUID.
				obj.uuid = lcd.WebSocket.uuid;

				// Send the request.
				lcd.ws.send( JSON.stringify(obj) );
			}
			else{
				console.log("WS connection not found.");
			}
		},

		// connecting : false,
		tryToConnect: async function(origin){
			// console.log("tryToConnect:", origin);
			let up = await isServerUp();
			if( up ){
				// Run the websocket init.
				lcd.init(); 
				
				// Check if the connection is made, otherwise try again.
				setTimeout(function(){
					// Is the readyState not CONNECTING or OPEN?
					let validReadyState = [0,1].indexOf(lcd.ws.readyState) != -1 ? true : false;
					
					// console.log("Checking readyState.", `readyState: (${lcd.ws.readyState}) ${lcd.WebSocket.readyStates[lcd.ws.readyState]}`, `TEST: ${lcd.WebSocket.readyStates[lcd.ws.readyState]}`);
					
					if(!validReadyState){
						if(lcd.WebSocket.autoReconnectWs){
							setTimeout(function(){ lcd.WebSocket.tryToConnect("retry_ws") }, 1000); 
						}
						return;
					}
					else{
						// console.log("connected:", lcd.ws.readyState);
					}
				}, 1000);
			}
			else{
				if(lcd.WebSocket.autoReconnectWs){
					setTimeout(function(){ lcd.WebSocket.tryToConnect("retry_server_down") }, 1000); 
				}
				return;
			}
		},

		// HANDLES WEBSOCKET MESSAGES SENT BY THE SERVER.
		onmessage: async function(e){ 
			// Is this JSON, text, or binary (arraybuffer/blob)?

			let data;
			let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };

			// Check if the data is JSON by trying to parse it.
			try{ data = JSON.parse(e.data); tests.isJson = true; }
			
			// It isn't JSON. Determine what type of data this is.
			catch(error){ 
				// Get the data.
				data = e.data;

				// ARRAYBUFFER
				if(e.data instanceof ArrayBuffer){ tests.isArrayBuffer = true; }

				// BLOB
				else if(e.data instanceof Blob){ tests.isBlob = true; }
				
				// TEXT
				else{ tests.isText = true; 
				}
			}
			
			// DEBUG
			// if(tests.isJson)       { console.log("ISJSON"); }
			// if(tests.isText)       { console.log("ISTEXT"); }
			// if(tests.isArrayBuffer){ console.log("ISARRAYBUFFER"); }
			// if(tests.isBlob)       { console.log("ISBLOB"); }

			if(tests.isJson){
				// console.log("JSON:", data);
				switch(data.mode){
					case "NEWCONNECTION"      : { 
						console.log(`CLIENT: ${data.mode}:`, data.msg); 
						lcd.WebSocket.uuid = data.msg;
						break; 
					}
					case "WELCOMEMESSAGE"          : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					case "REQUEST_UUID"            : { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						// lcd.WebSocket.uuid = data.msg;

						let json = data.msg;

						// Get DOM handles. 
						let debugOutput = document.getElementById("debugOutput");
						let caption     = debugOutput.querySelector("caption");
						let output      = debugOutput.querySelector("textarea");

						// Dim the output text area.
						output.style.opacity = 0.25;

						// Change caption.
						caption.innerText = "OUTPUT: (REQUEST_UUID)";

						// Display the output text.
						output.value = json;

						// Undim the output text area.
						output.style.opacity = 1.0;

						break; 
					}
					case "REQUEST_LCD_CONFIG"      : { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						let json = data.msg;

						// Get DOM handles. 
						let debugOutput = document.getElementById("debugOutput");
						let caption     = debugOutput.querySelector("caption");
						let output      = debugOutput.querySelector("textarea");

						// Dim the output text area.
						output.style.opacity = 0.25;

						// Change caption.
						caption.innerText = "OUTPUT: (REQUEST_LCD_CONFIG)";

						// Display the output text.
						output.value = JSON.stringify(json,null,1);

						// Undim the output text area.
						output.style.opacity = 1.0;
						break; 
					}
					case "GET_CLIENT_IDS"          : { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						
						let json = data.msg;

						// Get DOM handles. 
						let debugOutput = document.getElementById("debugOutput");
						let caption     = debugOutput.querySelector("caption");
						let output      = debugOutput.querySelector("textarea");

						// Dim the output text area.
						output.style.opacity = 0.25;

						// Change caption.
						caption.innerText = "OUTPUT: (GET_CLIENT_IDS)";

						// Display the output text.
						output.value = JSON.stringify(json,null,1);
						
						// Undim the output text area.
						output.style.opacity = 1.0;

						break; 
					}
					case "SVG"                     : { 
						if( ! lcd.WebSocket.tryToDraw() ) { return; }

						console.log(`CLIENT: ${data.mode}:`, data.svg) ; 
						var img = new Image();
						img.onload = function(){
							URL.revokeObjectURL(img.src);
							lcd.ctx.drawImage(img, 0, 0);
							lcd.WebSocket.itIsNotDrawing();
						}
						let blob = new Blob([data.svg], {type: 'image/svg+xml'});
						img.src = URL.createObjectURL(blob);
						break;
					}
					case "DATAURL"                 : { 
						if( ! lcd.WebSocket.tryToDraw() ) { return; }
						
						// console.log(`CLIENT: ${data.mode}:`, data.dataurl) ; 
						var img = new Image();
						img.onload = function(){
							lcd.ctx.drawImage(img, 0, 0);
							lcd.WebSocket.itIsNotDrawing();
						}
						img.src = data.dataurl;
						break;
					}
					case "PRESS_AND_RELEASE_BUTTON": { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						break; 
					}
					case "TOGGLE_PIN": { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						break; 
					}
					case "GET_VRAM": { 
						// console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						// let s = performance.now();
						// Usually 80ms and up to 135ms commonly.
						lcd.populateVramTable(data.msg, data.curFrame);
						let e = performance.now();
						// console.log(s-e);
						break; 
					}
					case "ERROR"              : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					default: { console.log("CLIENT:", { "mode":"ERROR", msg:"UNKNOWN MODE: " + data.mode, data:data }); break; }
				}
			}
			else if(tests.isText){
				console.log("TEXT:", data);
			}
			else if(tests.isArrayBuffer){
				if( ! lcd.WebSocket.tryToDraw() ) { return; }
				// console.log("REQ");
				// lcd.WebSocket.send({ "mode":"GET_VRAM", data:"" });

				// Is this SVG?
				let view8 = new Uint8Array(data);
				let header = Array.prototype.slice.call(view8, 0, 14).toString();
				if (header == "60,63,120,109,108,32,118,101,114,115,105,111,110,61") { // <?xml version=
					var img = new Image();
					img.onload = function(){
						URL.revokeObjectURL(o_url);
						lcd.ctx.clearRect(0,0, lcd.canvas.width, lcd.canvas.height);
						lcd.ctx.drawImage(img, 0, 0, lcd.lcdconfig.width, lcd.lcdconfig.height);
						lcd.WebSocket.itIsNotDrawing();
					}
					let blob = new Blob([data], {type: 'image/svg+xml'});
					let o_url = URL.createObjectURL(blob);
					img.src = o_url;
				}

				// Assume that this is raw ABGR data.
				else{
					// Create pixel data.
					let pixels = new Uint8ClampedArray(data);
					for(let i=0; i<pixels.length; i+=4){
						// Swap some values.
						let r = pixels[i+2];
						let g = pixels[i+1];
						let b = pixels[i+0];
						let a = pixels[i+3];

						// Write those pixels.
						pixels[i+0] = r;
						pixels[i+1] = g;
						pixels[i+2] = b;
						pixels[i+3] = a;
					}

					let imageData;
					try{ 
						imageData = new ImageData(pixels, lcd.lcdconfig.width, lcd.lcdconfig.height); 
						lcd.ctx.putImageData(imageData, 0, 0);
						lcd.WebSocket.itIsNotDrawing();
					}
					catch(e){
						console.log("DRAW FAILED:", e);
						lcd.WebSocket.itIsNotDrawing();
					}
				}
			}
			else if(tests.isBlob){
				if( ! lcd.WebSocket.tryToDraw() ) { return; }
				
				// console.log("BLOB:", data);
				var img = new Image();
				img.onload = function(){
					URL.revokeObjectURL(img.src);
					lcd.ctx.drawImage(img, 0, 0);
					lcd.WebSocket.itIsNotDrawing();
				}
				img.src = URL.createObjectURL(data);
			}
		},
		tryToDraw: function(){
			if(lcd.currentlyDrawing) { 
				console.log("You can NOT draw now."); 
				return false; 
			};
			lcd.currentlyDrawing = true;
			lcd.fps.tick();
			return true;
		},
		itIsNotDrawing: function(){
			// console.log("You can draw now.");
			lcd.currentlyDrawing = false;

			lcd.fps.updateDisplay();
		},
	},

	// INITS THE WEBSOCKET.
	init: async function(){
		// CLOSE PREVIOUS CONNECTION IF ONE IS ALREADY OPENED.
		if(lcd.ws){ 
			lcd.ws.close(); 
			await new Promise(function(res,rej){
				setTimeout(function(){ lcd.ws = null; res(); }, 1000);
			});
		}
		// if(lcd.WebSocket.tryingToConnect){ console.log("Already trying to connect."); return; }
		// lcd.WebSocket.tryingToConnect = true;
		
		// GENERATE THE WEBSOCKET URL.
		let locUrl = `` +
			`${window.location.protocol == "https:" ? "wss" : "ws"}://` +
			`${location.hostname}` + 
			`${location.port ? ':'+location.port : ''}` +
			`${location.pathname != "/" ? ''+location.pathname : '/'}` +
			`LCD`
			;
			
		// MAKE THE WEBSOCKET CONNECTION AND STORE IT FOR LATER USE.
		lcd.WebSocket.itIsNotDrawing();
		lcd.fps.init();
		lcd.fps.updateDisplay();
		
		console.log("Creating WebSocket connection to:", locUrl);
		lcd.ws = new WebSocket(locUrl);
		lcd.ws.onopen   = lcd.WebSocket.onopen;
		lcd.ws.onmessage= lcd.WebSocket.onmessage;
		lcd.ws.onclose  = lcd.WebSocket.onclose;
		lcd.ws.onerror  = lcd.WebSocket.onerror;
		lcd.ws.binaryType = 'arraybuffer';
		// lcd.ws.binaryType = 'blob';
	},
};

// SIMPLE WRAPPER FOR FETCH POST.
async function post(url, body){
	let resp = await( await fetch(url, {
		method: 'POST', headers: { Accept: 'application.json', 'Content-Type': 'application/json'  },
		body: JSON.stringify(body)
	}) ).json();
	// console.log(resp);
	return resp;
}

async function isServerUp(){
	return new Promise(async function(resolve,reject){
		fetch("ping")
		.then(r=>{ resolve(true); })
		.catch(err=>{ resolve(false); })
	});
};

function canvasTest(){
	c = document.getElementById("CANVAS1");
	let start = performance.now();
	let img = c.getContext('2d').getImageData(0,0, c.width, c.height);
	let end = performance.now();
	console.log(end-start, img);	
}

// INIT.
window.onload = async function(){
	window.onload = null;

	// Set the auto reconnect value. 
	let autoReconnectWs = document.getElementById("autoReconnectWs")
	autoReconnectWs.checked=true;
	autoReconnectWs.addEventListener("change", function(){ 
		lcd.WebSocket.autoReconnectWs = this.checked;
	});

	// Get the lcdconfig.
	await (async function(){
		return new Promise(async function(resolve,reject){
			let tmp = await post('REQUEST_LCD_CONFIG', {});
			lcd.lcdconfig   = tmp.lcd;
			lcd._tiles_ids  = tmp._tiles_ids;
			lcd._tiles_keys = tmp._tiles_keys;
			lcd._byCoord    = tmp._byCoord;
			lcd._byIndex    = tmp._byIndex;
			
			// CANVAS - size according to the lcdconfig.
			lcd.canvas = document.getElementById("CANVAS1");
			lcd.canvas.width = lcd.lcdconfig.width;
			lcd.canvas.height = lcd.lcdconfig.height;
			lcd.ctx = lcd.canvas.getContext("2d");

			let tileCoords = await (await fetch("tile_coords.json")).text();
			// lcd.tileCoords = tileCoords;
			// console.log(tileCoords);
			// console.log(JSON.parse(tileCoords));
			// lcd.tileCoords = JSON.parse(tileCoords);
			// lcd.tileCoords = 
			tileCoords = await (await fetch("tile_coords.json")).json();
			lcd.tileCoords = tileCoords;
			// console.log(tileCoords);

			resolve();
		});
	})()

	// BUTTONS: INPUT: Event listeners.
	document.getElementById("KEY_UP_PIN")   .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY_UP_PIN"}   ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY_UP_PIN" });
	}, false);

	document.getElementById("KEY_DOWN_PIN") .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY_DOWN_PIN"} ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY_DOWN_PIN" });
	}, false);

	document.getElementById("KEY_LEFT_PIN") .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY_LEFT_PIN"} ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY_LEFT_PIN" });
	}, false);

	document.getElementById("KEY_RIGHT_PIN").addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY_RIGHT_PIN"}) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY_RIGHT_PIN" });
	}, false);

	document.getElementById("KEY_PRESS_PIN").addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY_PRESS_PIN"}) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY_PRESS_PIN" });
	}, false);

	document.getElementById("KEY1_PIN")     .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY1_PIN"}     ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY1_PIN" });
	}, false);

	document.getElementById("KEY2_PIN")     .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY2_PIN"}     ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY2_PIN" });
	}, false);

	document.getElementById("KEY3_PIN")     .addEventListener("click", ()=>{ 
		// post('pressAndRelease_button', {button:"KEY3_PIN"}     ) ;
		lcd.WebSocket.send({ "mode":"PRESS_AND_RELEASE_BUTTON", button:"KEY3_PIN" });
	}, false);
	
	// BUTTONS: OUTPUT: Event listeners.
	document.getElementById("BL_PIN")       .addEventListener("click", ()=>{ 
		// post('toggle_pin'            , {button:"BL_PIN"}       ); 
		lcd.WebSocket.send({ "mode":"TOGGLE_PIN", button:"BL_PIN" });
	}, false);
	
	// BUTTONS: DEBUG
	document.getElementById("DEBUG_01")            .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_FRAMEBUFFER"}); }, false);
	document.getElementById("DEBUG_02")            .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_FRAMEBUFFER_ALL"}); }, false);
	document.getElementById("DEBUG_03")            .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_CONFIG"}); }, false);
	document.getElementById("DEBUG_04")            .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_UUID"}); }, false);
	document.getElementById("DEBUG_05")            .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"GET_CLIENT_IDS"}); }, false);
	document.getElementById("requestTimingsButton").addEventListener("click", async ()=>{ 
		// Get DOM handles. 
		let debugOutput = document.getElementById("debugOutput");
		let caption     = debugOutput.querySelector("caption");
		let output      = debugOutput.querySelector("textarea");
		
		// Dim the output text area.
		output.style.opacity = 0.25;

		// Request the data.
		let json        = await post('REQUEST_TIMINGS', {});

		// Change caption.
		caption.innerText = "OUTPUT: (REQUEST_TIMINGS)";

		// Generate the output text. 
		let text = "";
		let pad = 0;
		for(let index in json){ let key = Object.keys(json[index])[0]; if(pad < key.length){ pad = key.length; } }
		for(let index in json){ 
			// There should only be one key with one value per record.
			let key = Object.keys(json[index])[0];
			let value = json[index][key];
			text += `${key.padEnd(pad, " ")}: ${value.toFixed(3).padStart(9, " ")}\n`;
		}

		// Display the output text.
		output.value = text;

		// Undim the output text area.
		output.style.opacity = 1.0;
	}, false);

	document.getElementById("debugOutput_VRAM").addEventListener("click", async ()=>{ 
		// lcd.WebSocket.send({ "mode":"GET_VRAM", data:"" });
	}, false);

	// WEBSOCKET CONNECTIONS.
	document.getElementById("ws_open")        .addEventListener("click", ()=>{ lcd.WebSocket.tryToConnect("ws_open"); }, false);
	document.getElementById("ws_close")       .addEventListener("click", async function(){ 
		if(lcd.ws){ 
			autoReconnectWs.checked = false;
			lcd.WebSocket.autoReconnectWs = false;
			console.log("Closing WS connection...");
			lcd.ws.close(); 
			await new Promise(function(res,rej){
				setTimeout(function(){ lcd.ws = null; res(); }, 1000);
			});
		}
		else{
			console.log("WS connection not found.");
		}
	}, false);
	
	// "LCD" / WEBSOCKET
	// if(lcd.WebSocket.autoReconnectWs){
		// lcd.WebSocket.tryToConnect("init");
	// }
	// lcd.init();
	
	// VRAM DEBUG:
	lcd.populateTileCache();
	lcd.createVramTable();
};