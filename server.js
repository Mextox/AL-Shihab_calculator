const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.get('/api/settings', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync('./config/settings.json', 'utf8'));
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    fs.writeFileSync('./config/settings.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.get('/api/cars', (req, res) => {
  try {
    const carsFile = './data/cars.json';
    if (fs.existsSync(carsFile)) {
      const cars = JSON.parse(fs.readFileSync(carsFile, 'utf8'));
      res.json(cars);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load cars' });
  }
});

app.post('/api/cars', (req, res) => {
  try {
    const carsFile = './data/cars.json';
    const dataDir = './data';
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync(carsFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Cars saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save cars' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚗 Car Finance Calculator running on http://localhost:${PORT}`);
}); 