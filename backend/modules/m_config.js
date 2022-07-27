const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	config_filename: "backend/config.json",
	config: {},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Get and store the config file. 
			await _MOD.get_config();

			// Add routes.
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

			resolve(_MOD.config);
		});
	},

};

module.exports = _MOD;