const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Add routes.
			_APP.consolelog("  addRoutes");
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

};

module.exports = _MOD;

// WEBSOCKET: Send framebuffer.
// updateWsClients: function(fb_data){
	// _APP.timeIt("ws_buff_send", "s");
	// _MOD.draw.buff_abgr = fb_data;
	// _APP.m_lcd.WebSocket.sendToAll(_APP.m_draw.draw.buff_abgr);
	// _APP.timeIt("ws_buff_send", "e");
	// _MOD.draw.clearDrawingFlags();
// },