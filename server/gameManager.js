import fs from 'fs';
import path from 'path';

const LOCATIONS_FILE = path.join(process.cwd(), 'server', 'locations.json');
const SCORES_FILE = path.join(process.cwd(), 'server', 'scores.json');

// Load locations from JSON file
let LOCATIONS = [];
try {
  const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
  LOCATIONS = locationsData.locations;
} catch (error) {
  console.error('Error loading locations:', error);
  LOCATIONS = [];
}

export class GameManager {
  constructor() {
    this.rooms = new Map();
    this.playerRoomMap = new Map();
    this.loadScores();
  }

  loadScores() {
    try {
      if (fs.existsSync(SCORES_FILE)) {
        const data = fs.readFileSync(SCORES_FILE, 'utf8');
        this.scores = JSON.parse(data);
      } else {
        this.scores = {};
      }
    } catch (error) {
      console.error('Error loading scores:', error);
      this.scores = {};
    }
  }

  saveScores() {
    try {
      fs.writeFileSync(SCORES_FILE, JSON.stringify(this.scores, null, 2));
    } catch (error) {
      console.error('Error saving scores:', error);
    }
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(hostId) {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId,
      players: [],
      roundActive: false,
      currentLocation: null,
      accusation: null
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, playerId, playerName) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.roundActive) {
      return { success: false, error: 'Round in progress' };
    }

    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      return { success: true, room };
    }

    const player = {
      id: playerId,
      name: playerName,
      score: this.scores[playerId] || 0,
      role: null,
      isHost: room.players.length === 0
    };

    if (player.isHost) {
      room.hostId = playerId;
    }

    room.players.push(player);
    this.playerRoomMap.set(playerId, code);

    return { success: true, room };
  }

  startRound(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can start round' };
    }

    if (room.players.length < 3) {
      return { success: false, error: 'Need at least 3 players' };
    }

    room.roundActive = true;
    
    // Pick a new location that's different from the previous one
    const previousLocationName = room.currentLocation?.name;
    let newLocation;
    do {
      newLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    } while (newLocation?.name === previousLocationName && LOCATIONS.length > 1);
    
    room.currentLocation = newLocation;
    room.accusation = null;

    const spyIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach((player, index) => {
      player.role = index === spyIndex ? 'spy' : 'location';
    });

    return { success: true };
  }

  accusePlayer(code, accuserId, accusedId) {
    const room = this.rooms.get(code);
    if (!room || !room.roundActive) {
      return { success: false, error: 'No active round' };
    }

    if (room.accusation) {
      return { success: false, error: 'Accusation already in progress' };
    }

    const accuser = room.players.find(p => p.id === accuserId);
    const accused = room.players.find(p => p.id === accusedId);

    if (!accuser || !accused) {
      return { success: false, error: 'Player not found' };
    }

    room.accusation = {
      accuserId,
      accusedId,
      votes: {}
    };

    return { 
      success: true, 
      accuser: { id: accuser.id, name: accuser.name },
      accused: { id: accused.id, name: accused.name },
      votes: {}
    };
  }

  voteAccusation(code, playerId, vote) {
    const room = this.rooms.get(code);
    if (!room || !room.accusation) {
      return { success: false, error: 'No active accusation' };
    }

    room.accusation.votes[playerId] = vote;

    const totalVotes = Object.keys(room.accusation.votes).length;
    const votesNeeded = room.players.length;

    if (totalVotes === votesNeeded) {
      const agreeCount = Object.values(room.accusation.votes).filter(v => v === 'agree').length;
      const rejectCount = Object.values(room.accusation.votes).filter(v => v === 'reject').length;
      
      const accused = room.players.find(p => p.id === room.accusation.accusedId);
      const wasSpy = accused.role === 'spy';
      
      let scores = null;
      let agreed = false;
      let tied = agreeCount === rejectCount;
      
      if (tied) {
        // Tie - no points awarded to anyone
        room.roundActive = false;
        scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
      } else if (agreeCount > rejectCount) {
        // Vote passed (majority agrees)
        agreed = true;
        
        if (wasSpy) {
          // Spy was caught - non-spies get +1 point
          room.players.forEach(player => {
            if (player.role !== 'spy') {
              player.score += 1;
              this.scores[player.id] = player.score;
            }
          });
          scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
        } else {
          // Wrong player accused - spy gets +1 point for fooling everyone
          const spy = room.players.find(p => p.role === 'spy');
          if (spy) {
            spy.score += 1;
            this.scores[spy.id] = spy.score;
          }
          scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
        }
        room.roundActive = false;
      } else {
        // Vote rejected (majority rejects) - spy gets +1 point
        const spy = room.players.find(p => p.role === 'spy');
        if (spy) {
          spy.score += 1;
          this.scores[spy.id] = spy.score;
        }
        scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
        room.roundActive = false;
      }

      const result = {
        success: true,
        votes: room.accusation.votes,
        votesNeeded,
        complete: true,
        agreed,
        tied,
        accused: { id: accused.id, name: accused.name },
        wasSpy,
        scores,
        agreeCount,
        rejectCount
      };

      room.accusation = null;
      return result;
    }

    return {
      success: true,
      votes: room.accusation.votes,
      votesNeeded,
      complete: false
    };
  }

  guessLocation(code, playerId, location) {
    const room = this.rooms.get(code);
    if (!room || !room.roundActive) {
      return { success: false, error: 'No active round' };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.role !== 'spy') {
      return { success: false, error: 'Only spy can guess location' };
    }

    const correct = location === room.currentLocation?.name;

    if (correct) {
      player.score += 2;
      this.scores[playerId] = player.score;
    } else {
      room.players.forEach(p => {
        if (p.role !== 'spy') {
          p.score += 1;
          this.scores[p.id] = p.score;
        }
      });
    }

    const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
    room.roundActive = false;

    return {
      success: true,
      correct,
      location: room.currentLocation?.name,
      scores
    };
  }

  endRound(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can end round' };
    }

    room.roundActive = false;
    room.currentLocation = null;
    room.accusation = null;
    room.players.forEach(player => {
      player.role = null;
    });

    return { success: true };
  }

  resetScores(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can reset scores' };
    }

    room.players.forEach(player => {
      player.score = 0;
      this.scores[player.id] = 0;
    });

    return { success: true };
  }

  getLeaderboard(code) {
    const room = this.rooms.get(code);
    if (!room) {
      return [];
    }

    return room.players
      .map(p => ({ name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  getRoomState(code) {
    const room = this.rooms.get(code);
    if (!room) {
      return null;
    }

    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.isHost
      })),
      roundActive: room.roundActive,
      hasAccusation: !!room.accusation
    };
  }

  removePlayer(playerId) {
    const code = this.playerRoomMap.get(playerId);
    if (!code) {
      return {};
    }

    const room = this.rooms.get(code);
    if (!room) {
      return {};
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
    } else if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    return { code };
  }

  getAllLocations() {
    return LOCATIONS.map(loc => loc.name);
  }
}

