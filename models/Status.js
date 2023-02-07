const mongoose = require('mongoose')
const StatusSchema = new mongoose.Schema({
    user: {
        type: String,
        maxLength: 100,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['login', 'logout'],
        required: true,
        trim: true
    },
    createon: {
        type: Date,
        default: Date.now,
        required: true
    }
})

module.exports = mongoose.model("status", StatusSchema)