import { useEffect, useState } from 'react';
import { useSocket } from '../SocketContext';
import HostOptionsModal from './HostOptionsModal';

export default function Lobby({ roomCode, playerId, roomState, onRoomUpdate, onRoundStart }) {
  const socket = useSocket();
  const [showHostOptions, setShowHostOptions] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (state) => {
      onRoomUpdate(state);
    };

    // App already listens for round_started; Lobby only needs room_update
    socket.on('room_update', handleRoomUpdate);

    return () => {
      socket.off('room_update', handleRoomUpdate);
    };
  }, [socket, onRoomUpdate]);

  const handleStartRound = () => {
    socket.emit('start_round', { code: roomCode }, (response) => {
      if (!response.success) {
        alert(response.error);
      }
    });
  };

  const handleResetScores = () => {
    socket.emit('reset_scores', { code: roomCode }, (response) => {
      if (!response.success) {
        alert(response.error);
      }
    });
  };

  const isHost = roomState?.hostId === playerId;
  const canStart = roomState?.players.length >= 3;
  const settings = roomState?.settings;
  const timerStatus = settings?.timerEnabled
    ? `Round Timer: ${settings.timerMinutes} min`
    : 'Round Timer: Off';

  return (
    <div className="screen">
      <div className="container">
        <div className="terminal-header">LOBBY</div>
        <div className="terminal-box">
          <div className="room-code">
            ROOM CODE<br/>
            <span className="highlight">{roomCode}</span>
          </div>

          <div className="info timer-status">{timerStatus}</div>
          
          <div className="section">
            <div className="section-title">PLAYERS ({roomState?.players.length || 0})</div>
            <div className="player-list">
              {roomState?.players.map(player => (
                <div key={player.id} className="player-item">
                  {player.name} 
                  {player.isHost && <span className="badge"> [HOST]</span>}
                  <span className="score"> - {player.score} PTS</span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="host-controls">
              <button 
                className="btn" 
                onClick={handleStartRound}
                disabled={!canStart}
              >
                START ROUND
              </button>
              {!canStart && (
                <div className="info">Need at least 3 players</div>
              )}
              <button className="btn btn-secondary" onClick={() => setShowHostOptions(true)}>
                HOST OPTIONS
              </button>
              <button className="btn btn-secondary" onClick={handleResetScores}>
                RESET SCORES
              </button>
            </div>
          )}

          {!isHost && (
            <div className="info">Waiting for host to start...</div>
          )}
        </div>
      </div>

      {showHostOptions && (
        <HostOptionsModal
          roomCode={roomCode}
          settings={settings}
          onClose={() => setShowHostOptions(false)}
        />
      )}
    </div>
  );
}
