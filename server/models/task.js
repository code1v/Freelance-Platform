const { model } = require('../db');

module.exports = model('Task', {
    user:        { type: 'Id', ref: 'User', required: true },
    client:      { type: 'Id', ref: 'Client', required: true },
    title:       { type: String, required: true },
    description: { type: String },
    dueDate:     { type: Date },
    priority:    { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status:      { type: String, enum: ['To-Do', 'In Progress', 'Done'], default: 'To-Do' }
});