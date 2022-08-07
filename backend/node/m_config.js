const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	// File names:
	config_filename           : "public/shared/config.json",
	coordsByIndex_filename    : "public/shared/coordsByIndex.json",
	indexByCoords_filename    : "public/shared/indexByCoords.json",
	tileCoords_filename       : "public/shared/tileCoords.json",
	tileIdsByTilename_filename: "public/shared/tileIdsByTilename.json",
	tilenamesByIndex_filename : "public/shared/tilenamesByIndex.json",
	
	// Data"
	config            : {},
	coordsByIndex     : {},
	indexByCoords     : {},
	tileCoords        : {},
	tileIdsByTilename : {},
	tilenamesByIndex  : {},

	configLoaded: false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Get and store the config file. 
			_APP.consolelog("  get_config");
			if(!_MOD.configLoaded){
				await _MOD.get_configs();
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
		_APP.addToRouteList({ path: "/get_configs", method: "post", args: [], file: __filename, desc: "get_config" });
		app.post('/get_configs'    ,express.json(), async (req, res) => {
			try{ 
				let result = {
					config           : _MOD.config,
					coordsByIndex    : _MOD.coordsByIndex,
					indexByCoords    : _MOD.indexByCoords,
					tileCoords       : _MOD.tileCoords,
					tileIdsByTilename: _MOD.tileIdsByTilename,
					tilenamesByIndex : _MOD.tilenamesByIndex,
				};
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});

	},

	get_configs: async function(){
		return new Promise(async function(resolve,reject){
			// Read/Store the JSON. 
			_MOD.config            = JSON.parse( fs.readFileSync(_MOD.config_filename,            'utf8') );
			_MOD.coordsByIndex     = JSON.parse( fs.readFileSync(_MOD.coordsByIndex_filename,     'utf8') );
			_MOD.indexByCoords     = JSON.parse( fs.readFileSync(_MOD.indexByCoords_filename,     'utf8') );
			_MOD.tileCoords        = JSON.parse( fs.readFileSync(_MOD.tileCoords_filename,        'utf8') );
			_MOD.tileIdsByTilename = JSON.parse( fs.readFileSync(_MOD.tileIdsByTilename_filename, 'utf8') );
			_MOD.tilenamesByIndex  = JSON.parse( fs.readFileSync(_MOD.tilenamesByIndex_filename,  'utf8') );

			resolve();
		});
	},

};

module.exports = _MOD;