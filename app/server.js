/*
 *   Developed by Ratheesh
 */
#!/usr/bin/env node
const config    = require('./config')
var app = require('./index')

app.listen(config.express.port, config.express.ip, function (error) {
  if (error) {
    process.exit(10)
  }
  console.log("Node JS Server Deployed on http://" + config.express.ip + ':' + config.express.port)
})
