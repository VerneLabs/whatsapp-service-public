require('dotenv').config()
let fs = require('fs');

let time = require('./time');
let sunco = require('../../infrastructure/sunco');
// let zendesk = require('../../infrastructure/zendesk');
const { validationResult } = require('express-validator');
const { parse } = require("csv-parse");
const { config } = require('dotenv');

const SHOW_LOGS = (!process.env.SHOW_LOGS || process.env.SHOW_LOGS == 0 || process.env.SHOW_LOGS.trim().toLowerCase() == "false" || process.env.SHOW_LOGS == null || process.env.SHOW_LOGS == undefined) ? false : true
let conversations = [];
let usersMemory = [];
let usersNotCreated = [];
const validateExternalIdExist = true;
const attachmentTempFolder = "./domain/buffer/tempAttachments"
const VALIDATE_ONLY_NOT_CREATED = true;


module.exports = {

    async main(req, res) {
        if (SHOW_LOGS) console.log("Init Execution");

        //todo: validate from where is the request
        console.log("req", JSON.stringify(req.body))
        const body = req.body;
        const events = body.events;
        console.log('events', events)
        console.log('eventsL', events.length)
        const conversation_id = body.events[0].payload.conversation.id
        const author = body.events[0].payload.message.author.type

        console.log("conversation id", conversation_id)
        console.log("author type", author)
        const contacts = addConversationToLocal(conversation_id)
        const messageType = body.events[0].payload.message.content.type;
        if (messageType !== "text") {
            console.log('message is not text', messageType)
            return res.json({ message: "right now text is the only type available" })
        }
        const message = body.events[0].payload.message.content.text;

        const content = {
            "type": "text",
            "text": `Hello Unai!!! escribiste ${message} y este es tu ${contacts} contacto`,
            "tags": "demo"
        }

        if (author === "user") { sunco.sendMessage(conversation_id, content) }
        return res.json({ "message": "all done" })
    }
}

function addConversationToLocal(conversation_id) {
    let conversation = conversations[conversation_id] ? conversations[conversation_id] : { contacts: 0 }
    conversation.contacts++;
    let tempConversation = [...conversations]
    tempConversation[conversation_id] = conversation;
    conversations = tempConversation
    return conversation.contacts;
}