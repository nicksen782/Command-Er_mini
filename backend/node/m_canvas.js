const fs = require('fs');
// const path = require('path');
// const os   = require('os');
const {createCanvas, loadImage } = require("canvas");

let _APP = null;

let _MOD = {
	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Init.
			_APP.consolelog("createCanvasLayers", 2);
			await _MOD.init.createCanvasLayers();
			
			_APP.consolelog("createTileSetCanvas", 2);
			await _MOD.init.createTileSetCanvas();
			
			_APP.consolelog("generateTileCaches", 2);
			await _MOD.init.generateTileCaches();
			
			// _APP.consolelog("getFramebuffer", 2);
			_MOD.init.getFramebuffer();

			// Add routes.
			_APP.consolelog("addRoutes", 2);
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	// ******
	layers   : []  , // Output layers. Last layer is the combined layer.
	fb       : null, // Handle to the output framebuffer.
	rawBuffer: null, // Saved as to not need to reallocate memory each draw.
	tileCache: []  , // Cache of all tiles.

	drawLayersUpdateFramebuffer: async function(_changes){
		return new Promise(async function(resolve,reject){
			// Get the LCD config.
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			// For each layer:
			for(let layer_i=0; layer_i<_APP.m_draw._VRAM_changes.length; layer_i+=1){
				// For each change to a layer's coord:
				let rec;
				let layer = _APP.m_draw._VRAM_changes[layer_i];
				let layerCtx = _MOD.layers[layer_i].ctx;
				
				// Get the changes for this layer.
				let changes = [];
				if(!_changes){
					console.log("_changes was NOT supplied.");
					if(_APP.m_draw._VRAM_updateStats[layer_i].updates){
						changes = Object.keys(layer).filter(function(d){ return layer[d].c; });
					}
				}
				else{
					changes = _changes[layer_i];
				}
				
				// Go through each change. 
				for(let coordKey of changes){
					// Skip if the changed key is false.
					if(! layer[coordKey].c){ continue; }

					// Get the change record.
					rec = layer[coordKey];
					
					// Get the new tile canvas.
					let newTileCanvas = _MOD.tileCache[rec.t].canvas;

					// Clear the region to which this tile will be drawn.
					layerCtx.clearRect(rec.x*ts.tileWidth, rec.y*ts.tileHeight, newTileCanvas.width, newTileCanvas.height);

					// Draw the tile to this layer.
					layerCtx.drawImage(newTileCanvas, rec.x*ts.tileWidth, rec.y*ts.tileHeight);
				}

				// Draw this layer (updated or not) to the last layer.
				_MOD.layers[_MOD.layers.length-1].ctx.drawImage(layerCtx.canvas, 0, 0);
			}

			// Create a raw buffer from the last layer. 
			_MOD.rawBuffer = _MOD.layers[_MOD.layers.length-1].canvas.toBuffer('raw');

			// Send the raw buffer to update the LCD screen.
			fs.writeSync(_MOD.fb, _MOD.rawBuffer, 0, _MOD.rawBuffer.bytelength, 0);

			// Reset the draw flags.
			_APP.m_draw.clearDrawingFlags();

			// Update the timeIt stamps.
			_APP.timeIt("DISPLAYUPDATE", "e");
			_APP.timeIt("FULLLOOP", "e");

			// Schedule the next appLoop.
			_APP.schedule_appLoop();

			resolve();
		});
	},

	
	init: {
		createCanvasLayers: function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts = conf.tileset;

				let layerCount = ts.tilesInCol + 1;
				for(let i=0; i<layerCount; i+=1){
					// Create the canvas. 
					let canvas = createCanvas( (conf.width), (conf.height) )
					
					// Get the drawing context and change some settings. 
					let ctx = canvas.getContext("2d");
					ctx.mozImageSmoothingEnabled    = false; // Firefox
					ctx.imageSmoothingEnabled       = false; // Firefox
					ctx.oImageSmoothingEnabled      = false; //
					ctx.webkitImageSmoothingEnabled = false; //
					ctx.msImageSmoothingEnabled     = false; //

					_MOD.layers.push( { canvas:canvas, ctx:ctx } );
				}

				resolve();
			});
		},
		createTileSetCanvas: async function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts = conf.tileset;
				
				// Load the tileset image.
				const img = await loadImage("public/shared/" + ts.file);
				
				// Create the canvas for the image.
				let canvasTileset = createCanvas(img.width, img.height ); 
				
				// Create drawing context.
				let canvasTilesetCtx = canvasTileset.getContext("2d");

				// Disable all anti-aliasing effects.
				canvasTilesetCtx.mozImageSmoothingEnabled    = false; // Firefox
				canvasTilesetCtx.imageSmoothingEnabled       = false; // Firefox
				canvasTilesetCtx.oImageSmoothingEnabled      = false; //
				canvasTilesetCtx.webkitImageSmoothingEnabled = false; //
				canvasTilesetCtx.msImageSmoothingEnabled     = false; //
				
				// Draw the image to the new canvas. 
				canvasTilesetCtx.drawImage(img, 0, 0);

				resolve( {
					canvas : canvasTileset, 
					ctx    : canvasTilesetCtx,
				} );
			});
		},
		generateTileCaches: async function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts = conf.tileset;

				// Get the tileset image as a canvas and context.
				let { canvas: canvasTileset, ctx: canvasTilesetCtx } = await _MOD.init.createTileSetCanvas();

				// Get the tileCoord keys. 
				let keys = Object.keys(_APP.m_config.tileCoords);

				// Create a cache for each tile. 
				for(let index in keys){ 
					await _MOD.init.genTile(
						keys[index], 
						_APP.m_config.tileCoords[ keys[index] ], 
						canvasTileset
					);
				}

				resolve();
			});
		},
		genTile : function(key, coord, canvasTileset){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts = conf.tileset;

				// Create the cache canvas and ctx for this tile.
				let tmpCanvas = createCanvas(ts.tileWidth, ts.tileHeight);
				let tmpCtx    = tmpCanvas.getContext('2d');

				// Disable all anti-aliasing effects.
				tmpCtx.mozImageSmoothingEnabled    = false; // Firefox
				tmpCtx.imageSmoothingEnabled       = false; // Firefox
				tmpCtx.oImageSmoothingEnabled      = false; //
				tmpCtx.webkitImageSmoothingEnabled = false; //
				tmpCtx.msImageSmoothingEnabled     = false; //

				// Draw to the cached canvas.
				let args = [
					canvasTileset       , // canvas
					(coord.L*ts.tileWidth)   , // sx
					(coord.T*ts.tileHeight)  , // sy
					ts.tileWidth             , // sWidth
					ts.tileHeight            , // sHeight
					0                        , // dx
					0                        , // dy
					ts.tileWidth             , // dWidth
					ts.tileHeight              // dHeight
				];
				tmpCtx.drawImage(...args);

				// Add to the tileCache.
				_MOD.tileCache.push({
					"key"       : key,                   // tileName.
					"canvas"    : tmpCanvas,             // Canvas of this tile. 
					"index"     : _MOD.tileCache.length, // tileId.
				});

				resolve();
			})
		},
		getFramebuffer: function(){
			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			_MOD.fb = fs.openSync("/dev/fb0", "w");
		},
	},
};

module.exports = _MOD;