const express = require('express');
const bodyParser = require('body-parser');
const {main} = require('./light');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.get('/', (req, res) => {
    return res.status(200).json({ message: 'The server is running' });
});


app.post('/audit', async (req, res) => {
    const { urls } = req.body;

    if (!urls) {
        return res.status(400).json({ error: 'Invalid request. Please provide an array of URLs.' });
    }

    try {
        // const Queue = await import('p-queue');
        const lighthouseReports = await main(urls);
        console.log(lighthouseReports)
        res.json({ lighthouseReports });
    } catch (error) {
        console.error('Error processing audit request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
