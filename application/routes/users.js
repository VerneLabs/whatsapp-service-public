require('dotenv').config()


const express = require('express')
const router = express.Router()

let users = require('../../domain/controller/users');

router.all('/', async (req, res) => {
    users.main(req, res)
})
router.post('/', async (req, res) => {
    res.status(400).json({ message: "You need to add an id" })
})
//initTranscription
router.get('/', (req, res) => {
    users.main(req, res)
});
router.post('/', (req, res) => {
    users.main(req, res)
});

router.get('/health', (req, res) => {
    const data = {
        uptime: process.uptime(),
        message: 'Ok',
        date: new Date()
    }
    res.status(200).send(data);
});

module.exports = router;