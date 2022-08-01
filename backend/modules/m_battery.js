var cp = require('child_process');
const fetch = require('node-fetch');

let _APP = null;

let _MOD = {
	// INTERVAL TIMER
	intervalId : null,
	cp_child   : null,
	URL        : "http://127.0.0.1",
	PORT       : "7778",

	// INIT THIS MODULE.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			// Remove the battery server if it is running. 
			await _MOD.stopServer();

			// Start the battery server.
			_MOD.startServer();

			// Wait until the battery server is online (max 10 seconds.)
			await _MOD.pingServer();
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
			// Save the value for the current screen.
			let currentScreen = _APP.currentScreen;
			
			// Fetch the data.
			let json;
			try{ json = await fetch(`${_MOD.URL}:${_MOD.PORT}/getData`); }
			catch(e){ console.log("ERROR: Battery Server:", e.code); resolve(); return; }
			json = await json.json(); 

			// Make sure that we are still on the same screen before continuing. 
			if(_APP.currentScreen != currentScreen){ resolve(); return; }

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
			// console.log(str);
			resolve();

		});
	},
	startServer: function(){
		_MOD.cp_child = cp.exec(`python3 ${process.cwd()}/INA219_srv.py`, { shell:"/bin/bash", cwd: `${process.cwd()}`, detatched: false }, function(){});
	},
	stopServer: async function(){
		let resp = cp.execSync( `yes yes| ~/.local/bin/freeport ${_MOD.PORT}`, [], { shell:"bash" } );
		// console.log("stopServer:", resp.toString());
	},
	pingServer: async function(){
		// Ping up to 10 times with 1000ms between pings. (10 seconds max.)
		for(let i=0; i<10; i+=1){
			let resp;
			try{ resp = await fetch(`${_MOD.URL}:${_MOD.PORT}/ping`); }
			catch(e){ 
				// console.log(i, "batt ping fail:", e.code, resp); 
				await new Promise(function(res,rej){ setTimeout(function(){ res(); }, 1000); });
				continue;
			}

			resp = await resp.text(); 
			if(resp=="PONG"){ 
				console.log(`Tries: ${i}. Battery Server: ONLINE:`, resp);
				return true;
				break; 
			}
		}
		return false;
	},
};

module.exports = _MOD;