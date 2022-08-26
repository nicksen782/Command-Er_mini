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
	doNotRun: false,

	menu1: {}, // Populated via intVars.
	currentSectionIndex: 0,
	sectionKeys : [],

	// CONSTANTS:
	
	// INIT:
	sendCommand: async function(body){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		
		body.uuid = _APP.screenLogic.screens["m_s_host_select"].uuid;
		let url =  `${_APP.screenLogic.screens["m_s_host_select"].activeRemote.URL}MINI/RUNCMD` ;
		let options = { 
			method: "POST", 
			headers : { 
				'Accept': 'application/json', 
				'Content-Type': 'application/json' 
			},
			body: JSON.stringify(body)
		} ;

		let json = await _APP.fetch( url, options );
		json = await json.json();
		console.log("RESPONSE:", json);
	},
	changeSection: function(newSection){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		// Default section name? 
		if(!newSection){ newSection = thisScreen.sectionKeys[0]; }

		// Display the section name. 
		// _APP.m_draw.print(` SECTION: ${newSection}`.padEnd(ts.cols, " ") , 0 , 2);

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
		let dims = { "x": 0, "y": 3, "w": 30, "h": 25 };
		let tiles = { "t1": "tile2", "t2": "tile2", "t3": "tile2", "bgClearTile": "tile4" };
		let cursor = { "usesCursor":true, "cursorIndexes":[] }
		let cursors = { "t1":"cursor4", "t2":"cursor5" }
		let actions = [];
		let filtered = _APP.screenLogic.screens["m_s_host_select"].remoteConfig.commands.filter(d=>d.sectionName==newSection);
		let lines   = [
			// SECTION
			`s:${newSection} (${thisScreen.sectionKeys.indexOf(newSection)+1}/${thisScreen.sectionKeys.length})`,

			// TITLE
			`COMMANDS (1-${Math.min(filtered.length,dims.h-6)} of ${filtered.length})`,
			
			// ROWS (added later.)
			//
		];
		// let lastGroupId = d.gId;
		let lastGroupId = null;
		filtered.forEach( (d,i,a)=>{ 
			if(lines.length+3>dims.h){ 
				console.log(" MAXED1", lines.length, i, a.length, "sectionName:", d.sectionName, ", groupName:", d.groupName, ", title:", d.title); 
				return ; 
			}
			// console.log(" ADDED ", lines.length, i, a.length, "sectionName:", d.sectionName, ", groupName:", d.groupName, ", title:", d.title);

			// New group?
			if(d.gId != lastGroupId){
				// console.log(`New group: ${d.groupName}(${d.gId}), Old groupId: ${lastGroupId}`);
				let numInGroup = _APP.screenLogic.screens["m_s_host_select"].remoteConfig.commands.filter(dd=>dd.groupName==d.groupName && dd.sectionName==d.sectionName).length;
				
				if(lines.length+4>dims.h){ 
					console.log(" MAXED2", lines.length, i, a.length, "sectionName:", d.sectionName, ", groupName:", d.groupName, ", title:", d.title); 
					return ; 
				}
				lines.push(``);
				lines.push(`g:${d.groupName} (${numInGroup})`);
				lastGroupId = d.gId;
			}

			// Add to group.
			let newYIndex = lines.length + dims.y+0;
			actions.push(
				function(){ 
					thisScreen.sendCommand( { type:"FROMCONFIG", cmd: d.cmd, sId: d.sId, gId: d.gId, cId: d.cId } );
				}
			);
			cursor.cursorIndexes.push( newYIndex );
			lines.push(`  c:${d.title}`);
		} );
		
		// Display the section name. 
		// _APP.m_draw.print(` SECTION: ${newSection}`.padEnd(ts.cols, " ") , 0 , 2);
		
		// Set the height of the box to the lines length. 
		dims.h = lines.length;

		return thisScreen.shared.createDialogObject({
			// "name"   : "choose_cmd",
			...dims, ...tiles, ...cursor,
			boxCount: 1,
			highlightLines: { "0":"tile_blue", "1":"tile_blue" },
			cursors: cursors,
			"lines"  : lines,
			"actions": actions
		});
	},
	intVars: async function(newSection){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];

		// Reset/populate the section keys and current section key index. 
		// Fail, return to m_s_host_select if the try throws and error.
		thisScreen.currentSectionIndex = 0;
		try{
			thisScreen.sectionKeys = (_APP.screenLogic.screens["m_s_host_select"].remoteConfig.sections.map(d=>d.name));
		}
		catch(e){
			console.log("ERROR: No remoteconfig was loaded?\n");
			console.log("... Returning to m_s_host_select.");
			thisScreen.shared.changeScreen.specific("m_s_host_select");
			thisScreen.doNotRun = true;
			return;
		}

		// If the newSection was not provided then use the first section. 
		if(!newSection){ newSection = thisScreen.sectionKeys[0]; }
		
		thisScreen.menu1 = {
			dialogs: {
				choose_cmd: thisScreen.createDialog_choose_cmd(newSection),
			},
		};

		thisScreen.doNotRun = false;
	},
	init: async function(){
		_APP.timeIt("init", "s", __filename);
		console.log("SCREEN: init:", _APP.currentScreen);
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		thisScreen.initing = true;

		_APP.screenLogic.screens["m_s_host_select"] = _APP.screenLogic.screens["m_s_host_select"];

		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");

		await thisScreen.intVars(null);
		if(thisScreen.doNotRun){ return; }
		
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		// Top rows.
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen.substring(4)} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);

		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.print(`REMOTE: ${_APP.screenLogic.screens["m_s_host_select"].activeRemote.name} (${_APP.screenLogic.screens["m_s_host_select"].uuid.split("-")[0]})` , 0 , 1);
		
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 

		// Bottom row.
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 

		// Initial drawing of the battery and time.
		thisScreen.shared.time   .display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");

		thisScreen.menu1.dialogs.choose_cmd.active=true;

		// Init vars.
		thisScreen.initing = false;
		thisScreen.inited = true;
		_APP.timeIt("init", "e", __filename);

		// console.log( Object.keys(_APP.screenLogic.screens["m_s_host_select"].remoteConfig) );
		// console.log( "sections.length   :", _APP.screenLogic.screens["m_s_host_select"].remoteConfig.sections.length);
		// console.log( "groups.length     :", _APP.screenLogic.screens["m_s_host_select"].remoteConfig.groups.length);
		// console.log( "commands.length   :", _APP.screenLogic.screens["m_s_host_select"].remoteConfig.commands.length);
		// console.log( "remoteConfigLoaded:", _APP.screenLogic.screens["m_s_host_select"].remoteConfigLoaded);
		// console.log( "activeRemote      :", _APP.screenLogic.screens["m_s_host_select"].activeRemote);
		// console.log( "uuid              :", _APP.screenLogic.screens["m_s_host_select"].uuid);
	},
	
	// MAIN FUNCTION:
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(thisScreen.initing){ resolve(); return; }
			if(thisScreen.doNotRun){ resolve(); return; }
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

			// SECTION NAVIGATION.
			if( _APP.m_gpio.isPress ("KEY_LEFT_PIN") ){
				if(thisScreen.currentSectionIndex - 1 >= 0   ) { 
					thisScreen.currentSectionIndex -= 1;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
				else{
					// console.log("You pressed LEFT but you are already at the beginning.", thisScreen.currentSectionIndex, thisScreen.sectionKeys.length-1);
					thisScreen.currentSectionIndex = thisScreen.sectionKeys.length-1;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
			}
			if( _APP.m_gpio.isPress ("KEY_RIGHT_PIN") ){
				if(thisScreen.currentSectionIndex + 1 <= thisScreen.sectionKeys.length-1 ) { 
					thisScreen.currentSectionIndex += 1;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
				else{
					// console.log("You pressed RIGHT but you are already at the END.", thisScreen.currentSectionIndex, thisScreen.sectionKeys.length-1);
					thisScreen.currentSectionIndex = 0;
					let newSection = thisScreen.sectionKeys[thisScreen.currentSectionIndex];
					thisScreen.changeSection( newSection );
				}
			}

			// PRESS CTRL+C ANYWHERE.
			if( _APP.m_gpio.isPress ("KEY2_PIN") ){
				await thisScreen.sendCommand( { type:"RAW", cmd: "\u0003" } );
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;