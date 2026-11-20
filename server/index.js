const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Works even if there is no .env file
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local_dev_secret_change_me';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/payments', require('./routes/payments'));

// Test route
app.get('/', (req, res) => {
    res.send('Freelancer Platform Server is Running!');
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log('✅ Local database ready (saved in server/data folder)');
    console.log(`✅ Server running on port ${PORT}`);
});