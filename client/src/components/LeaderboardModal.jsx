import { useState, useEffect } from 'react';
import { useSocket } from '../SocketContext';

export default function LeaderboardModal({ roomCode, onClose }) {
  const socket = useSocket();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_leaderboard', { code: roomCode }, (response) => {
      if (response.success) {
        setLeaderboard(response.leaderboard);
      }
    });
  }, [socket, roomCode]);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="terminal-header">LEADERBOARD</div>
        <div className="terminal-box">
          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <div key={index} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{player.name}</span>
                <span className="score">{player.score} PTS</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="info">No scores yet</div>
            )}
          </div>
          <button className="btn" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

