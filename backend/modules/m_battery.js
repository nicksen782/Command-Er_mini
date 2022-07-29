var cp = require('child_process');

let _APP = null;

let _MOD = {
	// INTERVAL TIMER
	intervalId : null,

	// INIT THIS MODULE.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// ADDS ROUTES FOR THIS MODULE.
	addRoutes: function(app, express){
	},

	// UPDATE THE DISPLAY WITH THE BATTERY PERCENTAGE.
	prevBattStr : "",
	func: function(){
		return new Promise(function(resolve,reject){
			// REQUEST DATA FROM THE PYTHON SCRIPT.
			cp.exec(
				"python3 INA219.py", [],
				function(error, stdout, stderr) {
					if (error) { console.log("BATTERY ERROR", error, stderr); }

					let json = JSON.parse(stdout.toString());
					
					// console.log(json);
					// json['%'] = 25.0;
					// json['%'] = 50.0;
					// json['%'] = 75.0;
					// json['%'] = 100.0;
		
					// CREATE THE STRING. 
					let str = (json['%'].toFixed(1)+"%").padStart(6, " ");
					if(str == _MOD.prevBattStr){ resolve(); return; }
		
					// DETERMINE WHICH BATTERY ICON TO DISPLAY.
					let batIcon;
					if     (json['%'] <=25){ batIcon = "batt1"; } // RED
					else if(json['%'] <=50){ batIcon = "batt2"; } // ORANGE
					else if(json['%'] <=80){ batIcon = "batt3"; } // YELLOW
					else { batIcon = "batt4"; } // GREEN
					
					// CLEAR THE LINE AND THEN DISPLAY THE ICON AND THE STRING. 
					let x=17; y=24;
					_APP.m_lcd.canvas.fillTile("tile1"  , x, y, str.length + 1, 1); 
					_APP.m_lcd.canvas.setTile(batIcon  , x, y); 
					if(Math.sign(json['A']) == 1){
						_APP.m_lcd.canvas.setTile("battcharge"  , x, y); 
					}
					_APP.m_lcd.canvas.print(str, x+1, y);
					resolve();
				}
			)
		});
	},
};

module.exports = _MOD;