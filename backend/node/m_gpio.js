const Gpio  = require('onoff').Gpio;
// const fs = require('fs');
// const path = require('path');
// const os   = require('os');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// INPUTS - onoff gpio objects.
	inputs: {
		KEY_UP_PIN   : null,
		KEY_DOWN_PIN : null,
		KEY_LEFT_PIN : null,
		KEY_RIGHT_PIN: null,
		KEY_PRESS_PIN: null,
		KEY1_PIN     : null,
		KEY2_PIN     : null,
		KEY3_PIN     : null,
	},

	// OUTPUTS - onoff gpio objects.
	outputs: {
		BL_PIN       : null,
	},

	// Bitmasks for each input button.
	bits: {
		KEY_UP_PIN   :7,
		KEY_DOWN_PIN :6,
		KEY_LEFT_PIN :5,
		KEY_RIGHT_PIN:4,
		KEY_PRESS_PIN:3,
		KEY1_PIN     :2,
		KEY2_PIN     :1,
		KEY3_PIN     :0,
	},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				// Init the buttons.
				if( _APP.m_config.config.toggles.isActive_gpio ){ 
					_APP.consolelog("buttons_init", 2);
					await _MOD.buttons_init();
				}
				else{
					_APP.consolelog("m_gpio: module_init: GPIO DISABLED IN CONFIG", 2);
				}

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

	//
	states                    : {},
	states_prev               : 0,
	states_held               : 0,
	states_pressed            : 0,
	states_released           : 0,
	statesOverride            : {},
	statesOverride_flag       : false,
	statesOverride_cnt        : 0,
	statesOverride_cntDefault : 1, // 

	readAll: function(){
		return new Promise(function(resolve,reject){
			// Real button read?
			if(!_MOD.statesOverride_flag){
				for(k in _MOD.inputs){
					let value = _MOD.inputs[k].readSync() ? 1 : 0;
					_MOD.states[k] = value ? 1 : 0;
				}
			}

			// Asserted read - Not real buttons. Emulate a press of button and drop existing statuses.
			else{
				//
				if(_MOD.statesOverride_cnt == _MOD.statesOverride_cntDefault){
					// console.log("FIRST. (Push and hold)", _MOD.statesOverride_cnt);
					
					// Replace states with the statesOverride and clear statesOverride.
					for(let key in _MOD.statesOverride){
						_MOD.states[key] = _MOD.statesOverride[key];
						_MOD.statesOverride[key] = 0;
					}

					// Clear previous real button-based data.
					states_prev     = 0;
					states_held     = 0;
					states_pressed  = 0;
					states_released = 0;
					_MOD.statesOverride_cnt -= 1;
				}
				else if(_MOD.statesOverride_cnt >= 1){
					// console.log("STILL COUNTING. (prev/release)", _MOD.statesOverride_cnt);
					_MOD.statesOverride_cnt -= 1;
				}
				else{
					// console.log("DONE COUNTING. (nothing)", _MOD.statesOverride_cnt, "\n");
					// Clear the override flag.
					_MOD.statesOverride_flag = false;
					_MOD.statesOverride_cnt = 0;
				}
			}
				
			// Get the prev states. (Copy of states_held.)
			_MOD.states_prev = _MOD.states_held;

			// Determine the held states.
			for(let key in _MOD.bits){
				if(_MOD.states[key]){ _MOD.states_held |= (1 << _MOD.bits[key]); } 
				else{ _MOD.states_held &= ~(1 << _MOD.bits[key]); }
			}

			// Determine the pressed states.
			_MOD.states_pressed = _MOD.states_held & (_MOD.states_held ^ _MOD.states_prev);
			
			// Determine the released states.
			_MOD.states_released = _MOD.states_prev & (_MOD.states_held ^ _MOD.states_prev);
			
			// return _MOD.states;
			resolve( _MOD.states );
		});
	},

	setButtonOverrideValues: function(buttonStates){
		for(let key in buttonStates){
			_MOD.statesOverride[key] = buttonStates[key];
		}
		_MOD.statesOverride_flag = true;
		_MOD.statesOverride_cnt = _MOD.statesOverride_cntDefault;
	},

	// Utility functions for determining individual button states compared to the last read.
	isPrev : function(key){ return _MOD.states_prev     & (1 << _MOD.bits[key]) ? true : false },
	isHeld : function(key){ return _MOD.states_held     & (1 << _MOD.bits[key]) ? true : false },
	isPress: function(key){ return _MOD.states_pressed  & (1 << _MOD.bits[key]) ? true : false },
	isRele : function(key){ return _MOD.states_released & (1 << _MOD.bits[key]) ? true : false },

	// Inits the button states and adds listeners (watches) to the input buttons. 
	buttons_init: async function(){
		return new Promise(async function(resolve,reject){
			// Setup the GPIO buttons. 

			// INPUTS
			for(let key in _APP.m_config.config.gpio.inputs){
				let rec = _APP.m_config.config.gpio.inputs[key];
				_MOD.inputs[key]    = new Gpio( rec.pin , rec.dir, rec.edge, rec.options ); 
			}
			
			// OUTPUTS
			for(let key in _APP.m_config.config.gpio.outputs){
				let rec = _APP.m_config.config.gpio.outputs[key];
				_MOD.outputs[key]    = new Gpio( rec.pin , rec.dir, rec.options ); 
			}

			resolve();
		});
	},

};

module.exports = _MOD;