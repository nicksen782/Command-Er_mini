const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	//
	_VRAM           : []  , // (FLAT). Holds the tile ids for each tile of the screen.
	_VRAM_inited    : false, 
	buff_abgr       : null, // Raw BGRA data (framebuffer).
	curFrame        : 0,
	updatingLCD     : false,
	lcdUpdateNeeded : false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_APP.consolelog("  addRoutes");
			_MOD.addRoutes(_APP.app, _APP.express);

			//
			await _MOD.init();

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
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
			_MOD._VRAM = Array(numIndexes);
			_MOD._VRAM_inited = true;
		}
	},

	// Update one tile in _VRAM.
	_updateVramTile_flat: function(tileName, x, y){
		tileName = tileName.toString();

		// Get the lookups.
		let _byCoord = _APP.m_config.indexByCoords;

		let index = _byCoord[y][x];
		
		// DEBUG
		// let coords = _byIndex[index] 
		// console.log(`tileName:${tileName}, x:${x}, y:${y}, index:${index}, coords:${coords}`);
		
		// Get the values of the tiles. 
		let tile2  = _MOD._VRAM[index+1];
		let tile3  = _MOD._VRAM[index+2];
		let tileId = _APP.m_config.tileIdsByTilename[tileName];

		// Don't update and shift if the same tile is being drawn again.
		if(tileId != tile3){
			// Set the tiles.
			_MOD._VRAM[index+0] = tile2;
			_MOD._VRAM[index+1] = tile3;
			_MOD._VRAM[index+2] = tileId;

			// Set the lcdUpdateNeeded flag.
			_MOD.lcdUpdateNeeded = true;
		}
		else{
			// console.log("WARN: Same tile drawn over same tile.", tileName, tileId, tile3, `x:$x}, y:${y}`);
		}
	},

	// DRAW ONE TILE TO THE CANVAS.
	setTile    : function(tileName, x, y){
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Bounds-checking. (Ignore further chars on x if oob. Ignore oob on y too.)
		let oob_x = x >= ts.cols ? true : false;
		let oob_y = y >= ts.rows ? true : false;
		if(oob_x){ console.log("oob_x"); return; }
		if(oob_y){ console.log("oob_y"); return; }

		if(tileName.length == 1 && tileName.match(/[0-9\s]/g)){
			tileName = `n${tileName}`;
		}

		// Check for the tile. If not found then use 'nochar'.
		if(_APP.m_config.tileIdsByTilename.indexOf(tileName) == -1){ 
			// console.log("setTile: Tile not found:", tileName); 
			tileName = 'nochar'; 
		};

		
		// "Draw" the tile to VRAM.
		_MOD._updateVramTile_flat(tileName, x, y);
	},

	// DRAW TILES TO CANVAS IN A RECTANGLE REGION.
	fillTile   : function(tileName, x, y, w, h){
		for(let dy=0; dy<h; dy+=1){
			for(let dx=0; dx<w; dx+=1){
				_MOD.setTile(tileName, x+dx, y+dy);
			}
		}
	},

	// DRAW TEXT TO THE CANVAS. 
	print      : function(str, x, y){
		let chars = str.split("");
		for(let i=0; i<chars.length; i+=1){
			let tileName = chars[i].toString().toUpperCase();
			_MOD.setTile(tileName, x, y);
			x+=1;
		}
	},

	// Fill all VRAM with a tile. 
	clearScreen: function(tile="tile4"){
		let tileId = _APP.m_config.tileIdsByTilename[tile];
		
		// Fill _VRAM with one tile.
		_MOD._VRAM.fill(tileId);

		_MOD.lcdUpdateNeeded = true;
	},

	// Clear the drawing flags. 
	clearDrawingFlags: function(){
		_MOD.updatingLCD=false;
		_MOD.lcdUpdateNeeded = false;
	},

	//
	init: async function(){
		return new Promise(async function(resolve,reject){
			// Init the _VRAM array.
			_MOD._initVram();

			// CLEAR THE SCREEN.
			_MOD.clearScreen("tile3");

			resolve(); return; 
		});
	},

};

module.exports = _MOD;