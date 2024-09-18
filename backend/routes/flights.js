const router = require('express').Router();
const Flight = require('../models/flight');
const axios = require('axios');

// Schiphol API configuration
const schipholConfig = {
  baseURL: 'https://api.schiphol.nl/public-flights/flights',
  headers: {
    'app_id': '1d74b62a',
    'app_key': '81138edaf7acb88e406ff201faf47490',
    'Accept': 'application/json',
    'ResourceVersion': 'v4'
  }
};

// Get flights from Schiphol API
router.get('/schiphol', async (req, res) => {
  try {
    const response = await axios.get('', schipholConfig);
    res.json(response.data);
  } catch (error) {
    res.status(400).json('Error: ' + error);
  }
});

// Save a flight reservation
router.post('/reserve', async (req, res) => {
  const newFlight = new Flight(req.body);

  try {
    await newFlight.save();
    res.json('Flight reserved!');
  } catch (error) {
    res.status(400).json('Error: ' + error);
  }
});

// Get user's reserved flights
router.get('/user/:userId', async (req, res) => {
  try {
    const flights = await Flight.find({ userId: req.params.userId });
    res.json(flights);
  } catch (error) {
    res.status(400).json('Error: ' + error);
  }
});

module.exports = router;