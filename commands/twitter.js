const config = require('../config/default.json')
const { parentPort, workerData } = require('worker_threads');
const { provfeed, n } = workerData;
let Parser = require('rss-parser');
let parser = new Parser({
    headers: {'User-Agent': config.feed.useragent},
});
const striptags = require("striptags");
const timer = ms => new Promise(res => setTimeout(res, ms))


async function sendUpstream(content) {
    var output = content.join("\n")
    parentPort.postMessage(output);
    process.exit()
}

async function fetchFeed(feedURL, n) {
    var content = [];
    var randomNitter = config.twitter.nitter_instances[Math.floor(Math.random() * config.twitter.nitter_instances.length)];
    var feedURL = "https://" + randomNitter + "/" + feedURL + "/rss"
    let newFeed = await parser.parseURL(feedURL);
    console.log(newFeed.items.length);
    if (n > newFeed.items.length) {
        var n = newFeed.items.length;
        content.push("[08WARNING] Your requested post amount exceeded the total available. Reverting to " + newFeed.items.length);
    }
    //for (let i = 0; i < newFeed.items.length; i++) {
    for (let i = 0; i < n; i++) {
        await timer(50);
        var data = newFeed.items[i]
        var title = data.title.replace(/(\r\n|\n|\r)/gm, " ") //remove line breaks
            .replace(/\s{2,}/g, ' ') //idk
        var title = striptags(title);
        var body = data.contentSnippet.replace(/(\r\n|\n|\r)/gm, " ") //remove line breaks
            .replace(/\s{2,}/g, ' ') //idk
        var body = striptags(body);
        if (body.length >= config.feed.body_max_chars) {
            var truncatedString = body.substring(0,config.feed.body_max_chars);
            var body = truncatedString + "..."
        }
        console.log(data);
        var string = "15[11" + data.pubDate + "15] 08" + data.creator + " " + body + " " + data.link;
        var output = string;
        content.push(output)
    }
    sendUpstream(content);
}

fetchFeed(provfeed, n);
