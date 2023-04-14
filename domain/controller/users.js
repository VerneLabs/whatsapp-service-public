require('dotenv').config()
let fs = require('fs');

let time = require('./time');
let sunco = require('../../infrastructure/sunco');
let dalton = require('../../infrastructure/dalton');
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
        //todo: reset conversations
        console.log("req", JSON.stringify(req.body))
        const body = req.body;
        const conversation_id = body.events[0].payload.conversation.id
        const author = body.events[0].payload.message.author.type
        const messageType = body.events[0].payload.message.content.type;
        if (messageType !== "text") {
            return res.json({ message: "right now text is the only type available" })
        }

        if (author === "user") {
            const message = body.events[0].payload.message.content.text;
            if (message === "menu") delete conversations[conversation_id]

            const contact = addConversationToLocal(conversation_id)

            switch (contact.step) {
                case "initial":
                    mainMenu(conversation_id)
                    break;
                case "menu":
                    if (message == "1") getRegions(conversation_id)
                    else if (message == "2") goToAgent()
                    else messageNotValid(conversation_id)
                    break;

                default:
                    console.log("paso", contact.step)
                    sunco.sendMessage(conversation_id, createContactContentText(`No consegui en que paso del proceso vamos, te enviaré al menu para evitar errores`))
                    setTimeout(() => {
                        mainMenu()
                    }, 1000);
                    break;
            }

        }
        return res.json({ "message": "all done" })
    }
}

function addConversationToLocal(conversation_id, keyToAdd, valueToAdd) {
    let conversation = conversations[conversation_id] ? conversations[conversation_id] : { step: "initial" }
    let tempConversation = [...conversations]
    if (keyToAdd) conversation[keyToAdd] = valueToAdd;
    tempConversation[conversation_id] = conversation;
    conversations = tempConversation
    return conversation;
}

function createContactContentText(text) {
    return {
        "type": "text",
        "text": text,
        "tags": "demo"
    }
}


async function mainMenu(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Hola! bienvenido a la POC VernerLabs-Zendesk!`))
    setTimeout(() => {
        sunco.sendMessage(conversation_id, createContactContentText(
            `¿Qué desea hacer el dia de hoy?
           1. Agendar una cita
           2. Hablar con un agente`
        ))
    }, 500);
    addConversationToLocal(conversation_id, "step", "menu")
}
async function mainMenu(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Hola! bienvenido a la POC VernerLabs-Zendesk!`))
    setTimeout(() => {
        sunco.sendMessage(conversation_id, createContactContentText(
            `¿Qué desea hacer el dia de hoy?
           1. Agendar una cita
           2. Hablar con un agente`
        ))
    }, 500);
    addConversationToLocal(conversation_id, "step", "menu")
}
async function getRegions(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Perfecto! Selecciona a la región que perteneces`))
    const regions = dalton.getRegions();
    console.log("STEP REGIONS", regions)
    // setTimeout(() => {
    //     sunco.sendMessage(conversation_id, createContactContentText(
    //         `¿Qué desea hacer el dia de hoy?
    //        1. Agendar una cita
    //        2. Hablar con un agente`
    //     ))
    // }, 500);
    // addConversationToLocal(conversation_id, "step", "menu")

}

function messageNotValid(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Opción no valida, por favor intenta de nuevo`))
}
function goToAgent(conversation_id) {
    //todo add switchboard action
    sunco.sendMessage(conversation_id, createContactContentText(`Se reenviara con un agente`))
}