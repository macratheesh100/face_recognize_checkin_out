/*
 *   Developed by Ratheesh
 */
const router = require('express').Router()
const unknown = require('./controller')

router.use('/*', unknown.unknownRoute)

module.exports = router
