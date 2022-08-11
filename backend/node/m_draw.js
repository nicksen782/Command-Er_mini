const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	//
	_VRAM            : [], // ArrayBuffer for VRAM.
	_VRAM_view       : [], // Uint8 view of _VRAM ArrayBuffer.
	_VRAM2            : [], // ArrayBuffer for VRAM2.
	_VRAM2_view       : [], // Uint8 view of _VRAM2 ArrayBuffer.
	_VRAM_inited     : false, 
	_VRAM_updateStats: {}, 
	buff_abgr        : null, // Raw BGRA data (framebuffer).
	curFrame         : 0,
	updatingLCD      : false,
	lcdUpdateNeeded  : false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_APP.consolelog("addRoutes", 2);
			_MOD.addRoutes(_APP.app, _APP.express);
			
			// VRAM init.
			_APP.consolelog("LCD VRAM init", 2);
			await _MOD.init();

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		_APP.addToRouteList({ path: "/GET_VRAM", method: "post", args: [], file: __filename, desc: "" });
		app.post('/GET_VRAM'    ,express.json(), async (req, res) => {
			try{ 
				// res.json(_MOD._VRAM);
				res.json(_MOD._VRAM_view);
			}
			catch(e){
				res.json(e);
			}
		});
	},

	// ***************

	// Functions used for "drawing".

	// Init the _VRAM array.
	_initVram: function(){
		if(!_MOD._VRAM_inited){
			// Get the LCD config.
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;
			let numIndexes = ( ts.rows*ts.cols) * ts.tilesInCol;
			
			// Create the _VRAM arraybuffer.
			_MOD._VRAM = new ArrayBuffer(numIndexes);

			// Create the _VRAM dataview.
			_MOD._VRAM_view = new Uint8Array(_MOD._VRAM);

			// Fill the _VRAM with the "space" tile (fully transparent and blank.)
			_MOD._VRAM_view.fill( _APP.m_config.tileIdsByTilename[" "] );

			// Set the inited flag.
			_MOD._VRAM_inited = true;

			// Init _MOD._VRAM_updateStats
			for(let i=0; i<ts.tilesInCol; i+=1){
				_MOD._VRAM_updateStats[i] = { "layer": i, "updates": 0 }
			}

			// Set the lcdUpdateNeeded flag.
			// _MOD.lcdUpdateNeeded = true;
		}
	},

	// Clear one VRAM layer with a tile. (Used by the Web Client... only??)
	clearLayer: function(tile=" ", xcolLayer=null){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Fill _VRAM with one tile.
		_MOD.fillTile(tile, 0, 0, ts.cols, ts.rows, xcolLayer);

		// Set the lcdUpdateNeeded flag.
		// _MOD.lcdUpdateNeeded = true;
	},

	// Clear all VRAM layers. Can specify the layer 0 tile.
	clearLayers: function(tile=" "){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Fill layer 0 with the specified tile.
		_MOD.fillTile(tile, 0, 0, ts.cols, ts.rows, 0);
		
		// Fill the other layers _VRAM with the "space" tile (fully transparent and blank.)
		_MOD.fillTile(" ", 0, 0, ts.cols, ts.rows, 1);
		_MOD.fillTile(" ", 0, 0, ts.cols, ts.rows, 2);

		// Set the lcdUpdateNeeded flag.
		// _MOD.lcdUpdateNeeded = true;
	},

	// Update one tile in _VRAM.
	_updateVramTile_flat: function(tileName, x, y, xcolLayer=null){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Ensure that the tileName is a string.
		tileName = tileName.toString();

		// Get the index via the x,y coords.
		let index = _APP.m_config.indexByCoords[y][x];
		
		// Don't update a tile with the same tile. 
		let tile_old = _MOD._VRAM_view[index+xcolLayer];
		let tile_new = _APP.m_config.tileIdsByTilename[tileName];
		if(tile_old != tile_new){
			// Update the vram entry.
			_MOD._VRAM_view[index+xcolLayer] = tile_new;

			// Update stats.
			// if(!_MOD._VRAM_updateStats[xcolLayer]
			_MOD._VRAM_updateStats[xcolLayer].updates += 1;

			// Set the lcdUpdateNeeded flag.
			_MOD.lcdUpdateNeeded = true;
		}
	},

	// DRAW ONE TILE TO THE CANVAS.
	setTile    : function(tileName=" ", x, y, xcolLayer=1){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
		let oob_x = x >= ts.cols ? true : false;
		let oob_y = y >= ts.rows ? true : false;
		if(oob_x){ console.log(`oob_x:${x} >> x:${x}, y${y}, tileName:${tileName}, xcolLayer:${xcolLayer}`); return; }
		if(oob_y){ console.log(`oob_y:${y} >> x:${x}, y${y}, tileName:${tileName}, xcolLayer:${xcolLayer}`); return; }

		// Numbers and spaces cannot be used as JSON keys. This is the fix.
		if(tileName.length == 1 && tileName.match(/[0-9\s]/g)){
			tileName = `n${tileName}`;
		}

		// Check for the tile. If not found then use 'nochar'.
		try{
			if(_APP.m_config.tilenamesByIndex.indexOf(tileName) == -1){ 
				console.log("setTile: Tile not found:", tileName); 
				tileName = 'nochar'; 
			};
		}
		catch(e){
			// console.log("ERROR: setTile : ", tileName, e);
			// console.log("_APP.m_config.tilenamesByIndex:", _APP.m_config.tilenamesByIndex);
			console.log("ERROR: setTile : ", tileName);
			tileName = 'nochar'; 
		}
		
		// "Draw" the tile to VRAM.
		_MOD._updateVramTile_flat(tileName, x, y, xcolLayer);
	},

	// DRAW TEXT TO THE CANVAS. 
	print      : function(str="", x, y, xcolLayer=1){
		let chars = str.split("");
		for(let i=0; i<chars.length; i+=1){
			let tileName = chars[i].toString().toUpperCase();
			_MOD.setTile(tileName, x++, y, xcolLayer);
		}
	},

	// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
	fillTile   : function(tileName=" ", x, y, w, h, xcolLayer=0){
		for(let dy=0; dy<h; dy+=1){
			for(let dx=0; dx<w; dx+=1){
				_MOD.setTile(tileName, x+dx, y+dy, xcolLayer);
			}
		}
	},

	// Clear the drawing flags. 
	clearDrawingFlags: function(){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		_MOD.updatingLCD = false;
		_MOD.lcdUpdateNeeded = false;

		for(let i=0; i<ts.tilesInCol; i+=1){
			_MOD._VRAM_updateStats[i].updates = 0;
		}
	},

	//
	init: async function(){
		return new Promise(async function(resolve,reject){
			// Init the _VRAM array.
			_MOD._initVram();

			// CLEAR THE LAYERS.
			// _MOD.clearLayers();
			// _MOD.clearLayers("tile4");
			
			resolve(); return; 
		});
	},

};

module.exports = _MOD;