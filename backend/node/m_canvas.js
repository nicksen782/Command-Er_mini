const fs = require('fs');
const {createCanvas, loadImage } = require("canvas");

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
	
				// Init.
				_APP.consolelog("createCanvasLayers", 2);
				await _MOD.init.createCanvasLayers();
				
				_APP.consolelog("createTileSetCanvas", 2);
				await _MOD.init.createTileSetCanvas();
				
				_APP.consolelog("generateTileCaches", 2);
				await _MOD.init.generateTileCaches();
				
				_APP.consolelog("getFramebuffer", 2);
				_MOD.init.getFramebuffer();

				// Add routes.
				_APP.consolelog("addRoutes", 2);
				_MOD.addRoutes(_APP.app, _APP.express);

				_MOD.moduleLoaded = true;
			}

			// End.
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

	// Draws to the LCD framebuffer based on the passed changes.
	drawLayersUpdateFramebuffer: async function(_changesFullFlat){
		return new Promise(async function(resolve,reject){
			// Get the width and the height of a tile.
			let tileWidth  = _APP.m_config.config.lcd.tileset.tileWidth;
			let tileHeight = _APP.m_config.config.lcd.tileset.tileHeight;

			for(let i=0; i<_changesFullFlat.length; i+=4){
				// Create the record object.
				let rec = {
					l:_changesFullFlat[i+0],
					x:_changesFullFlat[i+1],
					y:_changesFullFlat[i+2],
					t:_changesFullFlat[i+3],
				};

				// Determine destination x and y on the canvas.
				dx = rec.x*tileWidth;
				dy = rec.y*tileHeight;

				// Get the new tile canvas.
				let newTileCanvas = _MOD.tileCache[rec.t].canvas;
			
				// Determine which canvas needed to be drawn to.
				if     (rec.l==0){ ctx = _MOD.layers[rec.l].ctx }
				else if(rec.l==1){ ctx = _MOD.layers[rec.l].ctx }
				else if(rec.l==2){ ctx = _MOD.layers[rec.l].ctx }

				// Clear the region to which this tile will be drawn.
				ctx.clearRect(rec.x*tileWidth, rec.y*tileHeight, newTileCanvas.width, newTileCanvas.height);

				// Draw the tile to this layer.
				ctx.drawImage(newTileCanvas, rec.x*tileWidth, rec.y*tileHeight);
			}

			// Combine the canvas layers.
			for(let i=0; i<_MOD.layers.length; i+=1){
				_MOD.layers[_MOD.layers.length-1].ctx.drawImage(_MOD.layers[i].canvas, 0, 0);
			}

			// Create a raw buffer from the last layer. 
			_MOD.rawBuffer = _MOD.layers[_MOD.layers.length-1].canvas.toBuffer('raw');

			// Send the raw buffer to update the LCD screen.
			fs.writeSync(_MOD.fb, _MOD.rawBuffer, 0, _MOD.rawBuffer.bytelength, 0);

			// End.
			resolve();
		});
	},

	// Initialization functions.
	init: {
		// Create the canvas layers. 
		createCanvasLayers: function(){
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts   = conf.tileset;

				// Create the layers.
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

					// Add this layer.
					_MOD.layers.push( { canvas:canvas, ctx:ctx } );
				}

				// End.
				resolve();
			});
		},

		// Create and return a canvas for the tileset image.
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
				
				// Resolve and return the data.
				resolve( {
					canvas : canvasTileset, 
					ctx    : canvasTilesetCtx,
				} );
			});
		},

		// Create the canvas cache for each tile in the tileset.
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

				// End.
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

				// End.
				resolve();
			})
		},

		// Get a handle to the framebuffer used by the LCD.
		getFramebuffer: function(){
			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			_MOD.fb = fs.openSync(_APP.m_config.config.lcd.fb, "w");
		},
	},
};

module.exports = _MOD;