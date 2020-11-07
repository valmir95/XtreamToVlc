const request = require('request');
const { execSync } = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const rls = require('readline-sync');
const process = require('process');

const CONFIG_FILE_NAME = 'xtvConfig.json';
const SHORTCUT_NAME = 'StartVLC';
const M3U_FOLDER_NAME = 'm3u_files';


try {
	run();
} catch (error) {
	//TODO: Better error handling.
	console.log('Encountered error: ' + error);
}


function run(){
	let configObj;
    
	if (fsExtra.existsSync(CONFIG_FILE_NAME)) {
		let configFile = fsExtra.readFileSync(CONFIG_FILE_NAME);
		configObj = JSON.parse(configFile);
	}

	else{
		console.log('No config file present. Enter following information to create the config file: \n');
		configObj = getConfigFromUserInput();
		createConfigJson(configObj);   
	}

	initiateXtreamRequests(configObj);
}

function getConfigFromUserInput(){
	let hostInput = rls.question('Host (format: http://<domain>:<port>): ');
	let usernameInput = rls.question('Xtream username: ');
	let passwordInput = rls.question('Xtream password: ');
	let vlcPath = findVlcFromDefaultPath();
	let configObj = {host: hostInput, username: usernameInput, password: passwordInput, vlcPath: vlcPath};
	return configObj;
}

//TODO: Maybe get rid of requests package?
//TODO: Better function name
function initiateXtreamRequests(config){
	console.log(config);
	let categoryDict = {};

	//TODO: Structure
	if(config.host.charAt(config.host.length - 1) != '/') config.host += '/';

	//If vlc path is a directory, we try and append the executable.
	if(config.vlcPath != null && isDir(config.vlcPath)){
		if(config.vlcPath.charAt(config.vlcPath.length - 1) != '/') config.vlcPath += '/';
		config.vlcPath += 'vlc.' + getVlcFileExt();
	}


	fsExtra.emptyDirSync(M3U_FOLDER_NAME);


	let liveCategoriesUrl = config.host + 'player_api.php?username=' + config.username + '&password=' + config.password + '&action=get_live_categories';
	request({url: liveCategoriesUrl, json: true}, (error, res, body) => {
		//TODO: Needs better checks.
		if (!error && res.statusCode == 200 && Array.isArray(body)) {
			body.forEach(category => {
				categoryDict[category.category_id] = category.category_name; 
			});
			//TODO: Use promises instead
			fetchLiveChannels(config, categoryDict);
		}
    
		else{
			console.log('Something went wrong. Check if your username/password/host is correct.');
			if(error){
				console.log('\n Error: ' + error);
			}
		}
	});
    
}

//TODO: Use promises instead
function fetchLiveChannels(config, categoryDict){
	let liveChannelsUrl = config.host + 'player_api.php?username=' + config.username + '&password=' + config.password + '&action=get_live_streams';
	request({url: liveChannelsUrl, json: true}, (error, res, body) => {
		//TODO: Better error-checks
		if (!error && res.statusCode == 200 && Array.isArray(body)) {
			let m3uFileName = createM3u(config, categoryDict, body);

			if(fsExtra.pathExistsSync(config.vlcPath)){
				createShortcut();
				execSync(getExecCommand(config.vlcPath) + ' ' + M3U_FOLDER_NAME + '/' + m3uFileName);
			}
			else{
				console.log('Could not find VLC executable. Check your path in ' + CONFIG_FILE_NAME + ' and make sure it is correct.');
			}
		}

		else{
			console.log('Something went wrong. Check if your username/password/host is correct.');
			if(error){
				console.log('\n Error: ' + error);
			}
		}
	});
}

function createM3u(config, categoryDict, liveChannels){
	let fileHeader = '#EXTM3U url-tvg=""';
	let fileBody = '';

	liveChannels.forEach(liveChannel => {
		fileBody += '#EXTINF:-1 ' 
        + 'tvg-id=' + '"' + liveChannel.epg_channel_id + '"'
        + ' tvg-name=' + '"' + liveChannel.name + '"'
        + ' tvg-logo=' + '"' + liveChannel.stream_icon + '"'
        + ' group-title=' + '"' + categoryDict[liveChannel.category_id] + '"'
        + ',' + liveChannel.name
        + '\n' + config.host + 'live/' + config.username + '/' + config.password + '/' + liveChannel.stream_id + '.ts'
        + '\n';
	});

	let completeFileStr = fileHeader + '\n' + fileBody;
	//TODO: Use a better name
	let fileName = Date.now() + '.m3u';
	if (!fsExtra.existsSync(M3U_FOLDER_NAME)){
		fsExtra.mkdirSync(M3U_FOLDER_NAME);
	}
	fsExtra.appendFileSync(M3U_FOLDER_NAME + '/' + fileName, completeFileStr);
	return fileName;
    
}

function createConfigJson(configObj){
	let configObjCopy = Object.assign({}, configObj);
	if(configObjCopy.vlcPath == null){
		configObjCopy.vlcPath = '';
	}
	fsExtra.appendFileSync(CONFIG_FILE_NAME, JSON.stringify(configObjCopy, null, 4));
}

function createShortcut(){
	switch(process.platform){
	case 'win32':
		createBatFile();
		break;
	case 'darwin':
		createShFile();
		break;
	}
}

function createShFile(){
	let shortcutFileName = SHORTCUT_NAME + '.command';
	if(!fsExtra.pathExistsSync(shortcutFileName)){
		let cd = 'cd "' + process.cwd() + '"';
		let nodeExec = 'npm start';
		fsExtra.appendFileSync(shortcutFileName, cd + '\n' + nodeExec);
		fsExtra.chmodSync(shortcutFileName, '755');
	}
}

function createBatFile(){
	let shortcutFileName = SHORTCUT_NAME + '.bat';
	if(!fsExtra.pathExistsSync(shortcutFileName)){
		let pushd = 'pushd "' + process.cwd() + '"';
		let nodeExec = 'npm start';
		let pauseEnter = 'pause press [enter]';
		fsExtra.appendFileSync(shortcutFileName, pushd + '\n' + nodeExec + '\n' + pauseEnter);
	}
}

function getExecCommand(filePath){
	let execCommand = '';
	switch(process.platform){
	case 'win32':
		execCommand = getWindowsExecCommand(filePath);
		break;
	case 'darwin':
		execCommand = getMacExecCommand(filePath);
		break;
	case 'linux':
		//TODO: Add functionality
		break;
	}

	return execCommand;
}

function findVlcFromDefaultPath(){
	let path = null;
	const DEFAULT_WINDOWS_PATHS = [
		'C:/Program Files/VideoLAN/VLC/vlc.exe',
		'C:/Program Files (x86)/VideoLAN/VLC/vlc.exe'
	];

	const DEFAULT_MAC_PATHS = [
		'/Applications/vlc.app'
	];

	switch(process.platform){
	case 'win32':
		path = getPathFromList(DEFAULT_WINDOWS_PATHS);
		break;
	case 'darwin':
		path = getPathFromList(DEFAULT_MAC_PATHS);
		break;
	}
	return path;
}

function getPathFromList(pathList){
	for(let i = 0; i<pathList.length; i++){
		if(fsExtra.pathExistsSync(pathList[i])){
			return pathList[i];
		} 
	}
	return null;
}

function getWindowsExecCommand(filePath){
	if(filePath.charAt(0) != '"' && filePath.charAt(filePath -1) != '"'){
		return '"' + filePath + '"';
	}
	return filePath;
}

function getMacExecCommand(filePath){
	return 'open -a ' + filePath;
}

function isDir(pathItem) {
	return !path.extname(pathItem);
}

function getVlcFileExt(){
	let ext = '';
	switch(process.platform){
	case 'win32':
		ext = 'exe';
		break;
	case 'darwin':
		ext = 'app';
		break;
	}
	return ext;
}


