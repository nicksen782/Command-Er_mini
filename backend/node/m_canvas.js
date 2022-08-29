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

				if( _APP.m_config.config.toggles.isActive_buttonsOverlay ){ 
					await _MOD.overlayControls.init();
				}

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

	// Draw changes to canvas then framebuffer.
	drawLayersUpdateFramebuffer: async function(){
		return new Promise(function(resolve,reject){
			let finalLayerCtx = _MOD.layers[_MOD.layers.length-1].ctx;
			let w = _APP.m_config.config.lcd.tileset.tileWidth;
			let h = _APP.m_config.config.lcd.tileset.tileHeight;
			let x;
			let y;
			let rec;
			let change;

			// Pre-clear region and then write each tile to it.
			for(change in _APP.m_draw._VRAM_changes){
				// Get the record.
				rec = _APP.m_draw._VRAM_changes[change];

				// Create x,y with actual canvas coordinates.
				x = rec.x * _APP.m_config.config.lcd.tileset.tileWidth;
				y = rec.y * _APP.m_config.config.lcd.tileset.tileHeight;

				// Clear the region. 
				finalLayerCtx.clearRect( x, y, w, h );

				// Draw each tile to the region in order.
				finalLayerCtx.drawImage( _MOD.tileCache[ rec.t0 ].canvas, x, y) ;
				finalLayerCtx.drawImage( _MOD.tileCache[ rec.t1 ].canvas, x, y) ;
				finalLayerCtx.drawImage( _MOD.tileCache[ rec.t2 ].canvas, x, y) ;
			}
			
			// Draw the overlay canvas, combine with app canvas.
			if( _APP.m_config.config.toggles.isActive_buttonsOverlay ){ 
				// Create a raw buffer.
				let overlayCanvas = _APP.m_canvas.overlayControls.layers[0];
				overlayCanvas.ctx.drawImage(finalLayerCtx.canvas, (15*8), 0);
				_MOD.rawBuffer = overlayCanvas.canvas.toBuffer('raw');
			}
			else{
				// Create a raw buffer from the last layer. 
				_MOD.rawBuffer = finalLayerCtx.canvas.toBuffer('raw');
			}


			// Send the raw buffer to update the LCD screen.
			fs.write(_MOD.fb, _MOD.rawBuffer, 0, _MOD.rawBuffer.bytelength, 0, (err,fd)=>{
				if(err){ console.log("fs.write ERROR:", err); reject(err); return; }
				
				// End.
				resolve();
			});
		});
	},

	// Overlay controls for larger screens (no buttons.)
	overlayControls: {
		coords: {
			"UP"   : { x:(6)*8         , y:(9)*8  },
			"DOWN" : { x:(6)*8         , y:(19)*8 },
			"LEFT" : { x:(1)*8         , y:(14)*8 },
			"RIGHT": { x:(11)*8        , y:(14)*8 },
			"PRESS": { x:(6)*8         , y:(14)*8 },
			"n1"   : { x:((45)*8)+(6*8), y:(9)*8  },
			"n2"   : { x:((45)*8)+(6*8), y:(14)*8 },
			"n3"   : { x:((45)*8)+(6*8), y:(19)*8 },
			
			
			
		},
		canvasCache: {
			// Active.
			"KEY_UP_ON"    : { canvas:null, ctx:null },
			"KEY_DOWN_ON"  : { canvas:null, ctx:null },
			"KEY_LEFT_ON"  : { canvas:null, ctx:null },
			"KEY_RIGHT_ON" : { canvas:null, ctx:null },
			"KEY_PRESS_ON" : { canvas:null, ctx:null },
			"KEY1_ON"      : { canvas:null, ctx:null },
			"KEY2_ON"      : { canvas:null, ctx:null },
			"KEY3_ON"      : { canvas:null, ctx:null },
			
			// Inactive.
			"KEY_UP_OFF"    : { canvas:null, ctx:null },
			"KEY_DOWN_OFF"  : { canvas:null, ctx:null },
			"KEY_LEFT_OFF"  : { canvas:null, ctx:null },
			"KEY_RIGHT_OFF" : { canvas:null, ctx:null },
			"KEY_PRESS_OFF" : { canvas:null, ctx:null },
			"KEY1_OFF"      : { canvas:null, ctx:null },
			"KEY2_OFF"      : { canvas:null, ctx:null },
			"KEY3_OFF"      : { canvas:null, ctx:null },
		},
		layers: [],
		rawBuffer: null, // Saved as to not need to reallocate memory each draw.
		createCanvas: function(){
			// Need canvas to contain 480 by 240.
			return new Promise(async function(resolve,reject){
				// Get the LCD config.
				let conf = _APP.m_config.config.lcd;
				let ts   = conf.tileset;
				
				// Create the canvas. 
				let canvas = createCanvas( (480), (conf.height) )
				
				// Get the drawing context and change some settings. 
				let ctx = canvas.getContext("2d");
				ctx.mozImageSmoothingEnabled    = false; // Firefox
				ctx.imageSmoothingEnabled       = false; // Firefox
				ctx.oImageSmoothingEnabled      = false; //
				ctx.webkitImageSmoothingEnabled = false; //
				ctx.msImageSmoothingEnabled     = false; //

				// Color the left.
				ctx.fillStyle = '#c84c0c';
				ctx.fillRect(0, 0, 120, 240);
				
				// Color the right.
				ctx.fillStyle = '#c84c0c';
				ctx.fillRect(360, 0, 120, 240);

				// Add this layer.
				_MOD.overlayControls.layers.push( { canvas:canvas, ctx:ctx } );

				resolve();
			});

		},
		genControlCanvasCache: function(){
			return new Promise(async function(resolve,reject){
				let arr_on = [
					"KEY_UP_ON",
					"KEY_DOWN_ON",
					"KEY_LEFT_ON",
					"KEY_RIGHT_ON",
					"KEY_PRESS_ON",
					"KEY1_ON",
					"KEY2_ON",
					"KEY3_ON",
				];
				let arr_off = [
					"KEY_UP_OFF",
					"KEY_DOWN_OFF",
					"KEY_LEFT_OFF",
					"KEY_RIGHT_OFF",
					"KEY_PRESS_OFF",
					"KEY1_OFF",
					"KEY2_OFF",
					"KEY3_OFF",
				];

				for(let i=0; i<arr_on.length; i+=1){
					let key = arr_on[i];

					// Create the canvas. 
					let canvas = createCanvas( (24), (24) )
						
					// Get the drawing context and change some settings. 
					let ctx = canvas.getContext("2d");
					ctx.mozImageSmoothingEnabled    = false; // Firefox
					ctx.imageSmoothingEnabled       = false; // Firefox
					ctx.oImageSmoothingEnabled      = false; //
					ctx.webkitImageSmoothingEnabled = false; //
					ctx.msImageSmoothingEnabled     = false; //

					// Filled rectangle.
					ctx.fillStyle = "black";
					ctx.fillRect(0,0,canvas.width,canvas.height);

					// Stroked rectangle
					ctx.beginPath();
					ctx.strokeStyle = "black";
					ctx.rect(0,0,canvas.width,canvas.height);
					ctx.stroke();

					// Filled triangle
					// ctx.beginPath();
					// ctx.moveTo(25, 25);
					// ctx.lineTo(105, 25);
					// ctx.lineTo(25, 105);
					// ctx.fill();

					_MOD.overlayControls.canvasCache[key].canvas = canvas;
					_MOD.overlayControls.canvasCache[key].ctx = ctx;
				}
				for(let i=0; i<arr_off.length; i+=1){
					let key = arr_off[i];

					// Create the canvas. 
					let canvas = createCanvas( (24), (24) )
						
					// Get the drawing context and change some settings. 
					let ctx = canvas.getContext("2d");
					ctx.mozImageSmoothingEnabled    = false; // Firefox
					ctx.imageSmoothingEnabled       = false; // Firefox
					ctx.oImageSmoothingEnabled      = false; //
					ctx.webkitImageSmoothingEnabled = false; //
					ctx.msImageSmoothingEnabled     = false; //

					// Filled rectangle.
					ctx.fillStyle = "#ff9300";
					ctx.fillRect(0,0,canvas.width,canvas.height);

					// Stroked rectangle
					ctx.beginPath();
					ctx.strokeStyle = "black";
					ctx.rect(0,0,canvas.width,canvas.height);
					ctx.stroke();

					// Stroked triangle
					// ctx.beginPath();
					// ctx.moveTo(25, 25);
					// ctx.lineTo(105, 25);
					// ctx.lineTo(25, 105);
					// ctx.closePath()
					// ctx.stroke();

					_MOD.overlayControls.canvasCache[key].canvas = canvas;
					_MOD.overlayControls.canvasCache[key].ctx = ctx;
				}

				resolve();
			});
		},
		init: async function(){
			await _MOD.overlayControls.createCanvas();
			await _MOD.overlayControls.genControlCanvasCache();
		},
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
				let layerCount = 1;
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
					"index"     : _MOD.tileCache.length, // tileId.
					"key"       : key,                   // tileName.
					"canvas"    : tmpCanvas,             // Canvas of this tile. 
					// "ctx"       : tmpCtx,                // Drawing context of this tile. 
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
