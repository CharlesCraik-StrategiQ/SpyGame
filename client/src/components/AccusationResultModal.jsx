import { useEffect } from 'react';
import { useSocket } from '../SocketContext';

export default function AccusationResultModal({ result, onClose, isHost, roomCode }) {
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
          {result.forced ? (
            <>
              <div className="result-message">
                Most nominated: {result.accused.name}
              </div>
              <div className={`result-reveal ${result.wasSpy ? 'spy' : ''}`}>
                {result.wasSpy ? (
                  <>THEY WERE THE SPY!</>
                ) : (
                  <>THEY WERE NOT THE SPY</>
                )}
              </div>
              {result.wasSpy && (
                <div className="info">All non-spies gain +1 point</div>
              )}
              {!result.wasSpy && (
                <div className="info">Wrong player selected - Spy gains +1 point</div>
              )}
            </>
          ) : (
            <>
              <div className="result-message">
                Vote Results: {result.agreeCount || 0} Agree / {result.rejectCount || 0} Reject
              </div>
              
              {result.tied ? (
                <>
                  <div className="result-message">
                    Vote tied - {result.accused.name} stays
                  </div>
                  <div className="info">No points awarded</div>
                </>
              ) : result.agreed ? (
                <>
                  <div className="result-message">
                    {result.accused.name} was voted out
                  </div>
                  <div className={`result-reveal ${result.wasSpy ? 'spy' : ''}`}>
                    {result.wasSpy ? (
                      <>THEY WERE THE SPY!</>
                    ) : (
                      <>THEY WERE NOT THE SPY</>
                    )}
                  </div>
                  {result.wasSpy && (
                    <div className="info">All non-spies gain +1 point</div>
                  )}
                  {!result.wasSpy && (
                    <div className="info">Wrong player accused - Spy gains +1 point</div>
                  )}
                </>
              ) : (
                <>
                  <div className="result-message">
                    Vote rejected - {result.accused.name} stays
                  </div>
                  <div className="info">Spy gains +1 point</div>
                </>
              )}
            </>
          )}
          
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
