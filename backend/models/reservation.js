const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  flightId: String,
  flightName: String,
  destination: String,
  scheduleTime: Date,
  status: String
});

module.exports = mongoose.model('Reservation', reservationSchema);