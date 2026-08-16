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
import FinalVoteModal from './components/FinalVoteModal';

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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
  const [finalVote, setFinalVote] = useState(null);
  const [finalVoteProgress, setFinalVoteProgress] = useState(null);
  const [myNomination, setMyNomination] = useState(null);
  const [now, setNow] = useState(Date.now());

  const clearFinalVote = () => {
    setFinalVote(null);
    setFinalVoteProgress(null);
    setMyNomination(null);
  };

  const applyScores = (scores) => {
    if (!scores) return;
    setRoomState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => {
          const updatedPlayer = scores.find(s => s.id === p.id);
          return updatedPlayer ? { ...p, score: updatedPlayer.score } : p;
        })
      };
    });
  };

  const showCountdown =
    screen === 'game' &&
    roomState?.settings?.timerEnabled &&
    roomState?.roundEndTime &&
    !roomState?.hasAccusation &&
    !roomState?.hasFinalVote &&
    !finalVote &&
    !accusation;

  const msRemaining = showCountdown ? roomState.roundEndTime - now : null;

  useEffect(() => {
    if (!showCountdown) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [showCountdown]);

  // Persistent socket listeners (survive Lobby/GameScreen mount/unmount)
  useEffect(() => {
    if (!socket) return;

    const handleRoundStarted = (state) => {
      setAccusationResult(null);
      setSpyGuessResult(null);
      setAccusation(null);
      setVotes({});
      setRole(null);
      setLocation(null);
      setQuestions(null);
      clearFinalVote();
      if (state) {
        setRoomState(state);
      }
      setScreen('game');
    };

    const handleRoleAssigned = (data) => {
      setRole(data.role);
      setLocation(data.location);
      setQuestions(data.questions);
    };

    const handleRoomUpdate = (state) => {
      setRoomState(state);
    };

    const handleFinalVoteStarted = (data) => {
      setAccusation(null);
      setVotes({});
      setFinalVote(data);
      setFinalVoteProgress({ submitted: 0, votesNeeded: data.votesNeeded });
      setMyNomination(null);
    };

    const handleFinalVoteProgress = (data) => {
      setFinalVoteProgress(data);
    };

    const handleFinalVoteResult = (result) => {
      clearFinalVote();
      setAccusation(null);
      setVotes({});
      setAccusationResult({ ...result, forced: true, complete: true });
      applyScores(result.scores);
    };

    socket.on('round_started', handleRoundStarted);
    socket.on('role_assigned', handleRoleAssigned);
    socket.on('room_update', handleRoomUpdate);
    socket.on('final_vote_started', handleFinalVoteStarted);
    socket.on('final_vote_progress', handleFinalVoteProgress);
    socket.on('final_vote_result', handleFinalVoteResult);

    return () => {
      socket.off('round_started', handleRoundStarted);
      socket.off('role_assigned', handleRoleAssigned);
      socket.off('room_update', handleRoomUpdate);
      socket.off('final_vote_started', handleFinalVoteStarted);
      socket.off('final_vote_progress', handleFinalVoteProgress);
      socket.off('final_vote_result', handleFinalVoteResult);
    };
  }, [socket]);

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
            onAccusationStarted={(acc) => {
              // Ignore mid-round accuse UI if a forced final vote is active
              if (finalVote) return;
              clearFinalVote();
              setAccusation(acc);
              setVotes(acc.votes);
              setVotesNeeded(roomState?.players?.length || 0);
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
                applyScores(result.scores);
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
              clearFinalVote();
            }}
            onShowSpyGuess={() => setShowSpyGuess(true)}
            finalVoteActive={!!finalVote}
          />
        )}

        {finalVote && screen === 'game' && (
          <FinalVoteModal
            players={finalVote.players}
            playerId={playerId}
            roomCode={roomCode}
            votesNeeded={finalVoteProgress?.votesNeeded ?? finalVote.votesNeeded}
            submitted={finalVoteProgress?.submitted ?? 0}
            myNomination={myNomination}
            onNominate={setMyNomination}
          />
        )}

        {accusation && !finalVote && (
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
              clearFinalVote();
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
              clearFinalVote();
            }}
          />
        )}

        {showCountdown && msRemaining != null && (
          <div className={`timer-badge ${msRemaining <= 30000 ? 'timer-urgent' : ''}`}>
            <div className="timer-badge-title">TIMER</div>
            <div className="timer-badge-text">{formatCountdown(msRemaining)}</div>
          </div>
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
