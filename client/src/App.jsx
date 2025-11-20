import { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './SocketContext';
import JoinScreen from './components/JoinScreen';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import AccusationModal from './components/AccusationModal';
import SpyGuessModal from './components/SpyGuessModal';
import LeaderboardModal from './components/LeaderboardModal';
import AccusationResultModal from './components/AccusationResultModal';
import SpyGuessResultModal from './components/SpyGuessResultModal';

function AppContent() {
  const socket = useSocket();
  const [screen, setScreen] = useState('join');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [role, setRole] = useState(null);
  const [location, setLocation] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [accusation, setAccusation] = useState(null);
  const [votes, setVotes] = useState({});
  const [votesNeeded, setVotesNeeded] = useState(0);
  const [showSpyGuess, setShowSpyGuess] = useState(false);
  const [accusationResult, setAccusationResult] = useState(null);
  const [spyGuessResult, setSpyGuessResult] = useState(null);

  // Global socket listeners for round transitions
  useEffect(() => {
    if (!socket) return;

    const handleRoundStarted = () => {
      console.log('Round started - transitioning to game for player:', playerId);
      setAccusationResult(null);
      setSpyGuessResult(null);
      setRole(null);
      setLocation(null);
      setQuestions(null);
      setScreen('game');
    };

    const handleRoleAssigned = (data) => {
      console.log('Role assigned to player', playerId, ':', data);
      setRole(data.role);
      setLocation(data.location);
      setQuestions(data.questions);
    };

    socket.on('round_started', handleRoundStarted);
    socket.on('role_assigned', handleRoleAssigned);

    return () => {
      socket.off('round_started', handleRoundStarted);
      socket.off('role_assigned', handleRoleAssigned);
    };
  }, [socket, playerId]);

  return (
      <div className="app">
        {screen === 'join' && (
          <JoinScreen 
            onJoinSuccess={(code, id, name, state) => {
              setRoomCode(code);
              setPlayerId(id);
              setPlayerName(name);
              setRoomState(state);
              setScreen('lobby');
            }}
          />
        )}
        
        {screen === 'lobby' && (
          <Lobby 
            roomCode={roomCode}
            playerId={playerId}
            roomState={roomState}
            onRoomUpdate={setRoomState}
            onRoundStart={() => setScreen('game')}
          />
        )}
        
        {screen === 'game' && (
          <GameScreen 
            roomCode={roomCode}
            playerId={playerId}
            playerName={playerName}
            roomState={roomState}
            role={role}
            location={location}
            questions={questions}
            onRoomUpdate={setRoomState}
            onRoleAssigned={(r, l) => {
              setRole(r);
              setLocation(l);
            }}
            onAccusationStarted={(acc) => {
              setAccusation(acc);
              setVotes(acc.votes);
              setVotesNeeded(roomState.players.length);
            }}
            onVoteUpdate={(v, vn) => {
              setVotes(v);
              setVotesNeeded(vn);
            }}
            onAccusationResult={(result) => {
              if (result.complete) {
                setAccusation(null);
                setVotes({});
                setAccusationResult(result);
                // Update room state to reflect new scores
                if (result.scores) {
                  const updatedRoomState = { ...roomState };
                  updatedRoomState.players = updatedRoomState.players.map(p => {
                    const updatedPlayer = result.scores.find(s => s.id === p.id);
                    return updatedPlayer ? { ...p, score: updatedPlayer.score } : p;
                  });
                  setRoomState(updatedRoomState);
                }
              }
            }}
            onSpyGuessResult={(result) => {
              setSpyGuessResult(result);
            }}
            onRoundEnd={() => {
              setScreen('lobby');
              setRole(null);
              setLocation(null);
              setQuestions(null);
              setAccusation(null);
              setVotes({});
            }}
            onShowSpyGuess={() => setShowSpyGuess(true)}
          />
        )}

        {accusation && (
          <AccusationModal 
            accusation={accusation}
            votes={votes}
            votesNeeded={votesNeeded}
            playerId={playerId}
            roomCode={roomCode}
            onClose={() => setAccusation(null)}
          />
        )}

        {showSpyGuess && (
          <SpyGuessModal 
            roomCode={roomCode}
            playerId={playerId}
            onClose={() => setShowSpyGuess(false)}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal 
            roomCode={roomCode}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {accusationResult && (
          <AccusationResultModal 
            result={accusationResult}
            isHost={roomState?.hostId === playerId}
            roomCode={roomCode}
            onClose={() => {
              setAccusationResult(null);
              setScreen('lobby');
              setRole(null);
              setLocation(null);
              setQuestions(null);
            }}
          />
        )}

        {spyGuessResult && (
          <SpyGuessResultModal 
            result={spyGuessResult}
            isHost={roomState?.hostId === playerId}
            roomCode={roomCode}
            onClose={() => {
              setSpyGuessResult(null);
              setScreen('lobby');
              setRole(null);
              setLocation(null);
              setQuestions(null);
            }}
          />
        )}

        {(screen === 'lobby' || screen === 'game') && (
          <button 
            className="leaderboard-btn"
            onClick={() => setShowLeaderboard(true)}
          >
            LEADERBOARD
          </button>
        )}
      </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;

