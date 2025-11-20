import { useState, useEffect } from 'react';
import { useSocket } from '../SocketContext';

export default function SpyGuessModal({ roomCode, playerId, onClose }) {
  const socket = useSocket();
  const [selected, setSelected] = useState('');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_locations', (response) => {
      if (response.success) {
        setLocations(response.locations);
      }
    });
  }, [socket]);

  const handleGuess = () => {
    if (!selected) return;

    socket.emit('guess_location', {
      code: roomCode,
      playerId,
      location: selected
    }, (response) => {
      if (response.success) {
        onClose();
      } else {
        alert(response.error);
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-large">
        <div className="terminal-header">GUESS LOCATION</div>
        <div className="terminal-box">
          <div className="info">Choose the location:</div>
          
          <div className="location-grid">
            {locations.map(loc => (
              <button
                key={loc}
                className={`location-btn ${selected === loc ? 'selected' : ''}`}
                onClick={() => setSelected(loc)}
              >
                {loc}
              </button>
            ))}
          </div>

          <div className="btn-group">
            <button 
              className="btn btn-danger" 
              onClick={handleGuess}
              disabled={!selected}
            >
              CONFIRM GUESS
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

