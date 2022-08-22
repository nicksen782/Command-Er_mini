const fs = require('fs');
const path = require('path');
const os   = require('os');

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
	// Variables.
	inited: false,
	lines:[],
	counter : 0,
	lastCounterUpdate:null,
	screenEndDelayMs:null,

	// Constants
	screenEndDelaySeconds:1,

	intVars: function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];

		// DIALOGS.
		thisScreen.menu1 = {
			dialogs: {
				WELCOME: thisScreen.shared.createDialogObject({
					"name"   : "WELCOME",
					"x": 1, "y": 11, "w": 28, "h": 8,
					 "t1": "tile3", "t2": "tile1", "t3": "tile1",
					 "bgClearTile": "tile4",
					 "usesCursor":false,
					"lines"  : [
						`    COMMAND-ER: MINI    `,
						``,
						` 2022 NICKOLAS ANDERSEN `,
						`      (NICKSEN782)      `,
					],
					"actions": [
						function(){ 
							this.box.close();
						}, // LINE 2,
					],
				})
			},
		};

		// VARIABLES.
		thisScreen.lines = [];
		thisScreen.lastCounterUpdate = performance.now();
		thisScreen.screenEndDelayMs = thisScreen.shared.secondsToFramesToMs(thisScreen.screenEndDelaySeconds);
		thisScreen.counter = 2;

	},

	init: async function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		console.log("SCREEN: init:", _APP.currentScreen);
		thisScreen.intVars();
	
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// // Top bars.
		_APP.m_draw.fillTile("tile2"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile3"         , 0, 2, ts.cols, 1); 
		
		// // Bottom bars.
		_APP.m_draw.fillTile("tile2"         , 0, ts.rows-1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile1"         , 0, ts.rows-2, ts.cols, 1); 
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-3, ts.cols, 1); 

		// COUNTDOWN.
		_APP.m_draw.print((thisScreen.counter-1).toString() , ts.cols-1 , ts.rows-1);

		// Init vars.
		thisScreen.inited = true;

		// ACTIVATE THE DIALOG.
		thisScreen.menu1.dialogs.WELCOME.active=true;
	},
	
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			if(thisScreen.menu1.dialogs.WELCOME.active){
				thisScreen.menu1.dialogs.WELCOME.box.draw();
				thisScreen.menu1.dialogs.WELCOME.cursor.move();
				thisScreen.menu1.dialogs.WELCOME.cursor.blink();
				thisScreen.menu1.dialogs.WELCOME.text.select();
			}

			if(performance.now() - thisScreen.lastCounterUpdate >= thisScreen.screenEndDelayMs ){
				thisScreen.counter -= 1;
				if(thisScreen.counter >= 1){
					_APP.m_draw.print((thisScreen.counter-1).toString() , ts.cols-1 , ts.rows-1);
				}
				else if(thisScreen.counter == 0){
					// thisScreen.shared.changeScreen.specific("m_s_test_1");
					thisScreen.shared.changeScreen.specific("m_s_host_select");
				}
				
				thisScreen.lastCounterUpdate = performance.now();
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;