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
  onAccusationStarted,
  onVoteUpdate,
  onAccusationResult,
  onSpyGuessResult,
  onRoundEnd,
  onShowSpyGuess,
  finalVoteActive
}) {
  const socket = useSocket();
  const [selectedAccuse, setSelectedAccuse] = useState('');
  const [accusationBanner, setAccusationBanner] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (state) => {
      onRoomUpdate(state);
    };

    const handleAccusationStarted = (data) => {
      if (finalVoteActive) return;
      setAccusationBanner(data);
      onAccusationStarted(data);
    };

    const handleVoteUpdate = (data) => {
      onVoteUpdate(data.votes, data.votesNeeded);
    };

    const handleAccusationResult = (result) => {
      setAccusationBanner(null);
      onAccusationResult(result);
    };

    const handleSpyGuessResult = (result) => {
      onSpyGuessResult(result);
    };

    const handleRoundEnded = () => {
      onRoundEnd();
    };

    socket.on('room_update', handleRoomUpdate);
    socket.on('accusation_started', handleAccusationStarted);
    socket.on('vote_update', handleVoteUpdate);
    socket.on('accusation_result', handleAccusationResult);
    socket.on('spy_guess_result', handleSpyGuessResult);
    socket.on('round_ended', handleRoundEnded);

    return () => {
      socket.off('room_update', handleRoomUpdate);
      socket.off('accusation_started', handleAccusationStarted);
      socket.off('vote_update', handleVoteUpdate);
      socket.off('accusation_result', handleAccusationResult);
      socket.off('spy_guess_result', handleSpyGuessResult);
      socket.off('round_ended', handleRoundEnded);
    };
  }, [
    socket,
    finalVoteActive,
    onRoomUpdate,
    onAccusationStarted,
    onVoteUpdate,
    onAccusationResult,
    onSpyGuessResult,
    onRoundEnd
  ]);

  const handleAccuse = () => {
    if (!selectedAccuse || finalVoteActive) return;
    
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
  const accuseDisabled =
    !selectedAccuse ||
    roomState?.hasAccusation ||
    roomState?.hasFinalVote ||
    finalVoteActive;

  return (
    <div className="screen game-screen">
      {accusationBanner && !finalVoteActive && (
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
              disabled={roomState?.hasFinalVote || finalVoteActive}
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
              disabled={accuseDisabled}
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
