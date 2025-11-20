import { useEffect, useState } from 'react';
import { useSocket } from '../SocketContext';

export default function GameScreen({ 
  roomCode, 
  playerId, 
  playerName,
  roomState, 
  role, 
  location,
  questions,
  onRoomUpdate,
  onRoleAssigned,
  onAccusationStarted,
  onVoteUpdate,
  onAccusationResult,
  onSpyGuessResult,
  onRoundEnd,
  onShowSpyGuess
}) {
  const socket = useSocket();
  const [selectedAccuse, setSelectedAccuse] = useState('');
  const [accusationBanner, setAccusationBanner] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (state) => {
      onRoomUpdate(state);
    });

    socket.on('accusation_started', (data) => {
      setAccusationBanner(data);
      onAccusationStarted(data);
    });

    socket.on('vote_update', (data) => {
      onVoteUpdate(data.votes, data.votesNeeded);
    });

    socket.on('accusation_result', (result) => {
      setAccusationBanner(null);
      onAccusationResult(result);
    });

    socket.on('spy_guess_result', (result) => {
      onSpyGuessResult(result);
    });

    socket.on('round_ended', () => {
      onRoundEnd();
    });

    socket.on('scores_reset', () => {
    });

    return () => {
      socket.off('room_update');
      socket.off('accusation_started');
      socket.off('vote_update');
      socket.off('accusation_result');
      socket.off('spy_guess_result');
      socket.off('round_ended');
      socket.off('scores_reset');
    };
  }, [socket, onRoomUpdate, onAccusationStarted, onVoteUpdate, onAccusationResult, onSpyGuessResult, onRoundEnd]);

  const handleAccuse = () => {
    if (!selectedAccuse) return;
    
    socket.emit('accuse_player', {
      code: roomCode,
      accuserId: playerId,
      accusedId: selectedAccuse
    }, (response) => {
      if (!response.success) {
        alert(response.error);
      }
      setSelectedAccuse('');
    });
  };

  const handleEndRound = () => {
    socket.emit('end_round', { code: roomCode }, (response) => {
      if (!response.success) {
        alert(response.error);
      }
    });
  };

  const isHost = roomState?.hostId === playerId;
  const otherPlayers = roomState?.players.filter(p => p.id !== playerId) || [];

  return (
    <div className="screen game-screen">
      {accusationBanner && (
        <div className="accusation-banner">
          <div className="accusation-banner-title">ACCUSATION IN PROGRESS</div>
          <div className="accusation-banner-text">
            {accusationBanner.accuser.name} accuses {accusationBanner.accused.name}
          </div>
        </div>
      )}
      <div className="container">
        <div className="terminal-header">ROUND IN PROGRESS</div>
        <div className="terminal-box">
          <div className="role-display">
            {role === 'spy' ? (
              <>
                <div className="role-title spy">YOU ARE THE SPY</div>
                <div className="role-info">Find out the location without revealing yourself</div>
              </>
            ) : (
              <>
                <div className="role-title">LOCATION</div>
                <div className="location-name">{location || 'Loading...'}</div>
                <div className="role-info">Find the spy among you</div>
              </>
            )}
          </div>

          {role === 'location' && questions && (
            <div className="section">
              <div className="section-title">EXAMPLE QUESTIONS</div>
              <div className="questions-list">
                {questions.map((question, index) => (
                  <div key={index} className="question-item">
                    • {question}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-title">PLAYERS</div>
            <div className="player-list">
              {roomState?.players.map(player => (
                <div key={player.id} className="player-item">
                  {player.name}
                  {player.id === playerId && <span className="badge"> [YOU]</span>}
                  <span className="score"> - {player.score} PTS</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">ACCUSE A PLAYER</div>
            <select 
              value={selectedAccuse} 
              onChange={(e) => setSelectedAccuse(e.target.value)}
              className="select"
            >
              <option value="">Select player...</option>
              {otherPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <button 
              className="btn" 
              onClick={handleAccuse}
              disabled={!selectedAccuse || roomState?.hasAccusation}
            >
              ACCUSE
            </button>
          </div>

          {role === 'spy' && (
            <div className="section">
              <button className="btn btn-danger" onClick={onShowSpyGuess}>
                GUESS LOCATION
              </button>
            </div>
          )}

          {isHost && (
            <div className="section">
              <button className="btn btn-secondary" onClick={handleEndRound}>
                END ROUND
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

