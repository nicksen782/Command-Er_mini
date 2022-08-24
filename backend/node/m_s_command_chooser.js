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
	currentSectionIndex: 0,
	sectionKeys : [],

	// CONSTANTS:
	
	// INIT:
	changeSection: function(newSection){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		// Default section name? 
		if(!newSection){ newSection = thisScreen.sectionKeys[0]; }

		// Display the section name. 
		_APP.m_draw.print(` SECTION: ${newSection}`.padEnd(ts.cols, " ") , 0 , 2);

		// Close existing? 
		if(thisScreen.menu1.dialogs.choose_cmd) { thisScreen.menu1.dialogs.choose_cmd.box.close(); }
		
		// Create dialog. 
		thisScreen.menu1.dialogs.choose_cmd = thisScreen.createDialog_choose_cmd(newSection);
		
		// Set dialog as active. 
		thisScreen.menu1.dialogs.choose_cmd.active=true;
	},
	createDialog_choose_cmd: function(newSection){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;
		let dims = { "x": 0, "y": 4, "w": 30, "h": 22 };
		let tiles = { "t1": "tile3", "t2": "tile2", "t3": "tile4", "bgClearTile": "tile4" };
		let cursor = { "usesCursor":true, "cursorIndexes":[] }
		let actions = [];
		let lines   = [
			// TITLE
			`SELECT A COMMAND`,
			
			// ROWS (added later.)
			//
		];
		thisScreen.host_select.remoteConfig.commands.filter(d=>d.sectionName==newSection).forEach( (d,i)=>{ 
			if(i>dims.h-6){ return ; }
			let newYIndex = lines.length + dims.y+2;
			actions.push(
				async function(){ 
					json = await _APP.fetch( 
						`${thisScreen.host_select.activeRemote.URL}MINI/RUNCMD`, 
						{ 
							method: "POST", 
							headers : { 
								'Accept': 'application/json', 
								'Content-Type': 'application/json' 
							},
							body: JSON.stringify({
								cmd: d.cmd,
								sId: d.sId,
								gId: d.gId,
								cId: d.cId,
								uuid: thisScreen.host_select.uuids[0],
							})
						} 
					); 
					json = await json.json();
					console.log("RESPONSE:", json);
				}
			);
			cursor.cursorIndexes.push( newYIndex );
			lines.push(`  ${d.title}`);
		} );

		// Display the section name. 
		_APP.m_draw.print(` SECTION: ${newSection}`.padEnd(ts.cols, " ") , 0 , 2);

		return thisScreen.shared.createDialogObject({
			"name"   : "choose_cmd",
			...dims, ...tiles, ...cursor,
			"lines"  : lines,
			"actions": actions
		});
	},
	intVars: function(newSection){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];

		thisScreen.currentSectionIndex = 0;
		thisScreen.sectionKeys = (thisScreen.host_select.remoteConfig.sections.map(d=>d.name));

		if(!newSection){ newSection = thisScreen.sectionKeys[0]; }

		thisScreen.menu1 = {
			dialogs: {
				choose_cmd: thisScreen.createDialog_choose_cmd(newSection),
			},
		};
	},
	init: async function(){
		_APP.timeIt("init", "s", __filename);
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		thisScreen.host_select = _APP.screenLogic.screens["m_s_host_select"];
		// console.log("SCREEN: init:", _APP.currentScreen);
		
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");

		thisScreen.intVars(null);
		
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		// Top rows.
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen.substring(4)} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);

		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.print(` REMOTE: ${thisScreen.host_select.activeRemote.name}` , 0 , 1);
		
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 

		// Bottom row.
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 

		// Initial drawing of the battery and time.
		thisScreen.shared.time   .display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");

		thisScreen.menu1.dialogs.choose_cmd.active=true;

		// Init vars.
		thisScreen.inited = true;
		_APP.timeIt("init", "e", __filename);

		// console.log( Object.keys(thisScreen.host_select.remoteConfig) );
		// console.log( "sections.length   :", thisScreen.host_select.remoteConfig.sections.length);
		// console.log( "groups.length     :", thisScreen.host_select.remoteConfig.groups.length);
		// console.log( "commands.length   :", thisScreen.host_select.remoteConfig.commands.length);
		// console.log( "remoteConfigLoaded:", thisScreen.host_select.remoteConfigLoaded);
		// console.log( "activeRemote      :", thisScreen.host_select.activeRemote);
		// console.log( "uuids             :", thisScreen.host_select.uuids);
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
			_APP.timeIt("time", "s", __filename);
			thisScreen.shared.time.updateIfNeeded(0, 29, "tile3");
			_APP.timeIt("time", "e", __filename);

			_APP.timeIt("battery", "s", __filename);
			thisScreen.shared.battery.updateIfNeeded(23, 29, "tile3");
			_APP.timeIt("battery", "e", __filename);

			if(thisScreen.menu1.dialogs.choose_cmd.active){
				thisScreen.menu1.dialogs.choose_cmd.box.draw();
				thisScreen.menu1.dialogs.choose_cmd.cursor.move();
				thisScreen.menu1.dialogs.choose_cmd.cursor.blink();
				thisScreen.menu1.dialogs.choose_cmd.text.select();
			}

			if     ( _APP.m_gpio.isPress ("KEY_LEFT_PIN") ){
				if(thisScreen.currentSectionIndex - 1 >= 0   ) { 
					thisScreen.currentSectionIndex -= 1;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
				else{
					console.log("You pressed LEFT but you are already at the beginning.", thisScreen.currentSectionIndex, thisScreen.sectionKeys.length-1);
				}
			}
			else if( _APP.m_gpio.isPress ("KEY_RIGHT_PIN") ){
				if(thisScreen.currentSectionIndex + 1 <= thisScreen.sectionKeys.length-1 ) { 
					thisScreen.currentSectionIndex += 1;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
				else{
					console.log("You pressed RIGHT but you are already at the END.", thisScreen.currentSectionIndex, thisScreen.sectionKeys.length-1);
				}
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;