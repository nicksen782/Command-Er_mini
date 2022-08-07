try { process.chdir(__dirname); }
catch (err) { console.log('Could not change working directory: ' + err); process.exit(1); }

let fs = require("fs");
let config = require("./config.json");

// Get the LCD config.
let c = config.lcd;
let ts = c.tileset;

function create_coordsByIndex(){
	return new Promise(async function(resolve,reject){
		// Outputs.
		let byIndex = [];
		let _cols = ts.cols;
		let _rows = ts.rows;

		// Create the outputs. 
		let lastIndex=0;
		for(let row=0;row<_rows;row+=1){
			for(let col=0;col<_cols;col+=1){
				let index = ( row * ( _cols * c.tilesInCol ) ) + ( col * c.tilesInCol );
				byIndex.push([col, row, index, lastIndex]); 
				lastIndex+=1;
			}
		}

		// Turn it into formatted JSON text.
		let text = `[\n`;
		for(let i=0; i< byIndex.length; i+=1){
			let value = byIndex[i];
			// Values
			let x      = value[0];
			let y      = value[1];
			let index1 = value[2];
			let index2 = value[3];

			// Paddings.
			let x_p      = 2 - x     .toString().length;
			let y_p      = 2 - y     .toString().length;
			let index1_p = 4 - index1.toString().length;
			let index2_p = 4 - index2.toString().length;

			// Value
			let v = ``;
			v+=`${" ".repeat(x_p)     }${x},`;
			v+=`${" ".repeat(y_p)     }${y},`;
			v+=`${" ".repeat(index1_p)}${index1},`;
			v+=`${" ".repeat(index2_p)}${index2}`;

			// Comma.
			let comma = i != byIndex.length-1 ? "," : "";

			// Add the line.
			text += `  [ ${v} ]${comma}\n`;
		}
		text += `]`;

		// Return the data.
		resolve(text);
	});
}
function create_indexByCoords(){
	return new Promise(async function(resolve,reject){
		// Outputs.
		let byCoord = [];
		let _cols = ts.cols;
		let _rows = ts.rows;

		// Create the outputs. 
		for(let row=0;row<_rows;row+=1){
			byCoord.push([]);
			for(let col=0;col<_cols;col+=1){
				let index = ( row * ( _cols * c.tilesInCol ) ) + ( col * c.tilesInCol );
				byCoord[row].push(index);
			}
		}
		// Turn it into formatted JSON text.
		let text = `[\n`;
		for(let row=0;row<_rows;row+=1){
			text += "  [ ";
			for(let col=0;col<_cols;col+=1){
				let comma = col+1 < _cols ? "," : "";
				let padding = 4 - byCoord[row][col].toString().length;
				text += `${" ".repeat(padding)}${byCoord[row][col]}${comma}`;
			}
			let comma = row+1 < _rows ? "," : "";
			text += ` ]${comma}\n`;
		}
				
		text += `]`;

		// Return the data.
		resolve(text);
	});
}
function create_TileLookups(filename){
	return new Promise(async function(resolve,reject){
		// Get the tileCoords file. 
		let tileCoords = fs.readFileSync(filename, {encoding:'utf8'});

		// Parse the file to JSON.
		tileCoords = JSON.parse(tileCoords);

		// Outputs.
		let tileIdsByTilename = {}
		let tilenamesByIndex = []
		
		// Create the outputs. 
		for(let key in tileCoords){
			tileIdsByTilename[key] = tilenamesByIndex.length;
			tilenamesByIndex.push(key)
		}

		// Return the outputs. 
		resolve({
			tileIdsByTilename:tileIdsByTilename,
			tilenamesByIndex:tilenamesByIndex,
		});
	});
}

async function writeFileAsync(data){
	return new Promise(
		function(resolve,reject){
			fs.writeFile(data.filename, data.filedata, (err) => {
				if (err) { console.log(err); reject(error); return }
				console.log(`WRITTEN: ${data.filename}`);
				resolve();
			});
		}
	)
}

async function main(regenAnyway=false){
	// Files:
	let fileName_coordsByIndex = "./coordsByIndex.json";
	let fileName_indexByCoords = "./indexByCoords.json";
	let fileName_tileCoords    = "./tileCoords.json";

	// Exists: 
	// let fileExists_coordsByIndex = fs.existsSync( fileName_coordsByIndex );
	// let fileExists_indexByCoords = fs.existsSync( fileName_indexByCoords );
	// let fileExists_tileCoords    = fs.existsSync( fileName_tileCoords );

	let filesToWrite_proms = [];

	// Does coordsByIndex.json exist?
	// if(!fileExists_coordsByIndex || regenAnyway){
	{
		let fileData_coordsByIndex = await create_coordsByIndex();
		let data = {"filename":fileName_coordsByIndex, "filedata":fileData_coordsByIndex};
		filesToWrite_proms.push(writeFileAsync(data));
	}
	
	// Does indexByCoords.json exist?
	// if(!fileExists_indexByCoords || regenAnyway){
	{
		let fileData_indexByCoords = await create_indexByCoords();
		let data = {"filename":fileName_indexByCoords, "filedata":fileData_indexByCoords};
		filesToWrite_proms.push(writeFileAsync(data));
	}

	// Does tileCoords.json exist?
	// if(!fileExists_tileCoords || regenAnyway){
	{
		let fileData_tileCoords = await create_TileLookups(fileName_tileCoords);
		
		let data1 = {"filename":"./tileIdsByTilename.json", "filedata":JSON.stringify(fileData_tileCoords.tileIdsByTilename,null,1)};
		filesToWrite_proms.push(writeFileAsync(data1));
		
		let data2 = {"filename":"./tilenamesByIndex.json", "filedata":JSON.stringify(fileData_tileCoords.tilenamesByIndex,null,1)};
		filesToWrite_proms.push(writeFileAsync(data2));
	}
	
	// Await for files to finish.
	await Promise.all(filesToWrite_proms);
	console.log("DONE");
}

// main(false);
// main(true);
main();