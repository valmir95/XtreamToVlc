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
node main.js
```
If no config file is present, you will be asked for your credentials, host and VLC path. This will generate a config file which is going to be used in the future.
