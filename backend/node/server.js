console.log("...LOADING...\n");

// OS/Filesystem requires. 
const os       = require('os');
const fs       = require('fs');
const path     = require('path');

// Express/WS requires. 
const express  = require('express');
const app      = express();
const server   = require('http').createServer();
server.on('request', app); 

// Compression in Express.
const zlib = require('zlib');
const compression = require('compression');
const shouldCompress = (req, res) => {
	if (req.headers['x-no-compression']) {
		return false
	}
	return compression.filter(req, res);
}
const compressionObj = {
	filter    : shouldCompress,
	memLevel  : zlib.constants.Z_DEFAULT_MEMLEVEL,
	level     : zlib.constants.Z_DEFAULT_COMPRESSION,
	chunkSize : zlib.constants.Z_DEFAULT_CHUNK,
	strategy  : zlib.constants.Z_DEFAULT_STRATEGY,
	threshold : 0,
	windowBits: zlib.constants.Z_DEFAULT_WINDOWBITS,
};

// Modules (routes are added per module via their module_init method.)
const _APP   = require(path.join(process.cwd(), './backend/node/M_main.js'))(app, express, server);

// START THE SERVER.
(async function startServer(){
	_APP.timeIt("_STARTUP_", "s");

	// Load the config.
	_APP.consolelog("START: module_init: m_config :", 0);        
	_APP.timeIt("m_config", "s"); await _APP.m_config.module_init(_APP); _APP.timeIt("m_config", "e");
	_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_config", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);

	// Remove any lingering processes that use these ports:
	_APP.timeIt("removeProcessByPort", "s");   
	_APP.consolelog("START: removeProcessByPort:", 0);        
	await _APP.removeProcessByPort(
		[
			_APP.m_config.config.node.http.port, 
			_APP.m_config.config.python.ws.port, 
			// _APP.m_config.config.python.http.port 
		], true
	);
	_APP.timeIt("removeProcessByPort", "e");
	_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("removeProcessByPort", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
	// console.log("");
	
	let printRoutes = function(){
		let routes = _APP.getRoutePaths("manual", app).manual;
		
		// REST routes.
		console.log(`ROUTES: (REST)`);
		let maxes = { "filename" : 0, "method" : 0, "path" : 0 };
		for(filename in routes){ { if(maxes.filename < filename.length){ maxes.filename = filename.length; } } }
		for(filename in routes){ 
			for(rec of routes[filename]){
				if(rec.method != "ws"){
					if(rec.method.length > maxes.method ){ maxes.method = rec.method.length; } 
					if(rec.path.length   > maxes.path   ){ maxes.path   = rec.path.length; } 
				}
			}
		}
		for(filename in routes){
			for(rec of routes[filename]){
				if(rec.method != "ws"){
					console.log(
						`  ` +
						`FILE: ${  (filename  ).padEnd(maxes.filename, " ")}` + " || " + 
						`METHOD: ${(rec.method).padEnd(maxes.method  , " ")}` + " || " + 
						`PATH: ${  (rec.path  ).padEnd(maxes.path    , " ")}` + " || " + 
						`DESC: ${  (rec.desc  )}`+
						``);
				}
			}	
		};

		// WS routes.
		console.log("");
		console.log(`ROUTES: (WEBSOCKET)`);
		maxes = { "filename" : 0, "method" : 0, "path" : 0, "args": 0 };
		for(filename in routes){ { if(maxes.filename < filename.length){ maxes.filename = filename.length; } } }
		for(filename in routes){ 
			for(rec of routes[filename]){
				if(rec.method == "ws"){
					if(rec.method.length > maxes.method ){ maxes.method = rec.method.length; } 
					if(rec.path.length   > maxes.path   ){ maxes.path   = rec.path.length; } 
					if(rec.args.length){
						rec.args.forEach(function(d){
							if(d.length   > maxes.args   ){ maxes.args   = d.length; } 
						});
					}
				}
			}
		}
		for(filename in routes){
			for(rec of routes[filename]){
				if(rec.method == "ws"){
					console.log(
						`  ` +
						`FILE: ${  ( filename           ).padEnd(maxes.filename, " ")}` + " || " + 
						`METHOD: ${( rec.method         ).padEnd(maxes.method  , " ")}` + " || " + 
						`PATH: ${  ( rec.path           ).padEnd(maxes.path    , " ")}` + " || " + 
						`ARGS: ${  ( rec.args.join(",") ).padEnd(maxes.args    , " ")}` + " || " + 
						`DESC: ${  ( rec.desc  )}`+
						``);
				}
			}	
		};
	};

	let printModuleLoadTimes = function(){
		let keys = [
			"M_main",
			"m_config",
			"WSServer",
			"m_gpio",
			"m_battery",
			"m_lcd",
			"m_screenLogic",
			"m_s_timing",
		];
		let maxKeyLen = 0;
		let totalTime = 0;
		for(let key of keys){ if(key.length > maxKeyLen){ maxKeyLen = key.length; } }
		for(let key of keys){ 
			console.log( `  ${key.padEnd(maxKeyLen, " ")} : ${_APP.timeIt(key, "t").toFixed(3).padStart(8, " ")}` );
			totalTime += _APP.timeIt(key, "t");
		}
		console.log("  "+"-".repeat(24));
		console.log(`  ${totalTime.toFixed(3).padEnd(maxKeyLen, " ")}: ${"TOTAL".padStart(8, " ")}`);
	};

	await _APP.module_inits();

	let conf = {
		host: _APP.m_config.config.node.http.host, 
		port: _APP.m_config.config.node.http.port
	};

	// server.on('connection', function(req, socket, head){
	// 	// console.log("Client connected: req   : ", req);
	// 	// console.log("Client connected: socket: ", socket);
	// 	// console.log("Client connected: head  : ", head);
	// });
	// server.on('error', function(e) {
	// 	console.log("Server connection error: " + e);
	// });
	
	(async function startServer(){
		server.listen(conf, async function () {
			app.use( compression(compressionObj) );

			// Default routes:
			app.use('/'    , express.static(path.join(process.cwd(), './public')));
			app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));

			let appTitle = "Command-Er_Mini";
			process.title = appTitle;
			// console.log("");
			console.log("*".repeat(45));
			console.log(`NAME    : ${appTitle}`);
			console.log(`STARTDIR: ${process.cwd()}`);
			console.log(`SERVER  : ${_APP.m_config.config.node.http.host}:${_APP.m_config.config.node.http.port}`);
			console.log("*".repeat(45));
			console.log("");

			// console.log(`ROUTES:`);
			printRoutes(); 
			console.log("");
			
			// console.log(`CONFIG:`);
			// console.log(_APP.m_config.config);
			// console.log("");
			
			// console.log(`MODULE LOAD TIMES:`);
			// printModuleLoadTimes(); 
			// console.log("");

			_APP.timeIt("_STARTUP_", "e");

			console.log("-".repeat(45));
			console.log(`READY (STARTUP TIME: ${_APP.timeIt("_STARTUP_", "t").toFixed(3).padStart(9, " ")} ms)` );
			console.log("-".repeat(45));
			console.log("");

			_APP.fps.init();
			_APP.stats.setFps( _APP.m_config.config.node.fps );
			_APP.schedule_appLoop();
		});
	})();

})()