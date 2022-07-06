/*
 *   Developed by Ratheesh
 */
var exports = {}

// ================= Unknown Routes Handler ======================

exports.unknownRoute = function(req, res) {

  res.status(500).json({
    "success": false,
    "message": "unknown route specified"
  })
  return
}

// ================= Unknown Routes Handler ======================

module.exports = exports
