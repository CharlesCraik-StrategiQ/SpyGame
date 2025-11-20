import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './gameManager.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const gameManager = new GameManager();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', (callback) => {
    const room = gameManager.createRoom(socket.id);
    socket.join(room.code);
    callback({ success: true, room });
  });

  socket.on('join_room', ({ code, playerName }, callback) => {
    const result = gameManager.joinRoom(code, socket.id, playerName);
    if (result.success) {
      socket.join(code);
      io.to(code).emit('room_update', gameManager.getRoomState(code));
      callback({ success: true, room: result.room });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on('start_round', ({ code }, callback) => {
    const result = gameManager.startRound(code, socket.id);
    if (result.success) {
      const roomState = gameManager.getRoomState(code);
      const room = gameManager.rooms.get(code);
      
      console.log(`Round started in room ${code} by ${socket.id}`);
      console.log(`Emitting to ${room.players.length} players`);
      
      io.to(code).emit('round_started', roomState);
      
      room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          console.log(`Assigning role to player ${player.id}: ${player.role}, location: ${room.currentLocation?.name}`);
          playerSocket.emit('role_assigned', {
            role: player.role,
            location: player.role === 'spy' ? null : room.currentLocation?.name,
            questions: player.role === 'spy' ? null : room.currentLocation?.questions
          });
        }
      });
      
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, error: result.error });
    }
  });

  socket.on('accuse_player', ({ code, accuserId, accusedId }, callback) => {
    const result = gameManager.accusePlayer(code, accuserId, accusedId);
    if (result.success) {
      io.to(code).emit('accusation_started', {
        accuser: result.accuser,
        accused: result.accused,
        votes: result.votes
      });
      callback({ success: true });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on('vote_accusation', ({ code, playerId, vote }, callback) => {
    const result = gameManager.voteAccusation(code, playerId, vote);
    if (result.success) {
      io.to(code).emit('vote_update', {
        votes: result.votes,
        votesNeeded: result.votesNeeded
      });

      if (result.complete) {
        io.to(code).emit('accusation_result', {
          accused: result.accused,
          wasSpy: result.wasSpy,
          scores: result.scores,
          complete: true,
          agreed: result.agreed,
          agreeCount: result.agreeCount,
          rejectCount: result.rejectCount
        });
        
        // Save scores after any vote result
        gameManager.saveScores();
        
        // Update room state to reflect new scores
        io.to(code).emit('room_update', gameManager.getRoomState(code));
      }
      
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, error: result.error });
    }
  });

  socket.on('guess_location', ({ code, playerId, location }, callback) => {
    const result = gameManager.guessLocation(code, playerId, location);
    if (result.success) {
      io.to(code).emit('spy_guess_result', {
        correct: result.correct,
        location: result.location,
        scores: result.scores
      });
      gameManager.saveScores();
      callback({ success: true, correct: result.correct });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on('end_round', ({ code }, callback) => {
    const result = gameManager.endRound(code, socket.id);
    if (result.success) {
      io.to(code).emit('round_ended');
      io.to(code).emit('room_update', gameManager.getRoomState(code));
      callback({ success: true });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on('reset_scores', ({ code }, callback) => {
    const result = gameManager.resetScores(code, socket.id);
    if (result.success) {
      io.to(code).emit('scores_reset');
      io.to(code).emit('room_update', gameManager.getRoomState(code));
      gameManager.saveScores();
      callback({ success: true });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on('get_leaderboard', ({ code }, callback) => {
    const leaderboard = gameManager.getLeaderboard(code);
    callback({ success: true, leaderboard });
  });

  socket.on('get_locations', (callback) => {
    const locations = gameManager.getAllLocations();
    callback({ success: true, locations });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const result = gameManager.removePlayer(socket.id);
    if (result.code) {
      io.to(result.code).emit('room_update', gameManager.getRoomState(result.code));
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

