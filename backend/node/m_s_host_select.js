// const fs   = require('fs');
// const path = require('path');
// const os   = require('os');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// Init this module.
	module_init: async function(parent, key){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				_APP.consolelog(`add screen: ${key}`, 2);
				_APP.screenLogic.screens[key] = screen;
				
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
	},
};

let screen = {
	// VARIABLES:
	inited: false,

	menu1: {}, // Populated via intVars.
	
	// CONSTANTS:
	
	// INIT:
	createDialog_choose_host: function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let dims = { "x": 0, "y": 4, "w": 30, "h": 22 };
		let tiles = { "t1": "tile3", "t2": "tile2", "t3": "tile4", "bgClearTile": "tile4" };
		let cursor = { "usesCursor":true, "cursorIndexes":[] }
		let actions = [];
		let lines   = [
			// TITLE
			`SELECT A HOST`,
			
			// ROWS (added later.)
			//
		];
		_APP.m_config.remoteConf.forEach( (d,i)=>{ 
			let newYIndex = lines.length + dims.y+2;
			actions.push(
				function(){ 
					console.log("TODO: CONNECT TO : ", d.name, d.URL);
				}
			);
			cursor.cursorIndexes.push( newYIndex );
			lines.push(`  ${d.name}`);
		} );

		return thisScreen.shared.createDialogObject({
			"name"   : "choose_host",
			...dims, ...tiles, ...cursor,
			"lines"  : lines,
			"actions": actions
		});
	},
	intVars: function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		// console.log("SCREEN: initVars:", _APP.currentScreen);

		thisScreen.menu1 = {
			dialogs: {
				// OLDchoose_host: thisScreen.shared.createDialogObject({
				// 	"name"   : "choose_host",
				// 	"x": 3, "y": 7, "w": 24, "h": 7,
				// 	 "t1": "tile3", "t2": "tile2", "t3": "tile4",
				// 	 "bgClearTile": "tile4",
				// 	 "usesCursor":true,
				// 	"lines"  : [
				// 		` : PROCESS.EXIT`,
				// 		` : PM2 RESTART`,
				// 		` : CLOSE DIALOG BOX`,
				// 	],
				// 	"actions": [
				// 		function(){ console.log("ACTION: LINE 0"); this.thisScreen.shared.process.exit();    }, // LINE 0
				// 		function(){ console.log("ACTION: LINE 1"); this.thisScreen.shared.pm2    .restart(); }, // LINE 1,
				// 		function(){ 
				// 			// try{ console.log("*ACTION**: this:", this);                      } catch(e){ console.log("fail: 1"); } 
				// 			try{ 
				// 				console.log("*ACTION**: this.close:", this.box.close); 
				// 				this.box.close();
				// 			} 
				// 			catch(e){ console.log("fail: 4"); } 
				// 		}, // LINE 2,
				// 	],
				// }),
				choose_host: thisScreen.createDialog_choose_host(),
			},
		};
	},
	init: async function(){
		_APP.timeIt("init", "s", "host_select");
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		console.log("SCREEN: init:", _APP.currentScreen);

		thisScreen.intVars();
	
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Top rows.
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen.substring(4)} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 

		// Bottom row.
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 

		// Initial drawing of the battery and time.
		thisScreen.shared.time   .display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");

		thisScreen.menu1.dialogs.choose_host.active=true;

		// Init vars.
		thisScreen.inited = true;
		_APP.timeIt("init", "e", "host_select");

	},
	
	// MAIN FUNCTION:
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			// Display/Update the time/battery data sections as needed.
			_APP.timeIt("time", "s", "host_select");
			thisScreen.shared.time.updateIfNeeded(0, 29, "tile3");
			_APP.timeIt("time", "e", "host_select");

			_APP.timeIt("battery", "s", "host_select");
			thisScreen.shared.battery.updateIfNeeded(23, 29, "tile3");
			_APP.timeIt("battery", "e", "host_select");

			if(thisScreen.menu1.dialogs.choose_host.active){
				thisScreen.menu1.dialogs.choose_host.box.draw();
				thisScreen.menu1.dialogs.choose_host.cursor.move();
				thisScreen.menu1.dialogs.choose_host.cursor.blink();
				thisScreen.menu1.dialogs.choose_host.text.select();
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;