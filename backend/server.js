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

	await _APP.module_inits();

	let conf = {
		host       : _APP.m_config.config.server.host, 
		port       : _APP.m_config.config.server.port, 
	};

	let printRoutes = function(){
		let routes = _APP.getRoutePaths("manual", app).manual;
		
		// REST routes.
		console.log(`ROUTES: (REST)`);
		let maxes = { "filename" : 0, "method" : 0, "path" : 0 };
		for(filename in routes){ if(maxes.filename < filename.length){ maxes.filename = filename.length; } }
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
		for(filename in routes){ if(maxes.filename < filename.length){ maxes.filename = filename.length; } }
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

	server.listen(conf, async function () {
		let appTitle = "Command-Er_Mini";
		process.title = appTitle;

		app.use(compression({ filter: shouldCompress }));

		app.use('/'    , express.static(path.join(process.cwd(), './public')));
		app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));

		console.log();
		console.log("*".repeat(45));

		console.log(`NAME    : ${appTitle}`);
		console.log(`STARTDIR: ${process.cwd()}`);
		console.log(`SERVER  : ${conf.host}:${conf.port}`);

		printRoutes(); 
		
		console.log(`CONFIG:`);
		console.log(_APP.m_config.config);

		console.log("");
		console.log("*".repeat(45));
		console.log("READY");
		console.log("");
	});

})();