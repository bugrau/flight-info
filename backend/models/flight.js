const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const flightSchema = new Schema({
  flightNumber: { type: String, required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  userId: { type: String, required: true },
});

const Flight = mongoose.model('Flight', flightSchema);

module.exports = Flight;