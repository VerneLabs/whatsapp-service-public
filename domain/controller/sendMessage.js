var https = require('follow-redirects').https;
var fs = require('fs');

module.exports = {
    sendMessage(id) {

        var options = {
            'method': 'POST',
            'hostname': 'pdi-vernelabs.zendesk.com',
            'path': `/sc//v2/apps/62ea8e0395dd0400eff439a2/conversations/${id}/messages`,
            'headers': {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ',
                'Cookie': '__cfruid=d9c7aa7f21bfdf81f05e342fd4820d42e64f4324-1681423203'
            },
            'maxRedirects': 20
        };
        console.log(options)
        var req = https.request(options, function (res) {
            var chunks = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function (chunk) {
                var body = Buffer.concat(chunks);
                console.log(body.toString());
            });

            res.on("error", function (error) {
                console.error(error);
            });
        });

        var postData = JSON.stringify({
            "author": {
                "type": "business"
            },
            "content": {
                "type": "text",
                "text": "Hello Unai!",
                "tags": "demo"
            }
        });

        req.write(postData);

        req.end();
    }
}