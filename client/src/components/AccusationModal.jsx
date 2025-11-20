import { useSocket } from '../SocketContext';

export default function AccusationModal({ accusation, votes, votesNeeded, playerId, roomCode, onClose }) {
  const socket = useSocket();
  const hasVoted = playerId in votes;
  const voteCount = Object.keys(votes).length;

  const handleVote = (vote) => {
    socket.emit('vote_accusation', {
      code: roomCode,
      playerId,
      vote
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="terminal-header">ACCUSATION</div>
        <div className="terminal-box">
          <div className="accusation-info">
            <div>{accusation.accuser.name} accuses</div>
            <div className="accused-name">{accusation.accused.name}</div>
            <div className="vote-status">Votes: {voteCount}/{votesNeeded}</div>
          </div>

          {!hasVoted ? (
            <div className="btn-group">
              <button className="btn" onClick={() => handleVote('agree')}>
                AGREE
              </button>
              <button className="btn btn-secondary" onClick={() => handleVote('reject')}>
                REJECT
              </button>
            </div>
          ) : (
            <div className="info">You voted: {votes[playerId].toUpperCase()}</div>
          )}

          <div className="vote-list">
            {Object.entries(votes).map(([id, vote]) => (
              <div key={id} className="vote-item">
                Player voted: {vote.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

