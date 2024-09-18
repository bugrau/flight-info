import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [flightDirection, setFlightDirection] = useState('A');
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({ currentPage: 0, totalPages: 1 });
  const navigate = useNavigate();

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching flights with params:', { scheduleDate, flightDirection, page });
      const response = await axios.get(`http://localhost:5000/api/flights`, {
        params: { scheduleDate, flightDirection, page }
      });
      console.log('Received response:', response.data);
      setFlights(response.data.flights || []);
      setPagination(response.data.pagination || { currentPage: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching flights:', err);
      setError('Failed to fetch flights. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [scheduleDate, flightDirection, page]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const handleNextPage = () => {
    setPage(prevPage => prevPage + 1);
  };

  const handlePrevPage = () => {
    setPage(prevPage => Math.max(0, prevPage - 1));
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const makeReservation = async (flightId) => {
    try {
      await axios.post('http://localhost:5000/api/reservations', { flightId });
      alert('Your flight has been saved!');
      navigate('/my-flights');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert(error.response.data.message);
      } else {
        alert('Failed to make reservation. Please try again.');
      }
    }
  };

  return (
    <div className="homepage">
      <h1>Flight Information</h1>
      
      <div className="filters">
        <label>
          Date:
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </label>
        <label>
          Direction:
          <select
            value={flightDirection}
            onChange={(e) => setFlightDirection(e.target.value)}
          >
            <option value="A">Arrivals</option>
            <option value="D">Departures</option>
          </select>
        </label>
      </div>
      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}
      {flights.length > 0 && (
        <div className="flights-list">
          <table>
            <thead>
              <tr>
                <th>Flight</th>
                <th>Number</th>
                <th>Destination</th>
                <th>Scheduled Time</th>
                <th>Gate</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => (
                <tr key={flight.id}>
                  <td>{flight.flightName}</td>
                  <td>{flight.flightNumber}</td>
                  <td>{flight.route.destinations[0]}</td>
                  <td>{formatTime(flight.scheduleTime)}</td>
                  <td>{flight.gate || 'TBA'}</td>
                  <td>{flight.publicFlightState.flightStates[0]}</td>
                  <td>
                    <button onClick={() => makeReservation(flight.id)}>Reserve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={handlePrevPage} disabled={page === 0}>Previous</button>
            <span>Page {pagination.currentPage + 1} of {pagination.totalPages}</span>
            <button onClick={handleNextPage} disabled={pagination.currentPage + 1 >= pagination.totalPages}>Next</button>
          </div>
        </div>
      )}
      {!loading && !error && flights.length === 0 && (
        <p className="no-flights">No flights found for the selected criteria.</p>
      )}
    </div>
  );
}

export default HomePage;