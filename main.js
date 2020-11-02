const request = require('request');
const { exec, execSync} = require("child_process");
const readline = require('readline');
const fsExtra = require('fs-extra');
const { config } = require('process');

const CONFIG_FILE_NAME = "xtvConfig.json";
const SHORTCUT_NAME = "StartVLC";
const M3U_FOLDER_NAME = "m3u_files";

if (fsExtra.existsSync(CONFIG_FILE_NAME)) {
    let configFile = fsExtra.readFileSync(CONFIG_FILE_NAME);
    console.log(JSON.parse(configFile));
    initiateXtreamRequests(JSON.parse(configFile));
}

else{
    console.log("No config file present. Enter following information to create the config file: \n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question("Host (including port): ", (host) => {
    
        rl.question("Username: ", (username) => {

            rl.question("Password: ", (password) => {
                rl.question("Vlc path (including the executable): ", (vlcPath) =>{
                    rl.close();
                    let configObj = {host: host, username: username, password: password, vlcPath: vlcPath};
                    createConfigJson(JSON.stringify(configObj));
                    initiateXtreamRequests(configObj);
                });
            });
        });
    
    });
}

//TODO: Maybe get rid of requests package?
//TODO: Refactoring. Some hardcoded strings.
//TODO: Better function name
function initiateXtreamRequests(config){
    let categoryDict = {};

    if(config.host.charAt(config.host - 1) != "/") config.host += "/";


    fsExtra.emptyDirSync(M3U_FOLDER_NAME);


    let liveCategoriesUrl = config.host + "player_api.php?username=" + config.username + "&password=" + config.password + "&action=get_live_categories";
    request({url: liveCategoriesUrl, json: true}, (error, res, body) => {
        console.log("Fetching live categories...");
        //TODO: Needs better checks.
        if (!error && res.statusCode == 200 && Array.isArray(body)) {
            body.forEach(category => {
                categoryDict[category.category_id] = category.category_name; 
            });
            //TODO: Use promises instead
            fetchLiveChannels(config, categoryDict);
        }
    
        else{
            console.log("Something went wrong. Check if your username/password/host is correct.");
            if(error){
                console.log("\n Error: " + error);
            }
        }
    });
    
}

//TODO: Use promises instead
function fetchLiveChannels(config, categoryDict){
    let liveChannelsUrl = config.host + "player_api.php?username=" + config.username + "&password=" + config.password + "&action=get_live_streams";
    request({url: liveChannelsUrl, json: true}, (error, res, body) => {
        //TODO: Better error-checks
        if (!error && res.statusCode == 200 && Array.isArray(body)) {
            let m3uFileName = createM3u(config, categoryDict, body);

            

            if(fsExtra.pathExistsSync(config.vlcPath)){
                createShortcut();
                execSync(getExecCommand(config.vlcPath) + " " + M3U_FOLDER_NAME + "/" + m3uFileName);
            }
            else{
                console.log("Could not find VLC executable. Check your path in " + CONFIG_FILE_NAME + " and make sure you also specify the executable at the end");
            }
            
        }

        else{
            console.log("Something went wrong. Check if your username/password/host is correct.");
            if(error){
                console.log("\n Error: " + error);
            }
        }
    });
}

function createM3u(config, categoryDict, liveChannels){
    let fileHeader = '#EXTM3U url-tvg=""';
    let fileBody = "";

    liveChannels.forEach(liveChannel => {
        fileBody += "#EXTINF:-1 " 
        + "tvg-id=" + "\"" + liveChannel.epg_channel_id + "\""
        + " tvg-name=" + "\"" + liveChannel.name + "\""
        + " tvg-logo=" + "\"" + liveChannel.stream_icon + "\""
        + " group-title=" + "\"" + categoryDict[liveChannel.category_id] + "\""
        + "," + liveChannel.name
        + "\n" + config.host + "live/" + config.username + "/" + config.password + "/" + liveChannel.stream_id + ".ts"
        + "\n";
    });

    let completeFileStr = fileHeader + "\n" + fileBody;
    //TODO: Get a better unique filename. This is not unique at all.
    let fileName = Date.now() + ".m3u";
    if (!fsExtra.existsSync(M3U_FOLDER_NAME)){
        fsExtra.mkdirSync(M3U_FOLDER_NAME);
    }
    fsExtra.appendFileSync(M3U_FOLDER_NAME + "/" + fileName, completeFileStr);
    return fileName;
    
}

//TODO: Fix hardcoded strings
function createConfigJson(data){
    fsExtra.appendFileSync(CONFIG_FILE_NAME, data);
}

function createShortcut(){
    switch(process.platform){
        case "win32":
            createBatFile();
            break;
        case "darwin":
            //TODO
            break;
    }
}

function createShFile(){

}

function createBatFile(){
    let shortcutFileName = SHORTCUT_NAME + ".bat";
    if(!fsExtra.pathExistsSync(shortcutFileName)){
        let pushd = 'pushd "' + process.cwd() + '"';
        let nodeExec = "node main.js";
        let pauseEnter = "pause press [enter]";
        fsExtra.appendFileSync(shortcutFileName, pushd + "\n" + nodeExec + "\n" + pauseEnter);
    }
}

function getExecCommand(filePath){
    let execCommand = "";
    switch(process.platform){
        case "win32":
            execCommand = getWindowsExecCommand(filePath);
            break;
        case "darwin":
            execCommand = getMacExecCommand(filePath);
            break;
        case "linux":
            //TODO: Add functionality
            break;
    }

    return execCommand;
}

function getWindowsExecCommand(filePath){
    if(filePath.charAt(0) != '"' && filePath.charAt(filePath -1) != '"'){
        return "\"" + filePath + "\"";
    }
    return filePath;
}

function getMacExecCommand(filePath){
    return "open -a " + filePath;
}


