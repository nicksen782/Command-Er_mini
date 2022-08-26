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

	// File that provides the available hosts to connect to.
	remoteConf : [],

	// CONSTANTS:
	
	// INIT:
	createDialog_choose_host: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			let dims = { "x": 0, "y": 3, "w": 30, "h": 22 };
			let tiles = { "t1": "tile2", "t2": "tile2", "t3": "tile2", "bgClearTile": "tile4" };
			let cursor = { "usesCursor":true, "cursorIndexes":[] };
			let cursors = { "t1":"cursor4", "t2":"cursor5" };
			let highlightLines = {}; //{ "0":"tile_blue" };
			let actions = [];
			let topLines      = [ `SELECT A HOST`, `` ];
			let activeLines   = [ `AVAILABLE` ];
			let inActiveLines = [ `UNAVAILABLE` ];
			let totalLineLength = 0;
			
			for(let d of _APP.m_config.remoteConf){
				// Skip disabled hosts.
				if(d.disabled){ continue; }

				// Generate the total line length;
				totalLineLength = topLines.length + activeLines.length + inActiveLines.length;

				// Don't allow more lines than can fit.
				if( totalLineLength > dims.h){ 
					console.log(" MAXED1", activeLines.length); 
					break; 
				}

				// Ask each host for a list of UUIDs that have a "MINI" terminal.

				// Ping.
				try{
					let pingCheck = await _APP.screenLogic.shared.pingCheck(d.host, 1000);
					if(!pingCheck.alive){
						// console.log("FAIL: pingCheck (no response):", d.host, pingCheck.alive);
						inActiveLines.push(`${d.host.padEnd(14, " ") } (PING FAIL)`); 
						totalLineLength += 1;
						continue;
					}
				}
				catch(e){
					console.log("FAIL: pingCheck: (error thrown):", d.host, pingCheck.alive, e);
					inActiveLines.push(`${d.host.padEnd(14, " ") } (ping fail)`); 
					totalLineLength += 1;
					continue;
				}

				// Has a "MINI"?
				try{ 
					let resp = await _APP.fetch( `${d.URL}${d.getStatus}`, { method: "POST" } ); 
					let uuids;
					
					// Only accept JSON. 
					let contentType = resp.headers.get("Content-Type");
					if(contentType == "application/json; charset=utf-8"){
						try{ uuids = await resp.json(); }
						catch(e){
							console.log("ERROR: contentType:", contentType);
							console.log("ERROR: e:",  e);
							continue;
						}
					}
					// A text response indicates an error.
					else if(contentType == "text/html; charset=utf-8"){
						// console.log(`ERROR: NOT JSON: contentType: ${contentType}, status: ${resp.status}, statusText: ${resp.statusText}`);
						// console.log( await resp.text() );
						inActiveLines.push(`${d.host.padEnd(14, " ") } (ERROR)`); 
						totalLineLength += 1;
						continue; 
					}
					// Handle any potential edge-cases.
					else{ console.log(`ERROR (unexpected): NOT JSON: contentType: ${contentType}, status: ${resp.status}, statusText: ${resp.statusText}`); continue; }

					// Create the host line and all UUID lines.
					if(uuids.length){ 
						activeLines.push(`${d.host.padEnd(14, " ") }`); 
						totalLineLength += 1;

						// Create a line for each UUID.
						for(let uuid of uuids){
							// console.log("uuid:", uuid, `(TOTAL: ${uuids.length})`);

							let newYIndex = topLines.length + activeLines.length + dims.y+0;

							actions.push(
								async function(){ 
									// console.log("Get config data from: ", `${d.URL}${d.getAll}`);
									
									let remoteConfig;
									try{ 
										remoteConfig = await _APP.fetch( `${d.URL}${d.getAll}`, { method: "POST" } ); 
										remoteConfig = await remoteConfig.json();
										thisScreen.remoteConfig = remoteConfig;
										thisScreen.remoteConfigLoaded = true;
										thisScreen.activeRemote = d;
										thisScreen.uuid = uuid;
										thisScreen.menu1.dialogs.choose_host.box.close();
										thisScreen.shared.changeScreen.specific("m_s_command_chooser");
									}
									catch(e){ 
										console.log("ERROR:", e); 
									}
								}
							);
							cursor.cursorIndexes.push( newYIndex );
		
							activeLines.push(`   CLIENT UUID: ${uuid.split("-")[0]}`);
							totalLineLength += 1;
						}

						// Add a blank line after.
						activeLines.push(``); 
						totalLineLength += 1;
					}
					else{ 
						console.log(`${d.name}: NO AVAILABLE UUIDS SET TO 'MINI'`); 
						inActiveLines.push(`${d.host.padEnd(14, " ") } (NO MINI TERM)`); 
					}

				}
				catch(e){
					console.log("FAIL2: getStatus:", d.host, e);
					continue;
				}
			}

			// Combine the lines. 
			lines = [...topLines, ...activeLines, ...inActiveLines ];
			 
			// Highlight the top header line.
			highlightLines["0"] = "tile_blue";
			
			// If there are available hosts then highlight that header line. 
			highlightLines[(topLines.length).toString()] = "tile_orange";
			
			// If there are unavailable hosts then highlight that header line. 
			highlightLines[(topLines.length + activeLines.length).toString()] = "tile_red";

			// Set the height of the box to the lines length. 
			dims.h = lines.length;

			let obj = thisScreen.shared.createDialogObject({
				// "name"   : "choose_host",
				...dims, ...tiles, ...cursor,
				boxCount: 1,
				highlightLines: highlightLines,
				cursors:cursors,
				cursorX_adjust:1,
				"lines"  : lines,
				"actions": actions
			});

			resolve(obj);
		});
	},
	intVars: async function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		// console.log("SCREEN: initVars:", _APP.currentScreen);

		// Get the remoteConf file or create it if it does not exist.
		// await _APP.m_config.get_remote_conf(true); // Rereads the file from disk.
		await _APP.m_config.get_remote_conf(false); // Uses the cached copy if it has already been read.

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
		console.log("SCREEN: init:", _APP.currentScreen);
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		thisScreen.initing = true;

		await thisScreen.intVars();
		// 2affcaa4-2eb6-496e-bb4d-233ea32409b0
		// xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx

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

		// Init vars.
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