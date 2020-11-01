const request = require('request');

let url = "https://www.reddit.com/r/popular.json";

let options = {json: true};



request(url, options, (error, res, body) => {
    if (error) {
        return  console.log(error)
    };

    if (!error && res.statusCode == 200) {
        // do something with JSON, using the 'body' variable
    };
});