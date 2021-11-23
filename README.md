# Xtream to VLC

Originally a short script which facilitates and automates the use of Xtream api logins for use with VLC.
This is done by querying the channel list of the Xtream API and parsing it to an M3U file-format and then calling upon that file as an argument through the command line with VLC.
This was originally a private, quick and dirty script meant for personal use, hence the one file and deviation from good coding practices. Feel free to refactor and improve the project as you seem fit.

## Installation

The project requires [Node.js](https://nodejs.org/) to run.

Installation requires the following steps:

### Installation with git

```sh
git clone https://github.com/valmir95/XtreamToVlc.git
cd XtreamToVlc
npm install
npm start
```

### Installation manually

If you don't want/can't use git, you can also simply download the repository as a zip.
After you download it, unzip/extract the content to the desired folder. Open a command line inside of the repository folder directory (XtreamToVlc) and run the following commands, one by one:

```sh
npm install
npm start
```

### Instructions

Upon launching the script for the first time you will be prompted for your Xtream credentials. This entails the username, password and host. This generates a config file (xtvConfig.json) which can be edited at any point if needed. A shortcut to the script will also be generated for convenience (StartVLCWithXtream.bat for Windows, StartVLCWithXtream.command for Mac and StartVLCWithXtream.sh for Linux). You can copy/drag this file to the desktop or any desired location and simply double-click it to start VLC with the channel-list from Xtream.
