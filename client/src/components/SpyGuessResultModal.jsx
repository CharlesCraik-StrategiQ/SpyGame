import { useEffect } from 'react';
import { useSocket } from '../SocketContext';

export default function SpyGuessResultModal({ result, onClose, isHost, roomCode }) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleRoundEnded = () => {
      console.log('Round ended - closing modal and returning to lobby');
      onClose();
    };

    socket.on('round_ended', handleRoundEnded);

    return () => {
      socket.off('round_ended', handleRoundEnded);
    };
  }, [socket, onClose]);

  const handleEndRound = () => {
    socket.emit('end_round', { code: roomCode }, (response) => {
      if (!response.success) {
        alert(response.error);
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="terminal-header">ROUND COMPLETE</div>
        <div className="terminal-box">
          <div className="result-message">
            The location was: <span className="highlight">{result.location}</span>
          </div>
          <div className={`result-reveal ${result.correct ? 'correct' : 'incorrect'}`}>
            {result.correct ? (
              <>
                SPY GUESSED CORRECTLY!<br/>
                Spy gains +2 points
              </>
            ) : (
              <>
                SPY GUESSED WRONG!<br/>
                All non-spies gain +1 point
              </>
            )}
          </div>
          
          {!isHost && (
            <div className="info" style={{ marginTop: '20px' }}>
              Waiting for host to end round
            </div>
          )}
          
          <div className="btn-group">
            {isHost && (
              <button className="btn" onClick={handleEndRound}>
                END ROUND
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

