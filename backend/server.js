const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const Reservation = require('./models/reservation');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection (keep this if you still want to use MongoDB)
const MONGODB_URI = `mongodb+srv://bugraunaltay:${encodeURIComponent(process.env.DB_PASSWORD)}@cluster0.bc1gf.mongodb.net/flightinfo?retryWrites=true&w=majority`;
console.log('Attempting to connect to MongoDB...');
console.log('MONGODB_URI:', MONGODB_URI.replace(process.env.DB_PASSWORD, '********'));

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB database connection established successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Full error object:', JSON.stringify(err, null, 2));
    console.error('Stack trace:', err.stack);
    // Don't exit the process, as we can still use the Schiphol API
    // process.exit(1);
  });

// Schiphol API route with filters
const axiosInstance = axios.create({
  baseURL: 'https://api.schiphol.nl/public-flights',
  headers: {
    'Accept': 'application/json',
    'ResourceVersion': 'v4',
    'app_id': process.env.SCHIPHOL_APP_ID,
    'app_key': process.env.SCHIPHOL_APP_KEY
  }
});

// Add a request interceptor
axiosInstance.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2));
  return request;
});

// Add a response interceptor
axiosInstance.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
});

// Modify the existing /api/flights endpoint to handle date and direction filtering
app.get('/api/flights', async (req, res) => {
  try {
    const { scheduleDate, flightDirection, page = 0, sort = '+scheduleTime' } = req.query;
    console.log('Received request for flights:', { scheduleDate, flightDirection, page, sort });
    
    const params = {
      scheduleDate,
      flightDirection,
      page,
      sort,
      includedelays: false
    };

    const response = await axiosInstance.get('/flights', { params });

    // Extract pagination info from the 'link' header
    const linkHeader = response.headers.link;
    const paginationInfo = {
      currentPage: parseInt(page),
      totalPages: 1
    };

    if (linkHeader) {
      const links = linkHeader.split(', ');
      const lastLink = links.find(link => link.includes('rel="last"'));
      if (lastLink) {
        const match = lastLink.match(/page=(\d+)/);
        if (match) {
          paginationInfo.totalPages = parseInt(match[1]);
        }
      }
    }

    console.log('Sending response:', {
      flights: response.data.flights,
      pagination: paginationInfo
    });

    res.json({
      flights: response.data.flights,
      pagination: paginationInfo
    });
  } catch (error) {
    console.error('Error fetching flights from Schiphol API:', error);
    res.status(error.response ? error.response.status : 500).json({ error: 'Error fetching flight data' });
  }
});

// Add this new endpoint after your existing /api/flights endpoint
app.get('/api/upcoming-flights', async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toISOString().split('T')[1].split(':')[0] + ':00:00';

    const response = await axiosInstance.get('/flights', {
      params: {
        scheduleDate: currentDate,
        flightDirection: 'D', // Departures
        fromScheduleTime: currentTime,
        sort: '+scheduleTime',
        page: 0,
        max: 2
      }
    });

    res.json(response.data.flights || []);
  } catch (error) {
    console.error('Error fetching upcoming flights:', error.message);
    res.status(500).json({ error: 'Error fetching upcoming flights' });
  }
});

// Modify the reservation route to check for past dates
app.post('/api/reservations', async (req, res) => {
  try {
    const { flightId } = req.body;
    const flightResponse = await axiosInstance.get(`/flights/${flightId}`);
    const flightData = flightResponse.data;

    const currentDate = new Date();
    const flightDate = new Date(flightData.scheduleDateTime);

    if (flightDate < currentDate) {
      return res.status(400).json({ message: 'Cannot make a reservation for a past date' });
    }

    const reservation = new Reservation({
      flightId: flightData.id,
      flightName: flightData.flightName,
      flightNumber: flightData.flightNumber,
      destination: flightData.route.destinations[0],
      scheduleTime: flightData.scheduleDateTime,
      status: flightData.publicFlightState.flightStates[0]
    });

    await reservation.save();
    res.status(201).json({ message: 'Reservation created successfully', reservation });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Error creating reservation', error: error.message });
  }
});

// Get reservations route
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations', error: error.message });
  }
});

// Delete reservation route
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Reservation.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ message: 'Error deleting reservation', error: error.message });
  }
});

// Keep the existing routes if you still want to use them
const flightsRouter = require('./routes/flights');
app.use('/flights', flightsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

console.log('SCHIPHOL_APP_ID:', process.env.SCHIPHOL_APP_ID);
console.log('SCHIPHOL_APP_KEY:', process.env.SCHIPHOL_APP_KEY);

app.get('/api/test', async (req, res) => {
  try {
    const response = await axiosInstance.get('/flights', {
      params: {
        scheduleDate: new Date().toISOString().split('T')[0], // Today's date
        flightDirection: 'A',
        page: 0,
        sort: '+scheduleTime',
        includedelays: false
      }
    });
    res.json({ message: 'API is accessible', data: response.data });
  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(error.response ? error.response.status : 500).json({ error: 'Error testing API' });
  }
});