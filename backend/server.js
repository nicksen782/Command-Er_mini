// OS/Filesystem requires. 
const os       = require('os');
const fs       = require('fs');
const path     = require('path');

// Express/WS requires. 
const WSServer = require('ws').Server;
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

// WWS server start
const wss = new WSServer({ server: server });
server.on('request', app);

// Modules (includes routes.)
const _APP   = require('./modules/M_main.js')(app, express, wss);

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

	server.listen(conf, async function () {
		process.title = "commandermini";

		app.use('/'    , express.static(path.join(process.cwd(), './public')));
		app.use('/libs', express.static(path.join(process.cwd(), './node_modules')));

		app.use(compression({ filter: shouldCompress }));

		console.log();
		console.log("*".repeat(45));

		console.log(`NAME    : ${process.title}`);
		console.log(`STARTDIR: ${process.cwd()}`);
		console.log(`SERVER  : ${conf.host}:${conf.port}`);
		// console.log(`SHELL   : ${_APP.m_terms.shell}`);

		// console.log(`ROUTES:`);
		// let routes = _APP.getRoutePaths("manual", app).manual;
		// let maxes = {
		// 	"filename" : 0,
		// 	"method"   : 0,
		// 	"path"     : 0,
		// };
		// for(filename in routes){ if(maxes.filename < filename.length){ maxes.filename = filename.length; } }
		// for(filename in routes){ 
		// 	for(rec of routes[filename]){
		// 		if(rec.method.length > maxes.method ){ maxes.method = rec.method.length; } 
		// 		if(rec.path.length   > maxes.path   ){ maxes.path   = rec.path.length; } 
		// 	}
		// }

		// for(filename in routes){
		// 	for(rec of routes[filename]){
		// 		console.log(
		// 			`  ` +
		// 			`FILE: ${  (filename  ).padEnd(maxes.filename, " ")}` + " || " + 
		// 			`METHOD: ${(rec.method).padEnd(maxes.method  , " ")}` + " || " + 
		// 			`PATH: ${  (rec.path  ).padEnd(maxes.path    , " ")}` + " || " + 
		// 			`DESC: ${  (rec.desc  )}`+
		// 			``);
		// 		}
		// };

		console.log(`CONFIG:`);
		console.log(_APP.m_config.config);
		// console.log(maxes);

		console.log("");
		console.log("*".repeat(45));
		console.log("READY");
		console.log("");

		// console.log("converting...");
		// await _APP.m_cmdMgr.convertJSONtoDB();
		// console.log("save to file...");
		// await _APP.m_cmdMgr.convertDBtoJSONFile();
		// console.log("...DONE");
	});

})();