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
	
			// GET THE FIRST BATTERY UPDATE.
			_MOD.updateDisplay( JSON.parse( await _MOD.getData("python3 INA219.py") ) ) ;

			// Start the interval timer.
			_MOD.startInterval();

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// ADDS ROUTES FOR THIS MODULE.
	addRoutes: function(app, express){
	},

	// START THE BATTERY UPDATE TIMER.
	startInterval : async function(){
		if(_MOD.intervalId){ clearInterval(_MOD.intervalId); }
		_MOD.intervalId = setInterval(async function(){
			let batteryJson = JSON.parse( await _MOD.getData("python3 INA219.py") );
			_MOD.updateDisplay(batteryJson) ;
		}, 5000);
	},

	// REQUEST DATA FROM THE PYTHON SCRIPT.
	getData : async function(cmd){
		return new Promise(async function(resolve,reject){
			var cmd_cp = cp.execSync(cmd, [], { encoding : 'utf8' });
			resolve(cmd_cp.toString());
		});
	},

	// UPDATE THE DISPLAY WITH THE BATTERY PERCENTAGE.
	updateDisplay: function(json){
		// json['%'] = 99.0;
		
		let str = (json['%'].toFixed(1)+"%");
		let x=18*12; y=0*12;
		if(str.length <= 5){ x=19*12; }
		
		// Clear the line then the battery percentage.
		_APP.m_lcd.canvas.fillRect(18*12, 0*12, 12*6, 12*1, "#101010");
		_APP.m_lcd.canvas.print(str, x, y, 12);
	},
};

module.exports = _MOD;