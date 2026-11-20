const { model } = require('../db');

module.exports = model('Client', {
    user:    { type: 'Id', ref: 'User', required: true },
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String },
    address: { type: String }
});