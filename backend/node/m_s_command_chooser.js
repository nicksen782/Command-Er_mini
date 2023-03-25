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
	
	pingCheck_timeout  : 1000, // How long to wait for the ping. 
	pingCheck_lat_ms   : 5000, // How often to ping.
	pingCheck_last     : 0,    // Timestamp of the last successful ping.
	pingCheck_missed   : 0,    // Count of missed pings. 
	pingCheck_missedmax: 10,   // Max number of missed pings.
	pingCheck_evenOdd  : 0,    // Flag to toggle the ping indicator.

	menu1: {}, // Populated via intVars.
	currentSectionIndex: 0,
	sectionKeys : [],

	// CONSTANTS:
	
	// INIT:
	sendCommand: async function(body){
		// Examples for body:
		// body: {
		//   type: 'FROMCONFIG',
		//   cmd: '',
		//   sId: 1, gId: 1, cId: 1, 
		//   uuid: '70030cb2-b358-44a6-9dcb-68b5b947b015'
		// }
		// body: {
		//   type: 'RAW',
		//   cmd: '\x03',
		//   sId: 0, gId: 0, cId: 0, 
		//   uuid: '70030cb2-b358-44a6-9dcb-68b5b947b015'
		// }

		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		body.uuid = _APP.screenLogic.screens["m_s_host_select"].uuid;
		let url =  `${_APP.screenLogic.screens["m_s_host_select"].activeRemote.URL}MINI/RUNCMD` ;
		let options = { 
			method: "POST", 
			headers : { 
				'Accept': 'application/json', 
				'Content-Type': 'application/json' 
			},
			body: JSON.stringify(body)
		};

		// Draw the command active indicator.
		_APP.m_draw.print("*", 16, ts.rows-1); 
		
		// Send the command. 
		let json = await _APP.fetch( url, options, 5000 );
		json = await json.json();
		
		// Remove the command active indicator.
		_APP.m_draw.print(" ", 16, ts.rows-1); 

		console.log("sendCommand:", json);
	},
	STILLCONNECTED: async function(body = {}, timeoutMs){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		body.uuid = _APP.screenLogic.screens["m_s_host_select"].uuid;
		let url =  `${_APP.screenLogic.screens["m_s_host_select"].activeRemote.URL}MINI/STILLCONNECTED` ;
		let options = { 
			method: "POST", 
			headers : { 
				'Accept': 'application/json', 
				'Content-Type': 'application/json' 
			},
			body: JSON.stringify(body)
		};

		// Draw the command active indicator.
		_APP.m_draw.print("*", 16, ts.rows-1); 
		
		// Send the command. 
		let json = await _APP.fetch( url, options, timeoutMs );
		// console.log("JSON:", json);
		json = await json.json();
		
		// Remove the command active indicator.
		_APP.m_draw.print(" ", 16, ts.rows-1); 

		// console.log("STILLCONNECTED:", json);
		return json.active;
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
					thisScreen.sendCommand( { type:"FROMCONFIG", cmd: "", sId: d.sId, gId: d.gId, cId: d.cId } );
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

		//?
		// _APP.screenLogic.screens["m_s_host_select"] = _APP.screenLogic.screens["m_s_host_select"];

		// console.log(`uuid: ${_APP.screenLogic.screens["m_s_host_select"].uuid}`);
		// _APP.screenLogic.screens["m_s_host_select"].uuid}

		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");

		await thisScreen.intVars(null);
		if(thisScreen.doNotRun){ return; }
		
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd; let ts = conf.tileset;

		// Top rows.
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`${_APP.currentScreen.substring(4).toUpperCase()}` , 0 , 0);

		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		// _APP.m_draw.print(`REMOTE: ${_APP.screenLogic.screens["m_s_host_select"].activeRemote.name} (${_APP.screenLogic.screens["m_s_host_select"].uuid.split("-")[0]})` , 0 , 1);
		_APP.m_draw.print(`REMOTE: ${_APP.screenLogic.screens["m_s_host_select"].activeRemote.name}` , 0 , 1);
		
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

		// Init the pingCheck timer.
		thisScreen.pingCheck_last = performance.now();
		thisScreen.pingCheck_missed = 0;

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

			// Back to host_select.
			if( _APP.m_gpio.isPress ("KEY1_PIN") ){
				thisScreen.shared.changeScreen.specific("m_s_host_select");
				resolve(); return; 
			}

			// PRESS CTRL+C ANYWHERE.
			if( _APP.m_gpio.isPress ("KEY2_PIN") ){
				thisScreen.sendCommand( { type:"RAW", cmd: "\u0003", sId: 0, gId: 0, cId: 0 } );
			}

			// TODO: 
			if( _APP.m_gpio.isPress ("KEY3_PIN") ){
			}

			// Do we do a pingCheck against the host?
			if(performance.now() - thisScreen.pingCheck_last > thisScreen.pingCheck_lat_ms){
				try{
					// PING CHECK.
					// let host = _APP.screenLogic.screens["m_s_host_select"].activeRemote.host;
					// let pingCheck = await _APP.screenLogic.shared.pingCheck(host, thisScreen.pingCheck_timeout);
					// pingCheck = pingCheck.alive;

					// CHECK IF THE UUID IS ACTIVE.
					let pingCheck = await thisScreen.STILLCONNECTED({}, thisScreen.pingCheck_timeout);
					
					// Did the ping fail? 
					if(!pingCheck){
						// Increment the pings missed counter.
						thisScreen.pingCheck_missed += 1;

						// Update the timestamp.
						thisScreen.pingCheck_last = performance.now();
						
						// Has the ping failed too many times?
						if(thisScreen.pingCheck_missed >= thisScreen.pingCheck_missedmax){
							// Return to the m_s_host_select screen. 
							thisScreen.shared.changeScreen.specific("m_s_host_select");
						}
						// Display the number of missed pings.
						else{
							_APP.m_draw.print(`${thisScreen.pingCheck_missed}`, 29, 0);
						}
					}
					else{
						// Update the timestamp.
						thisScreen.pingCheck_last = performance.now();

						// Display the activity character.
						if(thisScreen.pingCheck_evenOdd){ _APP.m_draw.print(` `, 29, 0); }
						else{ _APP.m_draw.print(`*`, 29, 0); }

						// Toggle pingCheck_evenOdd.
						thisScreen.pingCheck_evenOdd = !thisScreen.pingCheck_evenOdd;

						// Reset the missed pings count. 
						thisScreen.pingCheck_missed = 0;
					}
				}
				catch(e){
					// Error has occurred. Return to the m_s_host_select screen. 
					console.log("Failure with ping:", e);
					thisScreen.shared.changeScreen.specific("m_s_host_select");
				}
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;
