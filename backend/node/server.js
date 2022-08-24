let lines = [
	"-".repeat(27)  ,
	" . . . L O A D I N G . . . " ,
	"-".repeat(27)  ,
];
// console.log("");
for(let i=0; i<lines.length; i+=1){
	console.log("\x1b[40m" + "\x1b[1;31m" + lines[i].padEnd(27, " ") + "\x1b[0m");
}
console.log("");

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
let _APP;

// Set the error handlers.
let setErrorHandlers = function(){
	// Created after reading this: https://blog.heroku.com/best-practices-nodejs-errors
	let cleanUpHasRan = false;

	let cleanUp = function(byWhat){
		// Only run once. 
		if(cleanUpHasRan){ return; }

		let funcs = [
			function appLoopCleanup(){
				if(_APP && _APP.drawLoop){
					// Remove the child process if it is set.
					try{
						if(_APP.drawLoop){ 
							_APP.drawLoop.pause();
							_APP.drawLoop.stop();
							_APP.drawLoop = null; 
							console.log(`  cleanUp: (via: ${byWhat}): appLoopCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): appLoopCleanup...FAILED`, e);
					}
				}
			},
			function displayCleanup(){
				if(_APP && _APP.m_websocket_python){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_python.cp_child){ 
							// _APP.m_websocket_python.cp_child.kill('SIGTERM'); 
							_APP.m_websocket_python.cp_child.kill('SIGINT'); 
							_APP.m_websocket_python.cp_child = null; 
							console.log(`  cleanUp: (via: ${byWhat}): displayCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): displayCleanup...FAILED`, e);
					}
				}
			},
			function pythonCleanup(){
				if(_APP && _APP.m_websocket_python){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_python.cp_child){ 
							// _APP.m_websocket_python.cp_child.kill('SIGTERM'); 
							_APP.m_websocket_python.cp_child.kill('SIGINT'); 
							_APP.m_websocket_python.cp_child = null; 
							console.log(`  cleanUp: (via: ${byWhat}): pythonCleanup... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): pythonCleanup...FAILED`, e);
					}
				}
			},
			function serverCleanup(){
				if(_APP && _APP.m_websocket_node){
					// Remove the child process if it is set.
					try{
						if(_APP.m_websocket_node.ws){ 
							console.log(`  cleanUp: (via: ${byWhat}): serverCleanup: websocket... DONE`);
							_APP.m_websocket_node.ws.close();
							_APP.m_websocket_node.ws = null;
						}
						if(_APP.server){
							_APP.server.close();
							console.log(`  cleanUp: (via: ${byWhat}): serverCleanup: server... DONE`);
						}
					}
					catch(e){
						console.log(`  cleanUp: (via: ${byWhat}): serverCleanup...FAILED`, e);
					}
				}
			},
		];
		
		for(let i=0; i<funcs.length; i+=1){ funcs[i](); }

		// Set the cleanUpHasRan flag.
		cleanUpHasRan = true;
	};

	process.on('beforeExit', code => {
		// Can make asynchronous calls
		console.log("\nHANDLER: beforeExit");
		cleanUp("beforeExit");
		// setTimeout(() => {
			console.log(`  Process will exit with code: ${code}`);
			process.exit(code)
		// }, 100)
	})

	process.on('exit', code => {
		// Only synchronous calls
		console.log("\nHANDLER: exit");
		cleanUp("exit");
		console.log(`  Process exited with code: ${code}`);
	})

	process.on('SIGTERM', signal => {
		console.log("\nHANDLER: SIGTERM");
		cleanUp("SIGTERM");
		console.log(`  Process ${process.pid} received a SIGTERM signal`);
		process.exit(0)
	})

	process.on('SIGINT', signal => {
		console.log("\nHANDLER: SIGINT");
		cleanUp("SIGINT");
		console.log(`  Process ${process.pid} has been interrupted`)
		process.exit(0)
	})

	process.on('uncaughtException', err => {
		console.log("\nHANDLER: uncaughtException");
		cleanUp("uncaughtException");
		console.log(`  Uncaught Exception:`, err);
		process.exit(1)
	})
	
	process.on('unhandledRejection', (reason, promise) => {
		console.log("\nHANDLER: unhandledRejection");
		cleanUp("unhandledRejection");
		console.log('  Unhandled rejection at ', promise, `reason: `, reason);
		process.exit(1)
	})	
};

// START THE SERVER.
(async function startServer(){
	// Set the error handlers.
	setErrorHandlers();

	// Create _APP.
	_APP   = await require(path.join(process.cwd(), './backend/node/M_main.js'))(app, express, server);
	
	//
	_APP.timeIt("FULL_STARTUP", "s", __filename);

	// Init _APP.
	_APP.module_init(_APP);

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

	// Add compression.
	app.use( compression(compressionObj) );

	// Default routes:
	app.use('/'    , express.static(path.join(process.cwd(), './public')));
	app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));

	// Init the modules.
	await _APP.module_inits();

	// Start the web server.
	let conf = {
		host: _APP.m_config.config.node.http.host, 
		port: _APP.m_config.config.node.http.port
	};

	_APP.consolelog(".".repeat(54), 0);
	_APP.timeIt("expressServerStart", "s", __filename);   
	_APP.consolelog("START: expressServerStart:", 0);
	
	// Remove the process if it already exists.
	let responses = await _APP.removeProcessByPort( [ _APP.m_config.config.node.http.port ], true );
	for(let i=0; i<responses.length; i+=1){ _APP.consolelog(responses[i], 4); }
	
	(async function startServer(){
		server.listen(conf, async function () {
			_APP.timeIt("expressServerStart", "e", __filename);
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("expressServerStart", "t", __filename).toFixed(3).padStart(9, " ")} ms`, 0);
			_APP.consolelog(".".repeat(54), 0);
			_APP.consolelog("");
			
			// console.log("-".repeat(45));
			// console.log(`SERVER STARTED`);
			// console.log("-".repeat(45));
			// console.log("");
			
			// Display system data (and time it.)
			_APP.displaySysData_init();

			let appTitle = "Command-Er_Mini";
			process.title = appTitle;
			
			let lines = [
				"*".repeat(27)                                                                              ,
				` NAME    : ${appTitle} `                                                                   ,
				` STARTDIR: ${process.cwd()} `                                                              ,
				` SERVER  : ${_APP.m_config.config.node.http.host}:${_APP.m_config.config.node.http.port} ` ,
				"*".repeat(27)                                                                              ,
			];
			// https://gist.github.com/JBlond/2fea43a3049b38287e5e9cefc87b2124
			console.log("");
			for(let i=0; i<lines.length; i+=1){
				console.log("\x1b[40m" + "\x1b[1;93m" + lines[i].padEnd(27, " ") + "\x1b[0m");
			}
			console.log("");

			// ROUTES
			printRoutes(); 
			console.log("");
			
			_APP.timeIt("FULL_STARTUP", "e", __filename);
			 
			lines = [
				"-".repeat(36)                                                                          ,
				` READY (STARTUP TIME: ${_APP.timeIt("FULL_STARTUP", "t", __filename).toFixed(3).padStart(9, " ")} ms) ` ,
				"-".repeat(36)                                                                          ,
			];
			console.log("");
			for(let i=0; i<lines.length; i+=1){
				console.log("\x1b[40m" + "\x1b[1;92m" + lines[i].padEnd(36, " ") + "\x1b[0m");
			}
			console.log("");

			// Start a new AppLoop.
			_APP.fps.init( _APP.m_config.config.node.fps );
			_APP.stats.setFps( _APP.m_config.config.node.fps );
			_APP.screenLogic.shared.doSharedInits()
			_APP.m_drawLoop.startAppLoop();
		});
	})();

})()