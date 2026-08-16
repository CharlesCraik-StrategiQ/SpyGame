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
      accusation: null,
      settings: { timerEnabled: false, timerMinutes: 5 },
      roundEndTime: null,
      finalVote: null,
      timerHandle: null
    };
    this.rooms.set(code, room);
    return room;
  }

  updateSettings(code, playerId, { timerEnabled, timerMinutes }) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { success: false, error: 'Only host can update settings' };
    }

    if (room.roundActive) {
      return { success: false, error: 'Cannot change settings during a round' };
    }

    const enabled = Boolean(timerEnabled);
    let minutes = Number(timerMinutes);
    if (!Number.isFinite(minutes)) {
      minutes = room.settings.timerMinutes;
    }
    minutes = Math.max(1, Math.min(60, Math.round(minutes)));

    room.settings = {
      timerEnabled: enabled,
      timerMinutes: minutes
    };

    return { success: true, settings: room.settings };
  }

  clearTimer(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }
  }

  scheduleTimer(code, ms, onExpire) {
    const room = this.rooms.get(code);
    if (!room) return;
    this.clearTimer(code);
    room.timerHandle = setTimeout(() => {
      room.timerHandle = null;
      onExpire();
    }, ms);
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

    this.clearTimer(code);

    room.roundActive = true;
    
    // Pick a new location that's different from the previous one
    const previousLocationName = room.currentLocation?.name;
    let newLocation;
    do {
      newLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    } while (newLocation?.name === previousLocationName && LOCATIONS.length > 1);
    
    room.currentLocation = newLocation;
    room.accusation = null;
    room.finalVote = null;

    const spyIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach((player, index) => {
      player.role = index === spyIndex ? 'spy' : 'location';
    });

    if (room.settings?.timerEnabled) {
      const ms = room.settings.timerMinutes * 60 * 1000;
      room.roundEndTime = Date.now() + ms;
      return { success: true, timerEnabled: true, timerMs: ms, roundEndTime: room.roundEndTime };
    }

    room.roundEndTime = null;
    return { success: true, timerEnabled: false };
  }

  startFinalVote(code) {
    const room = this.rooms.get(code);
    if (!room || !room.roundActive) {
      return { success: false, error: 'No active round' };
    }

    if (room.accusation) {
      return { success: false, error: 'Accusation already in progress' };
    }

    if (room.finalVote) {
      return { success: false, error: 'Final vote already in progress' };
    }

    room.finalVote = {
      nominations: {},
      eligibleIds: room.players.map(p => p.id)
    };
    room.roundEndTime = null;

    return {
      success: true,
      players: room.players.map(p => ({ id: p.id, name: p.name })),
      votesNeeded: room.players.length
    };
  }

  submitNomination(code, playerId, nominatedId) {
    const room = this.rooms.get(code);
    if (!room || !room.finalVote) {
      return { success: false, error: 'No final vote in progress' };
    }

    if (!room.roundActive) {
      return { success: false, error: 'No active round' };
    }

    if (room.accusation) {
      return { success: false, error: 'Accusation already in progress' };
    }

    if (!room.finalVote.eligibleIds.includes(playerId)) {
      return { success: false, error: 'Player not eligible' };
    }

    if (playerId === nominatedId) {
      return { success: false, error: 'Cannot nominate yourself' };
    }

    const nominated = room.players.find(p => p.id === nominatedId);
    if (!nominated) {
      return { success: false, error: 'Nominated player not found' };
    }

    if (room.finalVote.nominations[playerId]) {
      return { success: false, error: 'Already nominated' };
    }

    room.finalVote.nominations[playerId] = nominatedId;

    const submitted = Object.keys(room.finalVote.nominations).length;
    const votesNeeded = room.finalVote.eligibleIds.length;

    if (submitted < votesNeeded) {
      return {
        success: true,
        complete: false,
        submitted,
        votesNeeded
      };
    }

    // Tally nominations and pick the top nominee (random tie-break)
    const counts = {};
    Object.values(room.finalVote.nominations).forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });

    let maxCount = 0;
    let topIds = [];
    for (const [id, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        topIds = [id];
      } else if (count === maxCount) {
        topIds.push(id);
      }
    }

    const accusedId = topIds[Math.floor(Math.random() * topIds.length)];
    const accused = room.players.find(p => p.id === accusedId);
    const wasSpy = accused.role === 'spy';

    room.finalVote = null;

    if (wasSpy) {
      room.players.forEach(player => {
        if (player.role !== 'spy') {
          player.score += 1;
          this.scores[player.id] = player.score;
        }
      });
    } else {
      const spy = room.players.find(p => p.role === 'spy');
      if (spy) {
        spy.score += 1;
        this.scores[spy.id] = spy.score;
      }
    }

    this.clearTimer(code);
    room.roundActive = false;
    room.roundEndTime = null;

    const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));

    return {
      success: true,
      complete: true,
      forced: true,
      agreed: true,
      tied: false,
      submitted,
      votesNeeded,
      accused: { id: accused.id, name: accused.name },
      wasSpy,
      scores
    };
  }

  accusePlayer(code, accuserId, accusedId) {
    const room = this.rooms.get(code);
    if (!room || !room.roundActive) {
      return { success: false, error: 'No active round' };
    }

    if (room.accusation) {
      return { success: false, error: 'Accusation already in progress' };
    }

    if (room.finalVote) {
      return { success: false, error: 'Final vote already in progress' };
    }

    const accuser = room.players.find(p => p.id === accuserId);
    const accused = room.players.find(p => p.id === accusedId);

    if (!accuser || !accused) {
      return { success: false, error: 'Player not found' };
    }

    // Do not clear the round timer — if it expires during an accusation,
    // the server will cancel the accusation and force a final nomination vote.

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

      this.clearTimer(code);
      room.roundEndTime = null;
      room.finalVote = null;

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
    this.clearTimer(code);
    room.roundActive = false;
    room.roundEndTime = null;
    room.finalVote = null;

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

    this.clearTimer(code);
    room.roundActive = false;
    room.currentLocation = null;
    room.accusation = null;
    room.finalVote = null;
    room.roundEndTime = null;
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
      hasAccusation: !!room.accusation,
      hasFinalVote: !!room.finalVote,
      settings: room.settings || { timerEnabled: false, timerMinutes: 5 },
      roundEndTime: room.roundEndTime
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
      this.clearTimer(code);
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

