/*
 *   Developed by Ratheesh
 */
const router = require('express').Router()
const _c = require('./controller')

// Hotel Booking
router.post('/v1/book/room', _c.bookRoom)

// Customer checkIn and CheckOut
router.post('/v1/room/checkinOut', _c.roomCheckinOut)

// Blocklist Customer
router.get('/v1/user/block', _c.blockUser)

module.exports = router
