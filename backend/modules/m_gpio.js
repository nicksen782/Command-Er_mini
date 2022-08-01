const Gpio  = require('onoff').Gpio;
// const fs = require('fs');
// const path = require('path');
// const os   = require('os');

let _APP = null;

let _MOD = {
	// INPUTS
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

	outputs: {
		BL_PIN       : null,
	},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Init the buttons.
			if( _APP.m_config.config.gpio.active ){ 
				await _MOD.buttons_init();
			}
			else{
				console.log("m_gpio: module_init: GPIO DISABLED IN CONFIG");
			}

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		_APP.addToRouteList({ path: "/pressAndRelease_button", method: "post", args: [], file: __filename, desc: "pressAndRelease_button" });
		app.post('/pressAndRelease_button'    ,express.json(), async (req, res) => {
			try{ 
				let result = await _MOD.pressAndRelease_button(req.body.button); 
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});

		_APP.addToRouteList({ path: "/toggle_pin", method: "post", args: [], file: __filename, desc: "toggle_pin" });
		app.post('/toggle_pin'    ,express.json(), async (req, res) => {
			try{ 
				let result = await _MOD.toggle_pin(req.body.button); 
				res.json(result);
			}
			catch(e){
				res.json(e);
			}
		});
	},

	// Intended for the backlight.
	toggle_pin: async function(buttonKey){
		return new Promise(async function(resolve,reject){
			if( _APP.m_config.config.gpio.active ){
				let currentState = _APP.m_gpio.outputs[buttonKey].readSync() ? 1 : 0;
				let newState     = currentState ? 0 : 1;
				_APP.m_gpio.outputs[buttonKey].writeSync(newState);
				resolve(`toggle_pin: ${buttonKey} to: ${newState}`);
			}
			else{
				console.log("m_gpio: toggle_pin: GPIO DISABLED IN CONFIG");
				resolve(`toggle_pin: ${buttonKey} GPIO DISABLED IN CONFIG`);
			}
		});
	},

	// Performs the action as if the actual button was pressed and then quickly released.
	pressAndRelease_button: async function(buttonKey){
		return new Promise(async function(resolve,reject){
			_APP.m_gpio.buttonHandler(buttonKey, 1);
			await new Promise(function(res,rej){
				setTimeout(function(){
					_APP.m_gpio.buttonHandler(buttonKey, 0);
					resolve(`pressAndRelease_button: ${buttonKey}`);
				}, 10);
			});
		});
	},

	//
	states: {},
	states_held    : 0,
	states_prev    : 0,
	states_pressed : 0,
	states_released: 0,
	// game.btnPrev1     = game.btnHeld1;
	// game.btnHeld1     = joypad1_status_lo;
	// game.btnPressed1  = game.btnHeld1 & (game.btnHeld1 ^ game.btnPrev1);
	// game.btnReleased1 = game.btnPrev1 & (game.btnHeld1 ^ game.btnPrev1);
	readAll: function(){
		for(k in _MOD.inputs){
			let value = _MOD.inputs[k].readSync() ? 1 : 0;
			if(value){
				_MOD.states[k] = 1;
			}
			else{
				_MOD.states[k] = 0;
			}
		}
		
		// Get the prev states.
		_MOD.states_prev = _MOD.states_held;

		// Get the held states. (current state.)
		if(_MOD.states['KEY_UP_PIN']   ){ _MOD.states_held |= (1 << 7); } else{ _MOD.states_held &= ~(1 << 7); }
		if(_MOD.states['KEY_DOWN_PIN'] ){ _MOD.states_held |= (1 << 6); } else{ _MOD.states_held &= ~(1 << 6); }
		if(_MOD.states['KEY_LEFT_PIN'] ){ _MOD.states_held |= (1 << 5); } else{ _MOD.states_held &= ~(1 << 5); }
		if(_MOD.states['KEY_RIGHT_PIN']){ _MOD.states_held |= (1 << 4); } else{ _MOD.states_held &= ~(1 << 4); }
		if(_MOD.states['KEY_PRESS_PIN']){ _MOD.states_held |= (1 << 3); } else{ _MOD.states_held &= ~(1 << 3); }
		if(_MOD.states['KEY1_PIN']     ){ _MOD.states_held |= (1 << 2); } else{ _MOD.states_held &= ~(1 << 2); }
		if(_MOD.states['KEY2_PIN']     ){ _MOD.states_held |= (1 << 1); } else{ _MOD.states_held &= ~(1 << 1); }
		if(_MOD.states['KEY3_PIN']     ){ _MOD.states_held |= (1 << 0); } else{ _MOD.states_held &= ~(1 << 0); }

		// Get the pressed states.
		_MOD.states_pressed = _MOD.states_held & (_MOD.states_held ^ _MOD.states_prev);
		
		// Get the released states.
		_MOD.states_released = _MOD.states_prev & (_MOD.states_held ^ _MOD.states_prev);
		
		return _MOD.states;
	},

	// Pipes the button inputs to their handler based on _APP.currentScreen.
	buttonHandler: async function(key, state){
		// console.log("key, state:", key, state);
		switch(_APP.currentScreen){
			case "main"         : { _APP.m_screenLogic.screens[_APP.currentScreen].buttons(key, state); break; }
			case "timings_test" : { _APP.m_screenLogic.screens[_APP.currentScreen].buttons(key, state); break; }
			case "drawingTest1" : { _APP.m_screenLogic.screens[_APP.currentScreen].buttons(key, state); break; }
			default: { console.log("buttonHandler: unknown currentScreen:", _APP.currentScreen); break; }
		}
	},

	// Inits the button states and adds listeners (watches) to the input buttons. 
	buttons_init: async function(){
		return new Promise(async function(resolve,reject){
			// Setup the GPIO buttons. 

			// INPUTS
			_APP.m_gpio.inputs.KEY_UP_PIN    = new Gpio( 6 , 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY_DOWN_PIN  = new Gpio( 19, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY_LEFT_PIN  = new Gpio( 5 , 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY_RIGHT_PIN = new Gpio( 26, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY_PRESS_PIN = new Gpio( 13, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY1_PIN      = new Gpio( 21, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY2_PIN      = new Gpio( 20, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			_APP.m_gpio.inputs.KEY3_PIN      = new Gpio( 16, 'in', 'rising', {activeLow:true, debounceTimeout: 10} ); 
			
			// OUTPUTS
			_APP.m_gpio.outputs.BL_PIN  = new Gpio( 24, 'high' ); // Output, default to high.

			// Add the button handler to each button. 
			// for(let key in _APP.m_gpio.inputs){
			// 	_APP.m_gpio.inputs[key].watch((err, value) => {
			// 		if(err){ console.log("err:", err); return; }
			// 		_APP.m_gpio.buttonHandler(key, value);
			// 	});
			// }

			resolve();
		});
	},

};

module.exports = _MOD;