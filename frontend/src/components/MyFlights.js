import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyFlights.css';

function MyFlights() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reservations');
      setReservations(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch reservations. ' + err.message);
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString();
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="my-flights">
      <h1>My Flights</h1>
      {reservations.length === 0 ? (
        <p>You have no saved flights.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Flight</th>
              <th>Number</th>
              <th>Destination</th>
              <th>Scheduled Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation._id}>
                <td>{reservation.flightName}</td>
                <td>{reservation.flightNumber}</td>
                <td>{reservation.destination}</td>
                <td>{formatTime(reservation.scheduleTime)}</td>
                <td>{reservation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyFlights;