require('dotenv').config()

var http = require('http');
let axios = require('axios');
const REGION_KEY = 'intGENRegionKey'
const REGION_NAME = 'vchNombre'


module.exports = {
    async getRegions() {
        const url = "https://dlt-llantas-api01.azurewebsites.net/CitasDaltonLlantas/ObtenerRegiones"
        const request = await axios.get(url)
        let data = request.data.map((region) => {
            return { "id": region[REGION_KEY], "value": region[REGION_NAME] }
        })
        return data
    },
}


