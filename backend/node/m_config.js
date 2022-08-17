const fs = require('fs');
const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// File names:
	config_filename           : "public/shared/config.json",
	coordsByIndex_filename    : "public/shared/coordsByIndex.json",
	indexByCoords_filename    : "public/shared/indexByCoords.json",
	tileCoords_filename       : "public/shared/tileCoords.json",
	tileIdsByTilename_filename: "public/shared/tileIdsByTilename.json",
	tilenamesByIndex_filename : "public/shared/tilenamesByIndex.json",
	remoteConf_filename       : "backend/remoteConf.json",
	
	// Data"
	config            : {},
	coordsByIndex     : {}, // UNUSED
	indexByCoords     : {}, // m_draw (_updateVramTile_flat)
	tileCoords        : {}, // m_canvas (generateTileCaches)
	tileIdsByTilename : {}, // m_draw (_initVram, _updateVramTile_flat)
	tilenamesByIndex  : {}, // m_draw (setTile)
	remoteConf        : [],

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				// Get and store the config file. (check if it is populated.)
				if(!_MOD.config.node){ await _MOD.get_configs(); }
				_APP.consolelog("got_config", 2);
				
				// Add routes.
				_APP.consolelog("addRoutes", 2);
				_MOD.addRoutes(_APP.app, _APP.express);

				// Set the moduleLoaded flag.
				_MOD.moduleLoaded = true;
			}
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
					subscriptionKeys : _APP.m_websocket_node.subscriptionKeys,
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
			if(fs.existsSync(_MOD.remoteConf_filename)){
				_MOD.remoteConf        = JSON.parse( fs.readFileSync(_MOD.remoteConf_filename,        'utf8') );
			}
			else{
				_APP.consolelog(`${path.basename(_MOD.remoteConf_filename)} is missing. Creating a new one.`, 4);
				_MOD.remoteConf = [
					{
						"name": "DEFAULT - CHANGEME",
						"URL" : "http://127.0.0.1/",
						"getConfigs" : "getConfigs"
					}
				];
				fs.writeFileSync(_MOD.remoteConf_filename, JSON.stringify(_MOD.remoteConf,null,1) );
			}

			resolve();
		});
	},

};

module.exports = _MOD;