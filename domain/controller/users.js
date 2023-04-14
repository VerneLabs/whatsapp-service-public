require('dotenv').config()
let fs = require('fs');

let time = require('./time');
let sunco = require('../../infrastructure/sunco');
let dalton = require('../../infrastructure/dalton');
// let zendesk = require('../../infrastructure/zendesk');
const { validationResult } = require('express-validator');
const { parse } = require("csv-parse");
const { config } = require('dotenv');
const { options } = require('pdfkit');

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
        if (author === "business") return res.json({ "message": "business message" })
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
                case "regions":
                    //! in a future with whatsapp buttons check this if will be another values that are not numbers
                    if (isNaN(message)) messageNotValid(conversation_id)
                    getAgency(conversation_id, message)
                    break;
                case "agencies":
                    //! in a future with whatsapp buttons check this if will be another values that are not numbers
                    if (isNaN(message)) messageNotValid(conversation_id)
                    getSchedule(conversation_id, message, contact)
                    break;
                case "schedule":
                    //! in a future with whatsapp buttons check this if will be another values that are not numbers
                    if (isNaN(message)) messageNotValid(conversation_id)
                    createReservation(conversation_id, message, contact)
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
    const regions = await dalton.getRegions();
    let messageString = "";
    const regionsSorted = regions.sort((p1, p2) => (p1.id >= p2.id) ? 1 : (p1.id <= p2.id) ? -1 : 0)
    for (const region of regionsSorted) {
        messageString += `${region.id}: ${region.value}\n`
    }
    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "step", "regions")
}
async function getAgency(conversation_id, option) {
    const regions = await dalton.getRegions();
    const option_selected = regions.find((region) => (region.id === Number(option)))
    if (!option_selected) return messageNotValid(conversation_id)
    sunco.sendMessage(conversation_id, createContactContentText(`Voy a buscar las agencias disponibles en ${option_selected.value}`))

    const agencies = await dalton.getAgencies(option_selected.id);
    const agenciesSorted = agencies.sort((p1, p2) => (p1.id >= p2.id) ? 1 : (p1.id <= p2.id) ? -1 : 0)

    let messageString = "";
    for (const agency of agenciesSorted) {
        messageString += `${agency.id}: ${agency.value}\n`
    }
    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "step", "agencies")
    addConversationToLocal(conversation_id, "region", option)
}

async function getSchedule(conversation_id, agency_id, currentStep) {
    const region_id = currentStep.region;
    const agencies = await dalton.getAgencies(region_id);
    const agency_selected = agencies.find((agency) => (agency.id === Number(agency_id)))


    if (!agency_selected) return messageNotValid(conversation_id)
    sunco.sendMessage(conversation_id, createContactContentText(`La disponibilidad de ${agency_selected.value} es:`))

    const dates = await dalton.getSchedule(agency_selected.id);

    let messageString = "";
    let counter = 0;
    const availabilities = []
    for (const date of dates) {
        counter++;
        messageString += `${counter}: ${date}\n`
        availabilities.push({ id: counter, date: date })
    }
    sunco.sendMessage(conversation_id, createContactContentText(messageString))


    console.log('dates', dates)
    console.log("checkCurrentSteps", currentStep)
    addConversationToLocal(conversation_id, "step", "schedule")
    addConversationToLocal(conversation_id, "agency", agency_id)
    addConversationToLocal(conversation_id, "availabilities", availabilities)
}
async function createReservation(conversation_id, schedule_id, currentStep) {
    const region_id = currentStep.region;
    const agency_id = currentStep.agency;
    const availabilities = currentStep.availabilities;
    const agencies = await dalton.getAgencies(region_id);
    const agency_selected = agencies.find((agency) => (agency.id === Number(agency_id)))
    const date_selected = availabilities.find((date) => (date.id === Number(schedule_id)))
    //todo not set time
    //todo get better dates
    const hour = "9:00";
    if (!date_selected) return messageNotValid(conversation_id)
    sunco.sendMessage(conversation_id, createContactContentText(`DEMO - Ya quedo agendada tu cita en ${agency_selected.value} el dia ${date_selected.date} a las ${hour}`))

    setTimeout(() => {
        mainMenu(conversation_id)
    }, 1500);
}



function messageNotValid(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Opción no valida, por favor intenta de nuevo`))
}
function goToAgent(conversation_id) {
    //todo add switchboard action
    sunco.sendMessage(conversation_id, createContactContentText(`Se reenviara con un agente`))
}