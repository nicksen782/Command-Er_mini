const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	//
	_VRAM            : [], // ArrayBuffer for VRAM.
	_VRAM_view       : [], // Uint8 view of _VRAM ArrayBuffer.
	_VRAM_changes    : [], // Tracks changes per LCD screen update. (Object containing objects.)
	_VRAM_inited     : false, 
	_VRAM_updateStats: {}, 
	buff_abgr        : null, // Raw BGRA data (framebuffer).
	curFrame         : 0,
	updatingLCD      : false,
	lcdUpdateNeeded  : false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
				
				// VRAM init.
				_APP.consolelog("_initVram", 2);
				_MOD.init._initVram(); // Init the _VRAM array. (Also clears it.)
				
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
		_APP.addToRouteList({ path: "/GET_VRAM", method: "post", args: [], file: __filename, desc: "GET_VRAM" });
		app.post('/GET_VRAM'    ,express.json(), async (req, res) => {
			try{ 
				res.json(Array.from([
					..._MOD._VRAM_view, 
					...Array.from("FULL__").map(d=>d.charCodeAt(0))
				]) );
			}
			catch(e){
				res.json(e);
			}
		});

		_APP.addToRouteList({ path: "/PRESS_BUTTONS", method: "post", args: [], file: __filename, desc: "PRESS_BUTTONS" });
		app.post('/PRESS_BUTTONS'    ,express.json(), async (req, res) => {
			try{ 
				_APP.m_gpio.setButtonOverrideValues(req.body);
				res.json("DONE");
			}
			catch(e){
				res.json(e);
			}
		});

		_APP.addToRouteList({ path: "/GET_DRAW_FLAGS", method: "post", args: [], file: __filename, desc: "GET_DRAW_FLAGS" });
		app.post('/GET_DRAW_FLAGS'    ,express.json(), async (req, res) => {
			try{ 
				res.json({
					"1_now            ": _APP.stats.now,
					"2_delta          ": _APP.stats.delta,
					"3_interval       ": _APP.stats.interval,
					"3__then          ": _APP.stats._then,
					"4_lcdUpdateNeeded": _APP.m_draw.lcdUpdateNeeded,
					"5_updatingLCD    ": _APP.m_draw.updatingLCD,
					"6_lastDiff       ": _APP.stats.lastDiff,
					"7_overby         ": (_APP.stats.delta - _APP.stats.interval),
				});
			}
			catch(e){
				res.json(e);
			}
		});
	},

	// ***************

	// Functions used for "drawing".

	clear_VRAM_changes: function(){
		// Clear the _VRAM_changes array.
		_MOD._VRAM_changes = {};
	},

	// Add to _VRAM_changes.
	addTo_VRAM_changes: function(x, y){
		// Add to a layer of _VRAM_changes.
		let key = `Y${y}_X${x}`;
		let index = _APP.m_config.indexByCoords[y][x];
		_MOD._VRAM_changes[key] = { 
			y : y,
			x : x,
			t0: _APP.m_draw._VRAM_view[index+0], 
			t1: _APP.m_draw._VRAM_view[index+1], 
			t2: _APP.m_draw._VRAM_view[index+2], 
		};
	},

	// Clear one VRAM layer with a tile. (Used by the Web Client... only??)
	clearLayer: function(tile=" ", xcolLayer=null){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Fill _VRAM with one tile.
		_MOD.fillTile(tile, 0, 0, ts.cols, ts.rows, xcolLayer);
	},

	// Clear all VRAM layers. Can specify the layer 0 tile.
	clearLayers: function(tile=" "){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Fill layer 0 with the specified tile.
		_MOD.fillTile(tile, 0, 0, ts.cols, ts.rows, 0);
		
		// Fill the other layer's _VRAM with the "space" tile (fully transparent and blank.)
		_MOD.fillTile(" ", 0, 0, ts.cols, ts.rows, 1);
		_MOD.fillTile(" ", 0, 0, ts.cols, ts.rows, 2);
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
		
		// Update stats.
		_MOD._VRAM_updateStats[xcolLayer].updates += 1;
		
		// Don't update a tile with the same tile. 
		let tile_old = _MOD._VRAM_view[index+xcolLayer];
		let tile_new = _APP.m_config.tileIdsByTilename[tileName];
		if(tile_old != tile_new){
			// Update the vram entry.
			_MOD._VRAM_view[index+xcolLayer] = tile_new;
			
			// Update stats.
			_MOD._VRAM_updateStats[xcolLayer].real += 1;

			// Add to changes.
			_MOD.addTo_VRAM_changes(x, y);

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
		if(oob_x){ 
			console.log(`oob_x:${x} >> x:${x}, y${y}, tileName:${tileName}, xcolLayer:${xcolLayer}, (in: ${_APP.currentScreen})`); 
			return;
		}
		if(oob_y){ 
			console.log(`oob_y:${y} >> x:${x}, y${y}, tileName:${tileName}, xcolLayer:${xcolLayer}, (in: ${_APP.currentScreen})`); 
			return;
		}

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
			console.log("ERROR: setTile : ", tileName, `(in: ${_APP.currentScreen})`);
			tileName = 'nochar'; 
		}
		
		// "Draw" the tile to VRAM.
		_MOD._updateVramTile_flat(tileName, x, y, xcolLayer);
	},

	// DRAW TEXT TO THE CANVAS. 
	print      : function(str="", x, y, xcolLayer=2){
		// Convert to string if the input is a number. 
		if(typeof str == "number"){ str = str.toString(); }
		
		// Set the string to uppercase.
		str = str.toUpperCase();

		// Break up the string into separate chars.
		let chars = str.split("");

		// Loop through the list of chars and draw them.
		for(let i=0; i<chars.length; i+=1){
			_MOD.setTile(chars[i], x++, y, xcolLayer);
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

		// Clear the update stats.
		for(let layer_i=0; layer_i<ts.tilesInCol; layer_i+=1){
			// _MOD._VRAM_updateStats[layer_i].layer      = layer_i;
			_MOD._VRAM_updateStats[layer_i].updates    = 0;
			_MOD._VRAM_updateStats[layer_i].real       = 0;
		}

		// Clear the changes.
		_MOD.clear_VRAM_changes();
	},

	//
	init: {
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
				let tileId = _APP.m_config.tileIdsByTilename["n "];

				// Init the _VRAM_changes array.
				_MOD._VRAM_changes = {};
				
				// Init _MOD._VRAM_updateStats
				for(let layer_i=0; layer_i<ts.tilesInCol; layer_i+=1){
					_MOD._VRAM_updateStats[layer_i] = { 
						// "layer"     : layer_i, 
						"updates"   : 0, 
						"real"      : 0 ,
					}
				}

				// Set the inited flag.
				_MOD._VRAM_inited = true;

				// Set the lcdUpdateNeeded flag.
				_MOD.lcdUpdateNeeded = true;
			}
		},
	},

};

module.exports = _MOD;