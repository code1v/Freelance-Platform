const { model } = require('../db');

module.exports = model('Payment', {
    user:        { type: 'Id', ref: 'User', required: true },
    client:      { type: 'Id', ref: 'Client', required: true },
    task:        { type: 'Id', ref: 'Task' },
    amount:      { type: Number, required: true },
    status:      { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
    description: { type: String },
    date:        { type: Date, default: () => Date.now() }
});