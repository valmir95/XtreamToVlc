const request = require('request');
const { execSync } = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const rls = require('readline-sync');
const process = require('process');

const CONFIG_FILE_NAME = 'xtvConfig.json';
const SHORTCUT_NAME = 'StartVLCWithXtream';
const M3U_FOLDER_NAME = 'm3u_files';

try {
    run();
} catch (error) {
    //TODO: Better error handling.
    errorOnWait(error);
}

function run() {
    let configObj = getConfigObj();
    initiateXtreamRequests(configObj);
}

function getConfigObj(){
    let configObj; 
    if (fsExtra.existsSync(CONFIG_FILE_NAME)) {
        try {
            let configFile = fsExtra.readFileSync(CONFIG_FILE_NAME);
            configObj = JSON.parse(configFile);
        } catch (error) {
            console.log('Could not read ' + CONFIG_FILE_NAME + '. Please enter the following information again to generate a new file: ');
            fsExtra.removeSync(CONFIG_FILE_NAME);
            configObj = getConfigFromUserInput();
            createConfigJson(configObj);
        }
        
    } else {
        console.log(
            'No config file present. Enter following information to create the config file: \n'
        );
        configObj = getConfigFromUserInput();
        createConfigJson(configObj);
    }

    return configObj;
}

function getConfigFromUserInput() {
    let hostInput = rls.question('Host (format: http://<domain>:<port>): ');
    let usernameInput = rls.question('Xtream username: ');
    let passwordInput = rls.question('Xtream password: ');
    let vlcPath = findVlcFromDefaultPath();
    if(!vlcPath){
        vlcPath = rls.question('Could not find VLC at the default location. If VLC is installed, enter the directory here: ');
    }
    return {
        host: hostInput,
        username: usernameInput,
        password: passwordInput,
        vlcPath: vlcPath,
    };
}

//TODO: Maybe get rid of requests package?
//TODO: Better function name
function initiateXtreamRequests(config) {
    console.log(config);
    let categoryDict = {};

    //TODO: Structure
    if (config.host.charAt(config.host.length - 1) != '/') config.host += '/';

    //If vlc path is a directory, we try and append the executable.
    if (process.platform != 'linux' && config.vlcPath != null && isDir(config.vlcPath)) {
        if (config.vlcPath.charAt(config.vlcPath.length - 1) != '/')
            config.vlcPath += '/';
        config.vlcPath += 'vlc.' + getVlcFileExt();
    }

    fsExtra.emptyDirSync(M3U_FOLDER_NAME);

    let liveCategoriesUrl =
        config.host +
        'player_api.php?username=' +
        config.username +
        '&password=' +
        config.password +
        '&action=get_live_categories';
    request({ url: liveCategoriesUrl, json: true }, (error, res, body) => {
        //TODO: Needs better checks.
        if (!error && res.statusCode == 200 && Array.isArray(body)) {
            body.forEach((category) => {
                categoryDict[category.category_id] = category.category_name;
            });
            //TODO: Use promises instead
            fetchLiveChannels(config, categoryDict);
        } else {
            let errorMsg =
                'Could not connect to host. Check your host or username/password credentials';
            if (error) {
                errorMsg += '\n' + error;
            }
            errorOnWait(new Error(errorMsg));
        }
    });
}

//TODO: Use promises instead
function fetchLiveChannels(config, categoryDict) {
    let liveChannelsUrl =
        config.host +
        'player_api.php?username=' +
        config.username +
        '&password=' +
        config.password +
        '&action=get_live_streams';
    request({ url: liveChannelsUrl, json: true }, (error, res, body) => {
        //TODO: Better error-checks
        if (!error && res.statusCode == 200 && Array.isArray(body)) {
            let m3uFileName = createM3u(config, categoryDict, body);
            if (fsExtra.pathExistsSync(config.vlcPath)) {
                createShortcut();
                let execCommand = getExecCommand(
                    config.vlcPath,
                    M3U_FOLDER_NAME + '/' + m3uFileName
                );
                execSync(execCommand);
            } else {
                console.log(
                    'Could not find VLC executable. Check your path in ' +
                        CONFIG_FILE_NAME +
                        ' and make sure it is correct.'
                );
            }
        } else {
            let errorMsg =
                'Could not connect to host. Check your host or username/password credentials';
            if (error) {
                errorMsg += '\n' + error;
            }
            errorOnWait(new Error(errorMsg));
        }
    });
}

function createM3u(config, categoryDict, liveChannels) {
    let fileHeader = '#EXTM3U';
    let fileBody = '';

    liveChannels.forEach((liveChannel) => {
        fileBody +=
            '#EXTINF:-1 ' +
            'tvg-id=' +
            '"' +
            liveChannel.epg_channel_id +
            '"' +
            ' tvg-name=' +
            '"' +
            liveChannel.name +
            '"' +
            ' tvg-logo=' +
            '"' +
            liveChannel.stream_icon +
            '"' +
            ' group-title=' +
            '"' +
            categoryDict[liveChannel.category_id] +
            '"' +
            ',' +
            liveChannel.name +
            '\n' +
            config.host +
            'live/' +
            config.username +
            '/' +
            config.password +
            '/' +
            liveChannel.stream_id +
            '.ts' +
            '\n';
    });

    let completeFileStr = fileHeader + '\n' + fileBody;
    //TODO: Use a better name
    let fileName = Date.now() + '.m3u';
    if (!fsExtra.existsSync(M3U_FOLDER_NAME)) {
        fsExtra.mkdirSync(M3U_FOLDER_NAME);
    }
    fsExtra.appendFileSync(M3U_FOLDER_NAME + '/' + fileName, completeFileStr);
    return fileName;
}

function createConfigJson(configObj) {
    let configObjCopy = Object.assign({}, configObj);
    if (configObjCopy.vlcPath == null) {
        configObjCopy.vlcPath = '';
    }
    fsExtra.appendFileSync(
        CONFIG_FILE_NAME,
        JSON.stringify(configObjCopy, null, 4)
    );
}

function createShortcut() {

    if(process.platform == 'win32'){
        createBatFile();
    }
    else{
        createShFile();
    }
}

function createShFile() {
    let fileExt = '.sh';
    if(process.platform == 'darwin'){
        fileExt = '.command';
    }
    let shortcutFileName = SHORTCUT_NAME + fileExt;
    if (!fsExtra.pathExistsSync(shortcutFileName)) {
        let cd = 'cd "' + process.cwd() + '"';
        let nodeExec = 'npm start';
        fsExtra.appendFileSync(shortcutFileName, cd + '\n' + nodeExec);
        fsExtra.chmodSync(shortcutFileName, '755');
    }
}

function createBatFile() {
    let shortcutFileName = SHORTCUT_NAME + '.bat';
    if (!fsExtra.pathExistsSync(shortcutFileName)) {
        let pushd = 'pushd "' + process.cwd() + '"';
        let nodeExec = 'npm start';
        let pauseEnter = 'pause press [enter]';
        fsExtra.appendFileSync(
            shortcutFileName,
            pushd + '\n' + nodeExec + '\n' + pauseEnter
        );
    }
}

function getExecCommand(vlcPath, m3uFilePath) {
    let execCommand = '';
    switch (process.platform) {
    case 'win32':
        execCommand = getWindowsExecCommand(vlcPath, m3uFilePath);
        break;
    case 'darwin':
        execCommand = getMacExecCommand(vlcPath, m3uFilePath);
        break;
    case 'linux':
        execCommand = getLinuxExecCommand(vlcPath, m3uFilePath);
        break;
    }

    return execCommand;
}

function getWindowsExecCommand(vlcPath, m3uFilePath) {
    let execCommand = vlcPath + ' ' + m3uFilePath;
    if (vlcPath.charAt(0) != '"' && vlcPath.charAt(vlcPath - 1) != '"') {
        execCommand = '"' + vlcPath + '" ' + m3uFilePath;
    }
    return execCommand;
}

function getMacExecCommand(vlcPath, m3uFilePath) {
    return 'open -a ' + vlcPath + ' ' + m3uFilePath;
}

function getLinuxExecCommand(vlcPath, m3uFilePath) {
    return vlcPath + ' ' + m3uFilePath;
}

function findVlcFromDefaultPath() {
    let vlcPath = null;
    const DEFAULT_WINDOWS_PATHS = [
        'C:/Program Files/VideoLAN/VLC/vlc.exe',
        'C:/Program Files (x86)/VideoLAN/VLC/vlc.exe',
    ];

    const DEFAULT_MAC_PATHS = ['/Applications/vlc.app'];

    const DEFAULT_LINUX_PATHS = ['/usr/bin/vlc'];

    switch (process.platform) {
    case 'win32':
        vlcPath = getPathFromList(DEFAULT_WINDOWS_PATHS);
        break;
    case 'darwin':
        vlcPath = getPathFromList(DEFAULT_MAC_PATHS);
        break;
    
    case 'linux':
        vlcPath = getPathFromList(DEFAULT_LINUX_PATHS);
        break;
    }

    return vlcPath;
}

function getPathFromList(pathList) {
    for (let i = 0; i < pathList.length; i++) {
        if (fsExtra.pathExistsSync(pathList[i])) {
            return pathList[i];
        }
    }
    return null;
}

function isDir(pathItem) {
    return !path.extname(pathItem);
}

function getVlcFileExt() {
    let ext = '';
    switch (process.platform) {
    case 'win32':
        ext = 'exe';
        break;
    case 'darwin':
        ext = 'app';
        break;
    }
    return ext;
}

function errorOnWait(error){
    let errMsg = error.message;
    if(typeof error === 'string' || error instanceof String){
        errMsg = error;
    }
    console.log(errMsg);
    rls.question('Program exited. Press any key to continue...');
}
