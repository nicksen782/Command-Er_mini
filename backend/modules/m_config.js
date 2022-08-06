const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	config_filename: "backend/config.json",
	config: {},
	configLoaded: false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Get and store the config file. 
			if(!_MOD.configLoaded){
				_APP.consolelog("  get_config");
				await _MOD.get_config();
				_MOD.configLoaded = true;
			}

			// Add routes.
			_APP.consolelog("  addRoutes");
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		//
		_APP.addToRouteList({ path: "/get_config", method: "post", args: [], file: __filename, desc: "get_config" });
		app.post('/get_config'    ,express.json(), async (req, res) => {
			try{ 
				let result = await _MOD.get_config(); 
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});

	},

	get_config: async function(){
		return new Promise(async function(resolve,reject){
			// Read/Store the JSON. 
			_MOD.config = JSON.parse( fs.readFileSync(_MOD.config_filename, 'utf8') );

			// config.lcd: Add the missing values for n and s.
			let lcd = _MOD.config.lcd;
			for(let tkey in lcd.tilesets){
				let t = lcd.tilesets[tkey];
				let subkeys = ["n", "s"];
				for(let i=0; i<subkeys.length; i+=1){
					let sk = subkeys[i];
					t[sk]._cols       = Math.floor(lcd.width  / t[sk].tileWidth);
					t[sk]._rows       = Math.floor(lcd.height / t[sk].tileHeight);
					t[sk]._calcWidth  = t[sk]._cols * t[sk].tileWidth;
					t[sk]._calcHeight = t[sk]._rows * t[sk].tileHeight;
					t[sk]._resMatch   = (t[sk]._calcWidth == lcd.width) && (t[sk]._calcHeight == lcd.height)  ? true : false;
				};
			}

			resolve(_MOD.config);
		});
	},
	read_config: function(){
		return _MOD.config;
	},

};

module.exports = _MOD;