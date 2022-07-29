// GLOBALS

let lcd = {
	canvas: null,
	ctx   : null,
	ws:null,

	// WEBSOCKET OBJECT.
	WebSocket: {
		uuid: null,

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
		},

		// RUNS ON WEBSOCKET OPEN.
		onopen   : async function(e){
			// console.log(`onopen: readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}, binaryType: ${e.currentTarget.binaryType}`); 
			document.getElementById("div_container").classList.remove("disconnected");
			console.log("Connection: OPEN");
		},

		// RUNS ON WEBSOCKET CLOSE.
		onclose   : async function(e){ 
			// console.log(`onclose: statusCode: ${e.code}: ${lcd.WebSocket.statusCodes[e.code]}, readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}`); 
			lcd.ws.close();
			document.getElementById("div_container").classList.add("disconnected");
			console.log("Connection: CLOSED. Will try to reconnect.");
			setTimeout(function(){ lcd.WebSocket.tryToConnect("onclose"); }, 2000);
		},

		// RUNS ON WEBSOCKET ERROR.
		onerror  : async function(e){ 
			// console.log(`onerror: statusCode: ${e.code}: ${lcd.WebSocket.statusCodes[e.code]}, readyState: (${e.currentTarget.readyState}) ${lcd.WebSocket.readyStates[e.currentTarget.readyState]}`); 
			lcd.ws.close();
			document.getElementById("div_container").classList.add("disconnected");
			console.log("Connection: ERROR. Will try to reconnect.");
			setTimeout(function(){ lcd.WebSocket.tryToConnect("onerror"); }, 2000);
		},

		// UTILITY FUNCTION TO SEND DATA TO THE WEBSOCKET. 
		send: async function(obj){
			// Add the client UUID.
			obj.uuid = lcd.WebSocket.uuid;

			// Send the request.
			// console.log(obj);
			lcd.ws.send( JSON.stringify(obj) );
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
						setTimeout(function(){ lcd.WebSocket.tryToConnect("retry_ws") }, 1000); 
						return;
					}
					else{
						// console.log("connected:", lcd.ws.readyState);
					}
				}, 1000);
			}
			else{
				setTimeout(function(){ lcd.WebSocket.tryToConnect("retry_server_down") }, 1000); 
				return;
			}
		},

		// HANDLES WEBSOCKET MESSAGES SENT BY THE SERVER.
		onmessage: async function(e){ 
			// Is this JSON, text, or binary (arraybuffer/blob)?

			let data;
			let tests = { isJson: false, isText: false, isArrayBuffer: false, isBlob: false };

			// First, assume the data is JSON (verify this.)
			try{ data = JSON.parse(e.data); tests.isJson = true; }
			
			// Isn't JSON. Determine what type of data this is.
			catch(error){ 
				// ARRAYBUFFER
				if(e.data instanceof ArrayBuffer){
					data = e.data; 
					tests.isArrayBuffer = true; 
				}

				// BLOB
				else if(e.data instanceof Blob){
					data = e.data; 
					tests.isBlob = true; 
				}
				
				// TEXT
				else{
					data = e.data; 
					tests.isText = true; 
				}
			}

			if(tests.isJson){
				// console.log("JSON:", data);
				switch(data.mode){
					case "NEWCONNECTION"      : { 
						console.log(`CLIENT: ${data.mode}:`, data.msg); 
						lcd.WebSocket.uuid = data.msg;
						break; 
					}
					case "WELCOMEMESSAGE"     : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					// case "REQUEST_LCD_FRAMEBUFFER" : { break; }
					// case "REQUEST_LCD_FRAMEBUFFER_ALL" : { break; }
					case "REQUEST_UUID"       : { 
						console.log(`CLIENT: ${data.mode}:`, data.msg) ; 
						lcd.WebSocket.uuid = data.msg;
						break; 
					}
					case "REQUEST_LCD_CONFIG" : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					case "GET_CLIENT_IDS"     : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					case "ERROR"              : { console.log(`CLIENT: ${data.mode}:`, data.msg) ; break; }
					default: { console.log("CLIENT:", { "mode":"ERROR", msg:"UNKNOWN MODE: " + data.mode, data:data }); break; }
				}
			}
			else if(tests.isText){
				console.log("TEXT:", data);
			}
			else if(tests.isArrayBuffer){
				console.log("ARRAYBUFFER:", data);
				//
			}
			else if(tests.isBlob){
				// console.log("BLOB:", data);
				var img = new Image();
				img.onload = function(){
					URL.revokeObjectURL(img.src);
					lcd.ctx.drawImage(img, 0, 0);
				}
				img.src = URL.createObjectURL(data);
			}
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
		
		// GENERATE THE WEBSOCKET URL.
		let locUrl = `` +
			`${window.location.protocol == "https:" ? "wss" : "ws"}://` +
			`${location.hostname}` + 
			`${location.port ? ':'+location.port : ''}` +
			`${location.pathname != "/" ? ''+location.pathname : '/'}` +
			`LCD`
			;
			
		// MAKE THE WEBSOCKET CONNECTION AND STORE IT FOR LATER USE.
		console.log("Creating WebSocket connection to:", locUrl);
		lcd.ws = new WebSocket(locUrl);
		lcd.ws.onopen   = lcd.WebSocket.onopen;
		lcd.ws.onmessage= lcd.WebSocket.onmessage;
		lcd.ws.onclose  = lcd.WebSocket.onclose;
		lcd.ws.onerror  = lcd.WebSocket.onerror;
		// lcd.WebSocket.binaryType = 'arraybuffer';
		lcd.ws.binaryType = 'blob';
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
		fetch("pingfff")
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
window.onload = function(){
	window.onload = null;

	// BUTTONS: INPUT: Event listeners.
	document.getElementById("KEY_UP_PIN")   .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY_UP_PIN"}   ), false);
	document.getElementById("KEY_DOWN_PIN") .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY_DOWN_PIN"} ), false);
	document.getElementById("KEY_LEFT_PIN") .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY_LEFT_PIN"} ), false);
	document.getElementById("KEY_RIGHT_PIN").addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY_RIGHT_PIN"}), false);
	document.getElementById("KEY_PRESS_PIN").addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY_PRESS_PIN"}), false);
	document.getElementById("KEY1_PIN")     .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY1_PIN"}     ), false);
	document.getElementById("KEY2_PIN")     .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY2_PIN"}     ), false);
	document.getElementById("KEY3_PIN")     .addEventListener("click", ()=>post('pressAndRelease_button', {button:"KEY3_PIN"}     ), false);
	
	// BUTTONS: OUTPUT: Event listeners.
	document.getElementById("BL_PIN")       .addEventListener("click", ()=>post('toggle_pin'            , {button:"BL_PIN"}       ), false);
	
	// BUTTONS: DEBUG
	document.getElementById("DEBUG_01")       .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_FRAMEBUFFER"}); }, false);
	document.getElementById("DEBUG_02")       .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_FRAMEBUFFER_ALL"}); }, false);
	document.getElementById("DEBUG_03")       .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_LCD_CONFIG"}); }, false);
	document.getElementById("DEBUG_04")       .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"REQUEST_UUID"}); }, false);
	document.getElementById("DEBUG_05")       .addEventListener("click", ()=>{ lcd.WebSocket.send({mode:"GET_CLIENT_IDS"}); }, false);
	
	// CANVAS
	lcd.canvas = document.getElementById("CANVAS1");
	lcd.ctx    = lcd.canvas.getContext("2d");

	// "LCD" / WEBSOCKET
	lcd.WebSocket.tryToConnect("init");
	// lcd.init();
};