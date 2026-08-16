import { useState } from 'react';
import { useSocket } from '../SocketContext';

export default function FinalVoteModal({
  players,
  playerId,
  roomCode,
  votesNeeded,
  submitted,
  myNomination,
  onNominate
}) {
  const socket = useSocket();
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherPlayers = (players || []).filter(p => p.id !== playerId);
  const nominatedName = myNomination
    ? (players || []).find(p => p.id === myNomination)?.name
    : null;

  const handleSubmit = () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    socket.emit('submit_nomination', {
      code: roomCode,
      playerId,
      nominatedId: selected
    }, (response) => {
      setSubmitting(false);
      if (!response?.success) {
        alert(response?.error || 'Failed to submit nomination');
        return;
      }
      onNominate?.(selected);
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="terminal-header">TIME'S UP - VOTE NOW</div>
        <div className="terminal-box">
          <div className="accusation-info">
            <div>Nominate who you think is the spy</div>
            <div className="vote-status">Submitted: {submitted}/{votesNeeded}</div>
          </div>

          {!myNomination ? (
            <>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
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
                onClick={handleSubmit}
                disabled={!selected || submitting}
              >
                {submitting ? 'SUBMITTING...' : 'SUBMIT NOMINATION'}
              </button>
            </>
          ) : (
            <div className="info">You nominated: {nominatedName?.toUpperCase() || 'PLAYER'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
