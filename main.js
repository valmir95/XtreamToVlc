const request = require('request');
const fs = require('fs');
const { exec, execSync} = require("child_process");
const readline = require('readline');
const fsExtra = require('fs-extra')

let configPath = "xtvConfig.json";
let m3uFolderName = "m3u_files";

if (fs.existsSync(configPath)) {
    let configFile = fs.readFileSync(configPath);
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
    //This is because of Windows' awful handling of spacing in paths...
    if(config.vlcPath.charAt(0) != '"' && config.vlcPath.charAt(config.vlcPath -1) != '"') config.vlcPath = "\"" + config.vlcPath + "\"";

    fsExtra.emptyDirSync(m3uFolderName);


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
            execSync(config.vlcPath + " " + m3uFolderName + "/" + m3uFileName);
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
    if (!fs.existsSync(m3uFolderName)){
        fs.mkdirSync(m3uFolderName);
    }
    fs.appendFileSync(m3uFolderName + "/" + fileName, completeFileStr);
    return fileName;
    
}

//TODO: Fix hardcoded strings
function createConfigJson(data){
    fs.appendFileSync(configPath, data);
}


