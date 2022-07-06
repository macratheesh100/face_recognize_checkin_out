/*
 *   Developed by Ratheesh
 */
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()

// Cross origin resource sharing
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Get an instance of the express Router
const router = express.Router()

// Ping route for health checks - used in production env
router.use('/ping', function(req, res){
  res.status(200).json({
    "success": true,
    "message": "Ok"
  })
  return
})

router.use('/booking', require('./booking/router'))

router.use(require('./errors/router'))

// Prefix for router
app.use('/hotel/', router)

// Export the app instance for unit testing via supertest
module.exports = app
