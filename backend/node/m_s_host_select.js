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
	initing: false,
	inited: false,

	menu1: {}, // Populated via intVars.
	remoteConfigLoaded: false,
	activeRemote: {},
	remoteConfig: {},
	uuids: [],

	// CONSTANTS:
	
	// INIT:
	createDialog_choose_host: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			let dims = { "x": 0, "y": 4, "w": 30, "h": 22 };
			let tiles = { "t1": "tile3", "t2": "tile2", "t3": "tile4", "bgClearTile": "tile4" };
			let cursor = { "usesCursor":true, "cursorIndexes":[] }
			let cursors = { "t1":"cursor4", "t2":"cursor5" }
			let actions = [];
			let lines   = [
				// TITLE
				`SELECT A HOST`,
				
				// ROWS (added later.)
				//
			];
			for(let d of _APP.m_config.remoteConf){
				// Skip disabled hosts.
				if(d.disabled){ continue; }

				// Ping.
				try{
					let pingCheck = await _APP.screenLogic.shared.pingCheck(d.host, 1000);
					if(!pingCheck.alive){
						console.log("FAIL1: pingCheck:", d.host, pingCheck.alive);
					}
				}
				catch(e){
					console.log("FAIL2: pingCheck:", d.host, pingCheck.alive);
					continue;
				}

				// Has a "MINI"?
				try{ 
					let uuids = await _APP.fetch( `${d.URL}${d.getStatus}`, { method: "POST" } ); 
					uuids = await uuids.json(); 
					console.log(d.host, uuids);

					let newYIndex = lines.length + dims.y+2;
					actions.push(
						async function(){ 
							console.log("Get config data from: ", `${d.URL}${d.getAll}`);
							
							let json1;
							let json2;
							try{ 
								json1 = await _APP.fetch( `${d.URL}${d.getAll}`, { method: "POST" } ); 
								json1 = await json1.json();
								thisScreen.remoteConfig = json1;
								thisScreen.remoteConfigLoaded = true;
								thisScreen.activeRemote = d;
								
								json2 = await _APP.fetch( `${d.URL}${d.getUUIDs}`, { method: "POST" } ); 
								json2 = await json2.json();
								thisScreen.uuids = json2;
	
								// console.log("sections.length:", thisScreen.remoteConfig.sections.length);
								// console.log("groups.length  :", thisScreen.remoteConfig.groups.length);
								// console.log("commands.length:", thisScreen.remoteConfig.commands.length);
	
								if(!json2.length){
									console.log("No uuids have a 'mini' terminal attached.");
									thisScreen.menu1.dialogs.choose_host.box.close();
									thisScreen.menu1.dialogs.choose_host.active=true;
								}
								else{
									thisScreen.shared.changeScreen.specific("m_s_command_chooser");
								}
							}
							catch(e){ console.log("ERROR:", e); }
						}
					);
					cursor.cursorIndexes.push( newYIndex );

					lines.push(`  ${d.name}`);
				}
				catch(e){
					console.log("FAIL2: getStatus:", d.host);
					continue;
				}
			}

			let obj = thisScreen.shared.createDialogObject({
				"name"   : "choose_host",
				...dims, ...tiles, ...cursor,
				cursors:cursors,
				"lines"  : lines,
				"actions": actions
			});

			resolve(obj);
		});
	},
	intVars: async function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		// console.log("SCREEN: initVars:", _APP.currentScreen);

		thisScreen.menu1 = {
			dialogs: {
				choose_host: await thisScreen.createDialog_choose_host(),
			},
		};
		thisScreen.remoteConfigLoaded = false;
		thisScreen.remoteConfig = {};
	},
	init: async function(){
		_APP.timeIt("init", "s", __filename);
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		console.log("SCREEN: init:", _APP.currentScreen);
		thisScreen.initing = true;

		await thisScreen.intVars();
	
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

		_APP.timeIt("init", "e", __filename);

		thisScreen.initing = false;
		thisScreen.inited = true;
	},
	
	// MAIN FUNCTION:
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(thisScreen.initing){ resolve(); return; }
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }

			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			// Display/Update the time/battery data sections as needed.
			_APP.timeIt("time", "s", __filename);
			thisScreen.shared.time.updateIfNeeded(0, 29, "tile3");
			_APP.timeIt("time", "e", __filename);

			_APP.timeIt("battery", "s", __filename);
			thisScreen.shared.battery.updateIfNeeded(23, 29, "tile3");
			_APP.timeIt("battery", "e", __filename);

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