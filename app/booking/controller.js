/*
 *   Developed by Ratheesh
 */
const mongojs   = require('mongojs')
const _         = require('lodash')
const Joi       = require('@hapi/joi')
const config    = require('./../config')
const faceapi   = require('./../faceapi')
const multer    = require('multer')
const Random    = require("random-js")
const fs        = require('fs')
const random    = new Random.Random(Random.MersenneTwister19937.autoSeed())

const db = mongojs(config.mongodb.cstr)
const xtyBookingInfo = db.collection('xty_booking_info')
const xtyUserInfo    = db.collection('xty_user_info')
const xtyHotelConfig = db.collection('xty_hotel_config')

var exports = {}

exports.bookRoom = async (req, res) => {

    let validateInputRequest = (requestData) => {
        
        // Define the Schema for validation
        const requestSchema = Joi.object().keys({
              num_of_adults: Joi.number().integer().required(),
              num_of_child: Joi.number().integer().required(),
              room_type: Joi.number().integer().required(), // 1 - single, 2 - double
              check_in_date: Joi.string().required(),
              check_out_date: Joi.string().required(),
              user_info: Joi.object().keys({
                         name: Joi.string().required(),
                         dob: Joi.string().required(),
                         email: Joi.string().required(),
                         number: Joi.number().required(),
                         address_1: Joi.string().required(),
                         address_2: Joi.string(),
                         city: Joi.string().required(),
                         state: Joi.string().required(),
                         country: Joi.string().required(),
                         pincode: Joi.number().required(),
              }).with('email', 'number').required(),
              services: Joi.array().items(Joi.number().integer())
        })
        
        return new Promise((resolve, reject) => {
                Joi.validate(requestData, requestSchema, (err, data) => {
                        err ? reject(err) : resolve(data)
                        })
                })
    }
    
    // Register if already not registered
    const saveUserInfo = (pnumber, userInfo) => {
        
        return new Promise((resolve, reject) => {
               xtyUserInfo.findAndModify({
                     query: {
                         number: pnumber
                     },
                     update: {
                         $set: userInfo
                     },
                     upsert: true
                }, (err, records) => {
                    err ? reject(err) : resolve(records)
            })
        })
    }
    
    // Get user mongo id
    const findUserInfo = (pnumber) => {

          const query = {
                number: pnumber
          }

          return new Promise((resolve, reject) => {
                 xtyUserInfo.findOne(query, (err, data) => {
                     err ? reject(err) : resolve(data)
                 })
          })
    }
    
    // Create booking details
    const createBooking = (bookingInfo) => {

          return new Promise((resolve, reject) => {
                 xtyBookingInfo.insert(bookingInfo, (err, data) => {
                     err ? reject(err) : resolve(data)
                 })
          })
    }

    try {
        
        let request = await saveImages(req, res)
                                
        let inputs = JSON.parse(req.body.inputs)

        let data = await validateInputRequest(inputs)
        let msg = "Successfully Booked!"
        var groupName = config.face.large_group_id
        
        /* if (isNaN(data.check_in_date.getTime())) {
            // date is not valid
            throw new Error("Invalid from date !")
            return
        } */
        
        // Create Large Group
        let groupResp = await faceapi.createLargeGroupId(groupName)
        
        // Detect Face
        let faceResp = await faceapi.sendUserDetectFaceImg(request.file.filename)
        if (!_.isEmpty(faceResp.body)) {
            let detectionData = JSON.parse(faceResp.body.toString())
            
            // Add in the Large Group
            let faceGroupResp = await faceapi.addFaceToLargeGroup(groupName, request.file.filename)
            if (!_.isEmpty(faceGroupResp.body)) {
                
                var persistedFace = JSON.parse(faceGroupResp.body.toString())
                if (persistedFace.persistedFaceId == undefined) {
                    throw new Error("Something wrong try again!")
                    return
                }
                detectionData[0].persistedFaceId = persistedFace.persistedFaceId
                detectionData[0].largeGroupName  = groupName
            } else {
                throw new Error("Large Group api not connecting or invalid image!")
                return
            }
            data.user_info.face_info = detectionData
        } else {
            throw new Error("Face api not connecting or invalid image!")
            return
        }
        
        data.user_info.face_img = request.file.filename
        // Check user already registered else register
        let result = await saveUserInfo(data.user_info.number, data.user_info)
        
        // Get user mongo id
        let userInfo = await findUserInfo(data.user_info.number)
        if (!_.isEmpty(userInfo)) {
            
            // Verify user in the block list
            if (userInfo.active_status != undefined && userInfo.active_status == false) {
                throw new Error("Your profile has been suspended, kindly contact support!")
                return
            }
            
            // Save the booking detail
            delete data.user_info
            
            var bookingNum = `${random.string(3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')}-${random.integer(11111111, 99999999) + Math.trunc(Date.now()/100000)}`
            
            data.check_in_date  = new Date(data.check_in_date)
            data.check_out_date = new Date(data.check_out_date)
            data.booking_num    = bookingNum
            data.user_id        = userInfo._id
            data.status         = 1    // 1 - booked, 2 - checked in, 3 - checked out.
            data.created_at     = new Date()
            createBooking(data)
        } else {
            msg = "Something Wrong!"
        }
        
        res.status(200).json({
                                "success": true,
                                "message": msg,
                                "booking_num": bookingNum
                             })
        return
    } catch (err) {
        
        res.status(500).json({
                                "success": false,
                                "error": err.message
                             })
        return
    }
}

// Save user face image
const saveImages = (req, res) => {
    
      let fileName = (ext) => {
          let name = random.integer(1111111111111, 9999999999999) + Date.now()
          name = name + '.' + ext.split('/').pop()
          return name
      }

      let fstorage = multer.diskStorage({
          destination: function (req, file, cb) {
              cb(null, config.fspath.appuser)
          },
          filename: function (req, file, cb) {
              cb(null, fileName(file.mimetype))
          }
      })

      let upload = multer({ storage: fstorage }).single('image')

      return new Promise((resolve, reject) => {
             upload(req, res, (err) => {
                err ? reject(err) : resolve(req)
             })
      })
}

exports.roomCheckinOut = async (req, res) => {

    let validateInputRequest = (requestData) => {
        
        // Define the Schema for validation
        const requestSchema = Joi.object().keys({
              action_type: Joi.number().integer().required()   // 1 = checkin, 2 - checkout
        })
        
        return new Promise((resolve, reject) => {
               Joi.validate(requestData, requestSchema, (err, data) => {
                        err ? reject(err) : resolve(data)
                        })
               })
    }
    
    // Find user profile
    const getUserBookingInfo = (faceIds, status) => {

          // Compare CheckIn date
          const fromDate = new Date()
          fromDate.setDate(fromDate.getDate());
          fromDate.setHours(0, 0, 0, 0)

            // To date
          const toDate = new Date()
          toDate.setDate(toDate.getDate() + 1);
          toDate.setHours(0, 0, 0, 0)
        
          const qry = [
                        {
                              $match: {
                                  "face_info.persistedFaceId" : { $in: faceIds }
                              }
                        },
                        // Lookup stage
                        {
                            $lookup: {
                                from: xtyBookingInfo._name,
                                localField: "_id",
                                foreignField: "user_id",
                                as: "bookingInfo"
                            }
                        },
                        // unwind stage
                        {
                            $unwind : "$bookingInfo"
                        },
                        // Match stage
                        {
                            $match: {
                                $and: [
                                       {
                                           // filter by booking status
                                           "bookingInfo.status": status // booked data
                                       },
                                       {
                                           $or: [
                                                 {
                                                     // verify checkin date
                                                     "bookingInfo.check_in_date": {
                                                          $gte: new Date(fromDate),
                                                          $lte: new Date(toDate)
                                                     }
                                                 },
                                                 {
                                                     // verify checkout date
                                                     "bookingInfo.check_out_date": {
                                                          $gte: new Date(fromDate),
                                                          $lte: new Date(toDate)
                                                     }
                                                 }
                                           ]
                                        }
                                ]
                            }
                        },
                        {
                            $project: {
                                face_info: 0
                            }
                        }
          ]

          return new Promise((resolve, reject) => {
                 xtyUserInfo.aggregate(qry, (err, data) => {
                     err ? reject(err): resolve(data)
                 })
          })
    }
    
    // Get hotel config
    const getHotelConfig = (conf_string) => {

          const query = {
                model: conf_string
          }

          return new Promise((resolve, reject) => {
                 xtyHotelConfig.findOne(query, (err, data) => {
                     err ? reject(err) : resolve(data)
                 })
          })
    }

    let roomConfg = {
        model: "available_rooms",
        rooms: [
                  {
                      single_room: 50,
                      price: 2000,
                      num_of_booked: 0
                  },
                  {
                      double_room: 50,
                      price: 2500,
                      num_of_booked: 0
                  }
            ]
    }

    // Create hotel config if not created
    const configRooms = () => {

          return new Promise((resolve, reject) => {
                 xtyHotelConfig.insert(roomConfg, (err, data) => {
                     err ? reject(err) : resolve(data)
                 })
          })
    }
    
    // Decrease availble rooms
    const updateRoomCount = (conf_string, data) => {
        
        return new Promise((resolve, reject) => {
               xtyHotelConfig.findAndModify({
                     query: {
                         model: conf_string
                     },
                     update: {
                         $set: data
                     },
                     upsert: false
               }, (err, records) => {
                    err ? reject(err) : resolve(records)
            })
        })
    }
    
    // Decrease availble rooms
    const updateBookingInfo = (id, status, roomInfo) => {
        
        return new Promise((resolve, reject) => {
               xtyBookingInfo.findAndModify({
                     query: {
                         _id: id
                     },
                     update: {
                         $set: {
                             status: status,  // Check In
                             room_info: roomInfo
                         }
                     },
                     upsert: false
               }, (err, records) => {
                    err ? reject(err) : resolve(records)
            })
        })
    }
    
    try {
        // Get hotel config
        let hotelConfig = await getHotelConfig("available_rooms")
        if (_.isEmpty(hotelConfig)) {
            // Create config if not created
            configRooms()
            hotelConfig = roomConfg
        }
        
        let request = await saveImages(req, res)
                
        let data = await validateInputRequest(req.query)
        
        let msg = "Successfully Checked In !"

        // Train large group
        let trainResp = await faceapi.trainLargeFaceGroup(config.face.large_group_id)
        
        // Detect Face
        let faceResp = await faceapi.sendUserDetectFaceImg(request.file.filename)
        if (!_.isEmpty(faceResp.body)) {
            
            let detectionData = JSON.parse(faceResp.body.toString())
            if (detectionData[0].faceId == undefined) {
                throw new Error("Something wrong try again!")
                return
            }
            
            var findSimilar = await faceapi.findSimilarUser(detectionData[0].faceId, config.face.large_group_id, 10)
            findSimilar = JSON.parse(findSimilar.body.toString())
        } else {
            throw new Error("Face api not connecting or invalid image!")
            return
        }
        
        let faceIds = []
        for (faceid of findSimilar) {
             faceIds.push(faceid.persistedFaceId)
        }
        
        // Find user profile
        let userBookingInfo = await getUserBookingInfo(faceIds, data.action_type)
        if (_.isEmpty(userBookingInfo)) {
            throw new Error("Booking detail not found or Try to scan your face again!")
            return
        }
                
        // Remove image from local storage
        removeImageFromDrive(config.fspath.appuser+request.file.filename)
                
        let bookingResp = []
        
        for (userInfo of userBookingInfo) {
            
            // Verify user in the block list
            if (userInfo.active_status != undefined && userInfo.active_status == false) {
                throw new Error("Your profile has been suspended, kindly contact support!")
                return
            }
           
            let booking_details = {}
            booking_details.room_num = 0
            
            if (data.action_type == 1) { // *** CheckIn ***
                
                if (!_.isEmpty(userInfo.bookingInfo)) {
                    
                    if (userInfo.bookingInfo.room_type == config.room_type.single) {
                        
                        for (hotel of hotelConfig.rooms) {
                            if (hotel.single_room && hotel.num_of_booked < hotel.single_room) {
                                hotel.num_of_booked += 1
                                booking_details.price = hotel.price
                                booking_details.room_num = hotel.num_of_booked
                            }
                        }
                        
                        if (booking_details.room_num == 0) {
                            throw new Error("No rooms available!")
                            return
                        }
                    } else if (userInfo.bookingInfo.room_type == config.room_type.double) {
                        
                        for (hotel of hotelConfig.rooms) {
                            if (hotel.double_room && hotel.num_of_booked < hotel.double_room) {
                                hotel.num_of_booked += 1
                                booking_details.room_num = hotel.num_of_booked
                            }
                        }
                        
                        if (booking_details.room_num == 0) {
                            throw new Error("No rooms available!")
                            return
                        }
                    }
                } else {
                    // Booking not available
                    throw new Error("You don't have booking today!")
                    return
                }
                
                // Save changes in the hotel config
                updateRoomCount("available_rooms", hotelConfig)
                // Update booking data
                if (userInfo.bookingInfo._id)
                    updateBookingInfo(userInfo.bookingInfo._id, config.action_type.check_in, booking_details)
            } else {
                // *** CheckOut ***
                
                if (!_.isEmpty(userInfo.bookingInfo)) {
                    
                    if (userInfo.bookingInfo.room_type == config.room_type.single) {
                        
                        for (hotel of hotelConfig.rooms) {
                            if (hotel.single_room && hotel.num_of_booked > 0) {
                                hotel.num_of_booked -= 1
                                booking_details.payment = userInfo.bookingInfo.room_info.price
                            }
                        }
                    } else if (userInfo.bookingInfo.room_type == config.room_type.double) {
                        
                        for (hotel of hotelConfig.rooms) {
                            if (hotel.double_room && hotel.num_of_booked > 0) {
                                hotel.num_of_booked -= 1
                                booking_details.payment = userInfo.bookingInfo.room_info.price
                            }
                        }
                    }
                } else {
                    // Booking not available
                    throw new Error("You don't have booking today!")
                    return
                }
                
                // Save changes in the hotel config
                updateRoomCount("available_rooms", hotelConfig)
                // Update booking data
                if (userInfo.bookingInfo._id)
                    updateBookingInfo(userInfo.bookingInfo._id, config.action_type.check_out, userInfo.bookingInfo.room_info)
            }
            
            booking_details.booking_no = userInfo.bookingInfo.booking_num
            booking_details.name = userInfo.name
            booking_details.number = userInfo.number
            booking_details.email = userInfo.email
            booking_details.address_1 = userInfo.address_1
            booking_details.photo = userInfo.face_img
            if (userInfo.bookingInfo.room_type == config.room_type.single) {
                booking_details.room_type = "Single Bed"
            } else {
                booking_details.room_type = "Double Bed"
            }
            booking_details.num_of_people = userInfo.bookingInfo.num_of_adults + userInfo.bookingInfo.num_of_child

            bookingResp.push(booking_details)
        }
        
        res.status(200).json({
                                "success": true,
                                "data": bookingResp
                             })
        return
    } catch (err) {
        
        res.status(500).json({
                                "success": false,
                                "error": err.message
                             })
        return
    }
}

// Blocklist users
exports.blockUser = async (req, res) => {

    let validateInputRequest = (requestData) => {
        
        // Define the Schema for validation
        const requestSchema = Joi.object().keys({
              number: Joi.number().integer().required(),
              status: Joi.boolean().default(false)
        })
        
        return new Promise((resolve, reject) => {
                Joi.validate(requestData, requestSchema, (err, data) => {
                        err ? reject(err) : resolve(data)
                        })
                })
    }
    
    // Change user active status
    const blockUser = (pnumber, status) => {
        
        return new Promise((resolve, reject) => {
               xtyUserInfo.findAndModify({
                     query: {
                         number: pnumber
                     },
                     update: {
                         $set: { active_status: status }
                     },
                     upsert: false
                }, (err, records) => {
                    err ? reject(err) : resolve(records)
            })
        })
    }

    try {
        let data = await validateInputRequest(req.query)

        let msg = "Successfully Blocked. This is user can't book room again!"
        
        // Change user active status to false
        let result = await blockUser(data.number, data.status)
        if (data.status == true)
            msg = "Profile successfully activated, user can book rooms now!"
            
        res.status(200).json({
                                "success": true,
                                "message": msg
                             })
        return
    } catch (err) {
        
        res.status(500).json({
                                "success": false,
                                "error": err.message
                             })
        return
    }
}

// Remove image after identified
const removeImageFromDrive = (path) => {

      if (!fs.existsSync(path))    {
          return
      }

      return new Promise((resolve, reject) => {
             fs.unlink(path, (err) => {
                 err ? reject(err) : resolve("Deleted captured image successfully!")
             })
      })
}

module.exports = exports
