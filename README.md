# Xtream to VLC 

Originally a short script which facilitates and automates the use of Xtream api logins for use with VLC. 
This is done by querying the channel list of the Xtream API and parsing it to an M3U file-format and then calling upon that file as an argument through the command line with VLC. 
This was originally a private, quick and dirty script meant for personal use, hence the one file and deviation from good coding practices. Feel free to refactor and improve the project as you seem fit.

### Installation

The project requires [Node.js](https://nodejs.org/) to run.

At this moment in time only works for Windows and macOS.

Installation requires the following steps:
```sh
git clone https://github.com/valmir95/XtreamToVlc.git
cd XtreamToVlc
npm install
npm start
```
Upon launching the script for the first time you will be prompted for the Xtream credentials to pull data from. This entails the username, password and host. This generates a config file (xtvConfig.json) which can be edited at any point if needed. A shortcut to the script will also be generated for convenience, as you can simply launch it by double-clicking, no matter the location of the .bat/.sh file.

