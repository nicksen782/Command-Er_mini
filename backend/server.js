console.log("...LOADING...");
// OS/Filesystem requires. 
const os       = require('os');
const fs       = require('fs');
const path     = require('path');
// const logbuffer = require('console-buffer')(100);

// Express/WS requires. 
const server   = require('http').createServer();
const express  = require('express');
const app      = express();

// Compression in Express.
const zlib = require('zlib');
const compression = require('compression');
const shouldCompress = (req, res) => {
	if (req.headers['x-no-compression']) {
		return false
	}
	return compression.filter(req, res);
}

// Modules (includes routes.)
const _APP   = require('./modules/M_main.js')(app, express, server);

// Remove old instances by port.
let clearOldInstancesByPort = async function(display=false){
	// Remove old processes if they are still there. 
	let ports = [
		_APP.m_config.config.server.port,
		// _APP.m_config.config.python.ws.port,
		// _APP.m_config.config.python.http.port,
	];

	// Remove any potential duplicates in the ports list. 
	ports = [...new Set(ports)] ;

	console.log("Removing any old processes using ports: ", ports);

	//
	await async function(portNumbers){ 
		return new Promise(async function(resolve,reject){
			let rpbp = require('../RemoveProcessByPort/removeprocess.js').run;
			let resp; 
			for(let i=0; i<portNumbers.length; i+=1){
				let port = portNumbers[i];
				try{ resp = await rpbp(port).catch( (e)=>{throw e;}) } 
				catch(e){ resp = e; } 

				// Normal run? 
				if(resp.text){ 
					if(display){
						console.log("RemoveProcessByPort:", resp.text); 
					}
				}
				// Error.
				else{ console.log("RemoveProcessByPort:", resp);  }
			}
			resolve();
		});
	}(ports);
};

// START THE SERVER.
(async function startServer(){
	const compressionObj = {
		filter    : shouldCompress,
		memLevel  : zlib.constants.Z_DEFAULT_MEMLEVEL,
		level     : zlib.constants.Z_DEFAULT_COMPRESSION,
		chunkSize : zlib.constants.Z_DEFAULT_CHUNK,
		strategy  : zlib.constants.Z_DEFAULT_STRATEGY,
		threshold : 0,
		windowBits: zlib.constants.Z_DEFAULT_WINDOWBITS,
	};
	app.use( compression(compressionObj) );
	
	// Load the config first.
	await _APP.m_config.get_config();
	_APP.m_config.configLoaded = true;

	// Remove old processes.
	await clearOldInstancesByPort(false);
	// await clearOldInstancesByPort(true);
	
	let conf = {
		host       : _APP.m_config.config.server.host, 
		port       : _APP.m_config.config.server.port, 
	};

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

	server.listen(conf, async function () {
		app.use(compression({ filter: shouldCompress }));

		app.use('/'    , express.static(path.join(process.cwd(), './public')));
		app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));
		app.use('/tileset_8x8.png', express.static(path.join(process.cwd(), './tileset_8x8.png')));
		app.use('/tile_coords.json', express.static(path.join(process.cwd(), './backend/tile_coords.json')));
		
		let appTitle = "Command-Er_Mini";
		process.title = appTitle;
		console.log();
		console.log("*".repeat(45));
		console.log(`NAME    : ${appTitle}`);
		console.log(`STARTDIR: ${process.cwd()}`);
		console.log(`SERVER  : ${_APP.m_config.config.server.host}:${_APP.m_config.config.server.port}`);
		console.log("*".repeat(45));
		console.log();

		await _APP.module_inits();

		// console.log(`ROUTES:`);
		// printRoutes(); 
		
		// console.log(`CONFIG:`);
		// console.log(_APP.m_config.config);
		
		// console.log(`MODULE LOAD TIMES:`);
		// printModuleLoadTimes(); 

		// console.log("");
		console.log("*".repeat(45));
		console.log("READY");
		console.log("");

		// Init the canvas
		_APP.fps.init();
		_APP.stats.setFps( _APP.m_config.config.lcd.fps );
		await _APP.m_lcd.canvas.init();

		// SET AN LCD DRAW TO BE NEEDED.
		_APP.m_lcd.canvas.lcdUpdateNeeded = true;
		// await _APP.m_lcd.canvas.updateFrameBuffer();
		
		// Start the _APP.appLoop.
		_APP.schedule_appLoop();
	});

})();