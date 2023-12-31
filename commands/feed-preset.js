const config = require('../config/default.json')
const uconfig = require('../config/usersettings.json')
const { parentPort, workerData } = require('worker_threads');
const { d1, d2, d3 } = workerData;
var provfeed = d1;
var n = d2;
var nick = d3;
let Parser = require('rss-parser');
let parser = new Parser({
    headers: {'User-Agent': config.feed.useragent},
});
const striptags = require("striptags");
const moment = require('moment'); 
const tz = require('moment-timezone');
const timer = ms => new Promise(res => setTimeout(res, ms))

warningMsg = ''+config.colours.brackets+'['+config.colours.warning+'WARNING'+config.colours.brackets+']'
errorMsg = ''+config.colours.brackets+'['+config.colours.error+'ERROR'+config.colours.brackets+']'

function consoleLog(log) {
    if (config.misc.logging === "true") {
        console.log(log)
    } else {
        return;
    }
}

async function sendUpstream(content) {
    var output = content.join("\n")
    parentPort.postMessage(output);
    process.exit()
}

function errorMessage(error, code, extra) {
    consoleLog('[feed-preset.errorMessage] '+error.code)
    if (code == "404") {
        var error = errorMsg+" 404: " + extra + " not found"
    } else if (error.code == "ECONNREFUSED") {
        var error = errorMsg+" Connection Refused"
    } else if (error.code == "ERR_UNESCAPED_CHARACTERS"){
        var error = errorMsg+" Unescaped Characters"
    } else { 
        var error = errorMsg+" Unknown error"
    }
    
    parentPort.postMessage(error);
    process.exit()
}

async function fetchFeed(feedURL, n) {
    var content = [];
    consoleLog('[feed-preset.fetchFeed] Fetching '+feedURL)
    try {
        var newFeed = await parser.parseURL(feedURL);
    } catch (e) {
        if (e.code !== undefined) {
            errorMessage(e)
        } else {
            errorMessage(e, "404", feedURL);
        }
    }
    if (n > newFeed.items.length) {
        var n = newFeed.items.length;
        content.push(warningMsg+" Your requested post amount exceeded the total available. Reverting to " + newFeed.items.length);
    } else if (n < 1) {
        var n = config.feed.default_amount
        content.push(warningMsg+" You requested a number less than 1. Reverting to default ("+config.feed.default_amount+")");
    }
    //for (let i = 0; i < newFeed.items.length; i++) {
    for (let i = 0; i < n; i++) {
        var data = newFeed.items[i]
        var title = data.title.replace(/(\r\n|\n|\r)/gm, " ") //remove line breaks
            .replace(/\s{2,}/g, ' ') //idk
        var title = striptags(title);
        var body = data.contentSnippet.replace(/(\r\n|\n|\r)/gm, " ") //remove line breaks
            .replace(/\s{2,}/g, ' ') //idk
        var body = striptags(body);
       if (data.isoDate !== undefined) {
            var date = moment(data.isoDate)
            try {
                var syncDate = date.tz(uconfig[nick].timezone) 
            } catch(e) {
                var syncDate = date.tz(config.feed.timezone)
            }
            var date = syncDate.format(config.feed.time_format)
        } else {
            var date = data.pubDate
        }
        if (body.length >= config.feed.body_max_chars) {
            var truncatedString = body.substring(0,config.feed.body_max_chars);
            var body = truncatedString + "..."
        }

        date = ''+config.colours.brackets+'['+config.colours.date+date+''+config.colours.brackets+'] '
        title = ''+config.colours.title+title+' '
        author = ''+config.colours.author+data.creator+' '
        body = ''+config.colours.body+body+' '
        link = ''+config.colours.link+data.link+' '

        //console.log(data);
        //var string = "15[11" + date + "15] 08" + title + " " + body + " " + data.link;
        var string = date+title+body+link;
        content.push(string)
    }
    sendUpstream(content);
}

fetchFeed(provfeed, n);
