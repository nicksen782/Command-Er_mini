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
				await _MOD.init.getFramebuffer();

				// Add routes.
				_APP.consolelog("addRoutes", 2);
				_MOD.addRoutes(_APP.app, _APP.express);

				// Set the moduleLoaded flag.
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
	clears:{},
	draws :{},
	drawLayersUpdateFramebuffer: async function(_changesFullFlat){
		return new Promise(async function(resolve,reject){
			// Get the width and the height of a tile.

			// Clear the arrays.
			_MOD.clears = {};
			_MOD.draws = {};

			// Cache the length of _MOD.layers.
			let len = _MOD.layers.length;

			// Key for the clears object.
			let key;

			// Create the records for clears and draws.
			for(let i=0; i<_changesFullFlat.length; i+=4){
				// Create the coords object.
				let coords = {
					l:(_changesFullFlat[i+0]),
					x:(_changesFullFlat[i+1] * _APP.m_config.config.lcd.tileset.tileWidth),
					y:(_changesFullFlat[i+2] * _APP.m_config.config.lcd.tileset.tileHeight),
					t:(_changesFullFlat[i+3]),
					w:(_MOD.tileCache[_changesFullFlat[i+3]].canvas.width), 
					h:(_MOD.tileCache[_changesFullFlat[i+3]].canvas.height),
				}

				// Generate the key for the clears object.
				key = `X${coords.x}Y${coords.y}`;

				// Add to the clears obj if the key does not exist. (Used to make sure that the final layer has the clears too.
				if(!_MOD.clears[key]){ _MOD.clears[key] = coords; }

				// Add to the draws array. (Add the layer key/array if needed.
				if(!Array.isArray(_MOD.draws[rec.l])){ _MOD.draws[rec.l] = []; }
				_MOD.draws[rec.l].push(coords);
			}

			// Perform the drawings on the layers. 
			for(let L in _MOD.draws){
				for(let C=0; C<_MOD.draws[L].length; C+=1){
					// Clear the region to which this tile will be drawn.
					_MOD.layers[_MOD.draws[L][C].l].ctx.clearRect(_MOD.draws[L][C].x, _MOD.draws[L][C].y, _MOD.draws[L][C].w, _MOD.draws[L][C].h);

					// Draw the tile to this layer.
					_MOD.layers[_MOD.draws[L][C].l].ctx.drawImage(_MOD.tileCache[_MOD.draws[L][C].t].canvas, _MOD.draws[L][C].x, _MOD.draws[L][C].y, _MOD.draws[L][C].w, _MOD.draws[L][C].h);
				}
			}

			// Clear the regions of the final canvas where there have been tile updates to the other layers.
			for(let key in _MOD.clears){
				_MOD.layers[len-1].ctx.clearRect(_MOD.clears[key].x, _MOD.clears[key].y, _MOD.clears[key].w, _MOD.clears[key].h);
			}
			
			// Combine the canvas layers into the final canvas.
			for(let i=0; i<len; i+=1){
				_MOD.layers[len-1].ctx.drawImage(_MOD.layers[i].canvas, 0, 0);
			}

			// Create a raw buffer from the last layer. 
			_MOD.rawBuffer = _MOD.layers[len-1].canvas.toBuffer('raw');

			// Send the raw buffer to update the LCD screen.
			fs.write(_MOD.fb, _MOD.rawBuffer, 0, _MOD.rawBuffer.bytelength, 0, (err,fd)=>{
				if(err){ console.log("fs.write ERROR:", err); reject(err); return; }
				// console.log(fd);
				
				// End.
				resolve();
			});
		});
	},

	// Draws to the LCD framebuffer based on the passed changes.
	OLDdrawLayersUpdateFramebuffer: async function(_changesFullFlat){
		return new Promise(async function(resolve,reject){
			// Get the width and the height of a tile.
			let tileWidth  = _APP.m_config.config.lcd.tileset.tileWidth;
			let tileHeight = _APP.m_config.config.lcd.tileset.tileHeight;

			let clears = [];

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
				ctx = _MOD.layers[rec.l].ctx;

				// Add to the clears array. (Used to make sure that the final layer has the clears too.
				clears.push({ x:(rec.x*tileWidth), y:(rec.y*tileHeight), w:(newTileCanvas.width), h:(newTileCanvas.height) });

				// Clear the region to which this tile will be drawn.
				ctx.clearRect(rec.x*tileWidth, rec.y*tileHeight, newTileCanvas.width, newTileCanvas.height);

				// Draw the tile to this layer.
				ctx.drawImage(newTileCanvas, rec.x*tileWidth, rec.y*tileHeight);
			}

			// Pre-clear the changed tiles on the final canvas (helps with transparency issues.)
			for(let i=0; i<clears.length; i+=1){
				_MOD.layers[_MOD.layers.length-1].ctx.clearRect(clears[i].x, clears[i].y, clears[i].w, clears[i].h);
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

	// Can be used for error messages.
	displayMessage: async function(str, x, y, w, h){
		return new Promise(async function(resolve,reject){
			// _APP.m_canvas.displayMessage("TEST", 0,0,10,10);
			// Pause the appLoop.
			try{ _APP.drawLoop.pause(); } catch(e){ console.log("Cannot pause", "displayMessage"); }

			// Reset updates/changes/drawflags.
			_APP.m_draw.clearDrawingFlags();

			// Clear the entire screen.
			_APP.m_draw.fillTile(" ", 0, 0, _APP.m_config.config.lcd.tileset.cols, _APP.m_config.config.lcd.tileset.rows, 0);
			_APP.m_draw.fillTile(" ", 0, 0, _APP.m_config.config.lcd.tileset.cols, _APP.m_config.config.lcd.tileset.rows, 1);
			_APP.m_draw.fillTile(" ", 0, 0, _APP.m_config.config.lcd.tileset.cols, _APP.m_config.config.lcd.tileset.rows, 2);


			// Outer box.
			_APP.m_draw.fillTile("tile3"        , x, y,  w, h); 

			// Inner box.
			_APP.m_draw.fillTile("tile1"        , x+1, y+1,  w-2, h-2); 

			// Message.
			_APP.m_draw.print(`${str}` , x+2 , y+2);

			// Get the changes.
			let _changesFullFlat = _APP.m_drawLoop.loop.getChanges();

			_APP.m_draw.updatingLCD=true;
			await _APP.m_canvas.drawLayersUpdateFramebuffer(_changesFullFlat);

			// Unpause the appLoop.
			try{ _APP.drawLoop.unpause(); } catch(e){ console.log("Cannot unpause", "displayMessage");  }

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
					"key"       : key,                                    // tileName.
					"canvas"    : tmpCanvas,                              // Canvas of this tile. 
					"index"     : _MOD.tileCache.length,                  // tileId.
					// "pattern"   : tmpCtx.createPattern(tmpCanvas, 'no-repeat'), // Pattern of this tile. 
				});

				// End.
				resolve();
			})
		},

		// Get a handle to the framebuffer used by the LCD.
		getFramebuffer: function(){
			return new Promise(async function(resolve,reject){
				// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
				fs.open(_APP.m_config.config.lcd.fb, "w", (err, fd)=>{
					_MOD.fb = fd;
					
					// End.
					resolve();
				});
			});
			
			// OPEN/STORE A HANDLE TO THE FRAMEBUFFER.
			// _MOD.fb = fs.openSync(_APP.m_config.config.lcd.fb, "w");
			// _MOD.fb = fs.open(_APP.m_config.config.lcd.fb, "w");
		},
	},
};

module.exports = _MOD;