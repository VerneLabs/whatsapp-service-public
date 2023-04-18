let sunco = require('../../infrastructure/sunco');
let dalton = require('../../infrastructure/dalton');
let utils = require('./utils');
let conversations = [];



module.exports = {

    async main(req, res) {
        //todo: reset conversations
        const body = req.body;
        const conversation_id = body.events[0].payload.conversation.id
        const author = body.events[0].payload.message.author.type
        const messageType = body.events[0].payload.message.content.type;
        if (messageType !== "text") {
            return res.json({ message: "right now text is the only type available" })
        }
        if (body.events[0].payload.conversation.activeSwitchboardIntegration.name !== "bot") return res.json({ "message": "bot not active" })
        if (author === "business") return res.json({ "message": "business message" })
        if (author === "user") {
            const message = body.events[0].payload.message.content.text;
            if (message.toLowerCase().trim() === "menu" || message.toLowerCase().trim() === "menú") delete conversations[conversation_id]

            const contact = addConversationToLocal(conversation_id)

            switch (contact.category) {
                case "initial":
                    mainMenu(conversation_id)
                    break;
                case "menu":
                    if (message == "1") appointMentFlow(conversation_id, message, contact)
                    else if (message == "2") await goToAgent(conversation_id)
                    else messageNotValid(conversation_id)
                    break;
                case "appointments":
                    appointMentFlow(conversation_id, message, contact)
                    break;
                default:
                    console.log("category", contact.category)
                    sunco.sendMessage(conversation_id, createContactContentText(`No consegui en que paso del proceso vamos, te enviaré al menu para evitar errores`))
                    setTimeout(() => {
                        mainMenu()
                    }, 1000);
                    break;
            }

        }
        return res.json({ "message": "ok" })
    },
}

function addConversationToLocal(conversation_id, keyToAdd, valueToAdd) {
    let conversation = conversations[conversation_id] ? conversations[conversation_id] : { step: "initial", category: "initial" }
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
    sunco.sendMessage(conversation_id, createContactContentText(
        `¡Hola! 👋🏽
Bienvenido al Dalton 🤖 POC.
Selecciona algunas de las siguientes opciones para saber como ayudarte 😉
    
1️⃣ Agendar una visita en sucursal 🗓️
2️⃣ Hablar con un agente 🤓
    `))
    addConversationToLocal(conversation_id, "category", "menu")
    addConversationToLocal(conversation_id, "step", "initial")
}

async function appointMentFlow(conversation_id, message, contact) {
    switch (contact.step) {
        case "initial":
            addConversationToLocal(conversation_id, "category", "appointments")
            getRegions(conversation_id)
            break;
        case "regions":
            //! in a future with whatsapp buttons check this if will be another values that are not numbers
            if (isNaN(message)) return messageNotValid(conversation_id)
            getBrands(conversation_id, message)
            break;
        case "brands":
            if (isNaN(message)) return messageNotValid(conversation_id)
            getAgency(conversation_id, message, contact)
            break;
        case "agencies":
            if (isNaN(message)) return messageNotValid(conversation_id)
            getWeekDate(conversation_id, message, contact)
            break;
        case "day":
            if (isNaN(message)) return messageNotValid(conversation_id)
            getHour(conversation_id, message, contact)
            break;
        case "hour":
            getSchedule(conversation_id, message, contact)
            break;
        case "confirm":
            getSchedule(conversation_id, message, contact)
            break;
        case "schedule":
            if (isNaN(message)) messageNotValid(conversation_id)
            // todo
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

async function getRegions(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`¡Super! 🫡
Para ayudarte a agendar tu visita a sucursal, por favor, contesta las siguientes preguntas.`))
    setTimeout(async () => {
        const regions = await dalton.getRegions();
        let messageString = "Selecciona la ciudad donde deseas realizar tu cita. \n\n";
        const regionsSorted = regions.sort((p1, p2) => (p1.id >= p2.id) ? 1 : (p1.id <= p2.id) ? -1 : 0)
        for (const region of regionsSorted) {
            messageString += `${utils.numberIcon(region.id)} ${region.value}\n`
        }
        sunco.sendMessage(conversation_id, createContactContentText(messageString))
        addConversationToLocal(conversation_id, "step", "regions")
    }, 500);
}

async function getBrands(conversation_id, option) {

    const regions = await dalton.getRegions();
    const option_selected = regions.find((region) => (region.id === Number(option)))
    if (!option_selected) return messageNotValid(conversation_id)
    sunco.sendMessage(conversation_id, createContactContentText(`Cuéntanos ¿de cuál de las siguientes marcas, es tu automóvil? 😎`))
    const agencies = await dalton.getAgencies(option_selected.id);
    const [cars, agenciesFilteredData] = utils.carsData(agencies)

    let messageString = "";
    let carsBrandAndId = []
    let counter = 1;
    for (const car of cars) {
        messageString += `${utils.numberIcon(counter)} ${car}\n`
        carsBrandAndId.push({ id: counter, name: car })
        counter++;
    }

    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "cars", carsBrandAndId)
    addConversationToLocal(conversation_id, "agenciesData", agenciesFilteredData)
    addConversationToLocal(conversation_id, "step", "brands")
    addConversationToLocal(conversation_id, "region", option)
}

async function getAgency(conversation_id, option, conversation, isByDefault = true) {
    const option_selected = conversation.cars.find(car => car.id == option)

    if (!option_selected) return messageNotValid(conversation_id)
    const validAgencies = conversation.agenciesData.filter((agency) => agency.brand == option_selected.name)
    let messageString = isByDefault ? `¡Que gran elección! 🚙

Selecciona la sucursal que más que te convenga 

`: `Selecciona la sucursal que más que te convenga 

`;
    let agencyAndId = []
    let counter = 1;
    for (const agency of validAgencies) {
        messageString += `${utils.numberIcon(counter)} ${agency.name}\n`
        agencyAndId.push({ id: counter, name: agency.name, externalId: agency.id })
        counter++;
    }
    sunco.sendMessage(conversation_id, createContactContentText(messageString))

    const agenciesData = [...conversation.agenciesData];

    for (const agency of agenciesData) {
        const findValue = agencyAndId.find((temp) => temp.externalId === agency.id);
        if (findValue) agency.externalId = findValue.id
    }

    addConversationToLocal(conversation_id, "step", "agencies")
    addConversationToLocal(conversation_id, "carOption", option)
    addConversationToLocal(conversation_id, "agenciesData", agenciesData)

}

async function getWeekDate(conversation_id, agency_id, currentStep) {
    const agencies = currentStep.agenciesData;
    const agency_selected = agencies.find((agency) => (Number(agency.externalId) === Number(agency_id)))
    if (!agency_selected) return messageNotValid(conversation_id)
    let messageString = `Ayúdanos eligiendo el día que prefieras para tu visita 

1️⃣ Lunes
2️⃣ Martes
3️⃣ Miércoles
4️⃣ Jueves
5️⃣ Viernes
6️⃣ Sábado`;
    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "step", "day")
    addConversationToLocal(conversation_id, "agency", agency_selected.id)
}

async function getHour(conversation_id, day_id, currentStep) {

    const getDay = utils.getWeekDay(day_id)
    if (!getDay) return messageNotValid(conversation_id)

    let messageString = `¿Cuál es la hora es la que quieres agendemos tu cita? (HH:MM)`;
    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "step", "hour")
    addConversationToLocal(conversation_id, "day", getDay)
}

async function getSchedule(conversation_id, hour, currentStep) {

    const day = currentStep.day
    const agency = currentStep.agency
    const dates = await dalton.getSchedule(agency, day, hour);

    if (dates.length === 0) {
        sunco.sendMessage(conversation_id, createContactContentText("No existe disponibilidad en ese dia a ese horario, intente de nuevo"))
        return setTimeout(() => {
            getAgency(conversation_id, currentStep.carOption, currentStep, false)
        }, 1500);
    }

    let messageString = "";
    let counter = 0;
    const availabilities = []
    for (const date of dates) {
        counter++;
        availabilities.push({ id: counter, date: date })
        if (counter <= 3)
            messageString += `${utils.numberIcon(counter)} ${date}\n`
    }
    messageString += `\n${utils.numberIcon(4)} Otro`
    sunco.sendMessage(conversation_id, createContactContentText(messageString))
    addConversationToLocal(conversation_id, "step", "schedule")
    addConversationToLocal(conversation_id, "hour", hour)
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
    const hour = currentStep.hour;
    const day = currentStep.day;
    if (!date_selected) return messageNotValid(conversation_id)
    sunco.sendMessage(conversation_id, createContactContentText(`DEMO - Ya quedo agendada tu cita en ${agency_selected.value} el dia ${date_selected.date} a las ${hour}`))

    setTimeout(() => {
        mainMenu(conversation_id)
    }, 1500);
}



function messageNotValid(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Opción no valida, por favor intenta de nuevo
    
    Si deseas volver al inicio puedes escribir la palabra "Menú"`))
}
async function goToAgent(conversation_id) {
    sunco.sendMessage(conversation_id, createContactContentText(`Se le reenviará con un agente`))
    return setTimeout(() => {
        sunco.passControl(conversation_id)
    }, 2000);
}
