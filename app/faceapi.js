/*
 *   Developed by Ratheesh
 */
const HttpRequest   = require('request')
const Urlencode     = require('urlencode')
const config        = require('./config')
const fs            = require('fs')

var exports = {}

// ==================== Face API's =========================
// Create Large Group Id
exports.createLargeGroupId = (lGroupName) => {
    
    const data = `/face/v1.0/largefacelists/${lGroupName}`
    
    let body = `{"name":"booking-user-identity"}`
    
    const params = {
        url: `https://${config.face.host}${data}`,
        method: "PUT",
        headers: {
                "content-type": "application/json",
                "Ocp-Apim-Subscription-Key": config.face.sub_key
        },
        body: body
    }
        
    return new Promise((resolve, reject) => {
           HttpRequest(params, (err, data) => {
                       err ? reject(err) : resolve(data)
                })
           })
}

// Face API Detect
exports.sendUserDetectFaceImg = (image_path) => {
    
    const data = `face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=true&returnFaceAttributes=age`
    
    const params = {
        url: `https://${config.face.host}${data}`,
        method: "POST",
        headers: {
                "content-type": "application/octet-stream",
                "Ocp-Apim-Subscription-Key": config.face.sub_key
        },
        encoding: 'binary',
        body: fs.createReadStream(config.fspath.appuser+image_path)
    }
        
    return new Promise((resolve, reject) => {
           HttpRequest(params, (err, data) => {
                       err ? reject(err) : resolve(data)
                })
           })
}

// Add In the Large Group
exports.addFaceToLargeGroup = (groupid, image_path) => {
    
    const data = `/face/v1.0/largefacelists/${groupid}/persistedfaces`
    
    const params = {
        url: `https://${config.face.host}${data}`,
        method: "POST",
        headers: {
                "content-type": "application/octet-stream",
                "Ocp-Apim-Subscription-Key": config.face.sub_key
        },
        encoding: 'binary',
        body: fs.createReadStream(config.fspath.appuser+image_path)
    }
        
    return new Promise((resolve, reject) => {
           HttpRequest(params, (err, data) => {
                       err ? reject(err) : resolve(data)
                })
           })
}

// Find similar face id
exports.findSimilarUser = (faceId, largeFaceListId, maxNumOfCandidatesReturned) => {
    
    const data = `/face/v1.0/findsimilars`
    
    let body = `{"faceId":"${faceId}","largeFaceListId":"${largeFaceListId}","maxNumOfCandidatesReturned":${maxNumOfCandidatesReturned},"mode":"matchPerson"}`

    const params = {
        url: `https://${config.face.host}${data}`,
        method: "POST",
        headers: {
                "content-type": "application/json",
                "Ocp-Apim-Subscription-Key": config.face.sub_key
        },
        body: body
    }
            
    return new Promise((resolve, reject) => {
           HttpRequest(params, (err, data) => {
                       err ? reject(err) : resolve(data)
                })
           })
}

// Train the large face group
exports.trainLargeFaceGroup = (largeFaceListId) => {
    
    const data = `/face/v1.0/largefacelists/${largeFaceListId}/train`
    
    const params = {
        url: `https://${config.face.host}${data}`,
        method: "POST",
        headers: {
                "content-type": "application/json",
                "Ocp-Apim-Subscription-Key": config.face.sub_key
        },
    }
            
    return new Promise((resolve, reject) => {
           HttpRequest(params, (err, data) => {
                       err ? reject(err) : resolve(data)
                })
           })
}

module.exports = exports
