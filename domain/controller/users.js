require('dotenv').config()
let fs = require('fs');

let time = require('./time');
let sendMessage = require('./sendMessage');
// let zendesk = require('../../infrastructure/zendesk');
const { validationResult } = require('express-validator');
const { parse } = require("csv-parse");
const { config } = require('dotenv');

const SHOW_LOGS = (!process.env.SHOW_LOGS || process.env.SHOW_LOGS == 0 || process.env.SHOW_LOGS.trim().toLowerCase() == "false" || process.env.SHOW_LOGS == null || process.env.SHOW_LOGS == undefined) ? false : true
let usersMemory = [];
let usersNotCreated = [];
const validateExternalIdExist = true;
const attachmentTempFolder = "./domain/buffer/tempAttachments"
const VALIDATE_ONLY_NOT_CREATED = true;


module.exports = {

    async main(req, res) {
        if (SHOW_LOGS) console.log("Init Execution");
        console.log("req", JSON.stringify(req.body))
        const body = req.body;
        const events = body.events;
        console.log('events', events)
        console.log('eventsL', events.length)
        const conversation_id = body.events[0].payload.conversation.id
        const author = body.events[0].payload.message.author.type

        console.log("conversation id", conversation_id)
        console.log("author type", author)
        if (author === "user") { sendMessage.sendMessage(conversation_id) }
        return res.json({ "message": "all done" })
    },
}
