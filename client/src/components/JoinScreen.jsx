import { useState } from 'react';
import { useSocket } from '../SocketContext';

export default function JoinScreen({ onJoinSuccess }) {
  const socket = useSocket();
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name');
      return;
    }

    socket.emit('create_room', (response) => {
      if (response.success) {
        const code = response.room.code;
        socket.emit('join_room', { code, playerName }, (joinResponse) => {
          if (joinResponse.success) {
            onJoinSuccess(code, socket.id, playerName, joinResponse.room);
          }
        });
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Enter room code');
      return;
    }

    socket.emit('join_room', { code: roomCode.toUpperCase(), playerName }, (response) => {
      if (response.success) {
        onJoinSuccess(roomCode.toUpperCase(), socket.id, playerName, response.room);
      } else {
        setError(response.error);
      }
    });
  };

  if (!mode) {
    return (
      <div className="screen">
        <div className="container">
          <div className="terminal-header">▶ SPYCALL</div>
          <div className="terminal-box">
            <div className="ascii-art">
 _____ ______   __ _____  ___   _     _     <br/>
/  ___|| ___ \ \ / //  __ \/ _ \ | |   | |    <br/>
\ `--. | |_/ /\ V / | /  \/ /_\ \| |   | |    <br/>
 `--. \|  __/  \ /  | |   |  _  || |   | |    <br/>
/\__/ /| |     | |  | \__/\ | | || |___| |____<br/>
\____/ \_|     \_/   \____/\_| |_/\_____\_____/<br/>
            </div>
            <button className="btn" onClick={() => setMode('create')}>
              CREATE ROOM
            </button>
            <button className="btn" onClick={() => setMode('join')}>
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="screen">
        <div className="container">
          <div className="terminal-header">CREATE ROOM</div>
          <div className="terminal-box">
            <div className="form-group">
              <label>ENTER NAME:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={20}
              />
            </div>
            {error && <div className="error">ERROR: {error}</div>}
            <div className="btn-group">
              <button className="btn" onClick={handleCreateRoom}>
                CREATE
              </button>
              <button className="btn btn-secondary" onClick={() => setMode(null)}>
                BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="container">
        <div className="terminal-header">JOIN ROOM</div>
        <div className="terminal-box">
          <div className="form-group">
            <label>ENTER NAME:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label>ROOM CODE:</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
            />
          </div>
          {error && <div className="error">ERROR: {error}</div>}
          <div className="btn-group">
            <button className="btn" onClick={handleJoinRoom}>
              JOIN
            </button>
            <button className="btn btn-secondary" onClick={() => setMode(null)}>
              BACK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

