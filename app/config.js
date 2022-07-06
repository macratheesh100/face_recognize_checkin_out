/*
 *   Developed by Ratheesh
 */
const env = require('dotenv').config()

if (env.error) {
    throw result.error
}

const config = module.exports

config.express = {
       ip: process.env.EXPRESS_HOST || '0.0.0.0',
       port: process.env.EXPRESS_PORT || 4000
}

config.face = {
    host: "<username>.cognitiveservices.azure.com/",
    sub_key: "<Replace with key string>",
    large_group_id: "large-user-identity"
}

config.room_type = {
    single: 1,
    double: 2
}

config.action_type = {
    booked: 1,
    check_in: 2,
    check_out: 3
}

// DB connection string
config.mongodb = {
    cstr:`mongodb://username:password@IP-address:port/dbname`
}

config.fspath = {
       appuser: __dirname + "/../assets/images/"
}
