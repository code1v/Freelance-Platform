const { model } = require('../db');

module.exports = model('User', {
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone:    { type: String, default: '' },
    address:  { type: String, default: '' },
    bio:      { type: String, default: '' },
    skills:   { type: String, default: '' }
});