require('dotenv').config()


const express = require('express')
const router = express.Router()

let users = require('../../domain/controller/users');

router.get('/test', async (req, res) => {
    users.test(req, res)
})
router.all('/', async (req, res) => {
    users.main(req, res)
})

router.get('/health', (req, res) => {
    const data = {
        uptime: process.uptime(),
        message: 'Ok',
        date: new Date()
    }
    res.status(200).send(data);
});

module.exports = router;