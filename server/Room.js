import { createInitialState, gameReducer } from '../src/engine/GameLogic.js';
import { GAME_PHASES } from '../src/engine/types.js';

export class Room {
    constructor(io, roomId) {
        this.io = io;
        this.roomId = roomId;
        this.players = []; // { socketId, name, id (gameId) }
        this.gameState = null; // Will start as Lobby until game starts
        this.pendingDecisions = {}; // { playerId: 'STAY' | 'LEAVE' }
        this.readyPlayers = new Set(); // Set of socketIds
        this.inProgress = false;
        console.log(`[Room ${roomId}] Created`);
    }

    join(socket, playerName) {
        console.log(`[Room ${this.roomId}] Player joining: ${playerName} (${socket.id})`);
        // If game in progress, maybe can't join? Or join as spectator?
        // For now, simpler: Can only join if not started.
        if (this.inProgress) {
            socket.emit('error_message', '游戏已经开始了，请等待下一局');
            return;
        }

        const existingPlayer = this.players.find(p => p.socketId === socket.id);
        if (existingPlayer) {
            existingPlayer.name = playerName;
        } else {
            this.players.push({
                socketId: socket.id,
                name: playerName,
                id: null // To be assigned at start
            });
        }

        socket.join(this.roomId);
        this.broadcastLobbyState();
    }

    leave(socket) {
        console.log(`[Room ${this.roomId}] Player leaving: (${socket.id})`);
        // If game is in progress, we must handle multiple scenarios:
        // 1. Player is just a spectator?
        // 2. Player is an active player (IN or OUT).

        // Find player before removing
        const player = this.players.find(p => p.socketId === socket.id);

        // Remove from list
        this.players = this.players.filter(p => p.socketId !== socket.id);

        if (this.inProgress && player && player.id !== null) {
            // Mark as OUT in game state if they were in the game
            const gamePlayer = this.gameState.players.find(p => p.id === player.id);
            if (gamePlayer) {
                console.log(`[Room ${this.roomId}] Game Player ${gamePlayer.name} disconnected. Marking OUT.`);
                gamePlayer.status = 'OUT';
                this.gameState.log.push(`${gamePlayer.name} 掉线了。`);

                // If we were waiting for their decision, treat it as LEAVE or just remove the requirement?
                // Treating as LEAVE (Camp) is safest for remaining gems.
                if (this.gameState.phase === GAME_PHASES.DECISION) {
                    this.pendingDecisions[player.id] = 'LEAVE';
                    this.checkDecisions();
                }
            }
            this.broadcastGameState();
        }

        // Always broadcast lobby state (update count etc)
        this.broadcastLobbyState();
    }

    reset() {
        console.log(`[Room ${this.roomId}] Resetting`);
        this.inProgress = false;
        this.gameState = null;
        this.pendingDecisions = {};
        this.broadcastLobbyState();
    }

    startGame() {
        console.log(`[Room ${this.roomId}] Starting Game. Players: ${this.players.length}`);
        if (this.players.length === 0) return;

        // RE-SYNC IDs: Ensure 0, 1, 2... matches the array order here.
        this.players.forEach((p, index) => {
            p.id = index;
            console.log(`  - Player ${p.name} assigned Game ID ${p.id}`);
        });

        const playerNames = this.players.map(p => p.name);
        this.gameState = createInitialState(playerNames);
        this.inProgress = true;
        this.pendingDecisions = {};

        // Auto Start Round 1
        this.gameState = gameReducer(this.gameState, { type: 'START_ROUND' });

        this.broadcastGameState();
        this.broadcastLobbyState(); // To update inProgress flag
        console.log(`[Room ${this.roomId}] Game successfully started and broadcasted.`);
    }

    handleAction(socket, action) {
        if (!this.inProgress || !this.gameState) return;

        const player = this.players.find(p => p.socketId === socket.id);
        if (!player) return; // Spectator or bug

        const playerId = player.id;
        console.log(`[Room ${this.roomId}] Action from Player ID ${playerId} (${player.name}):`, action);

        if (action.type === 'PLAYER_READY') {
            // Bypass strict "IN" check for readiness, because players might be 'OUT' (camp) but need to signal readiness for next round.
            // Also, 'OUT' players are still part of the room.
        } else {
            // For game actions like DECISION, they must be valid game players.
            const gamePlayer = this.gameState.players.find(p => p.id === playerId);
            if (!gamePlayer || (action.type === 'DECISION' && gamePlayer.status === 'OUT')) {
                console.warn(`[Room ${this.roomId}] Player ${player.name} (ID ${playerId}) action ${action.type} rejected. Status: ${gamePlayer ? gamePlayer.status : 'Unknown'}`);
                return;
            }
        }

        if (action.type === 'DECISION') {
            if (this.gameState.phase !== GAME_PHASES.DECISION) {
                console.warn(`[Room ${this.roomId}] Ignored DECISION in phase ${this.gameState.phase}`);
                return;
            }

            this.pendingDecisions[playerId] = action.decision; // 'STAY' | 'LEAVE'
            console.log(`[Room ${this.roomId}] Pending Decisions:`, this.pendingDecisions);

            this.checkDecisions();
            this.broadcastGameState();

        } else if (action.type === 'PLAYER_READY') {
            if (this.gameState.phase === GAME_PHASES.ROUND_START) {
                console.log(`[Room ${this.roomId}] Player ${player.name} (${socket.id}) is READY.`);
                this.readyPlayers.add(socket.id);

                const connectedSocketIds = this.players.map(p => p.socketId);
                const allReady = connectedSocketIds.every(id => this.readyPlayers.has(id));

                console.log(`[Room ${this.roomId}] Ready Check: ${this.readyPlayers.size}/${connectedSocketIds.length} players ready.`);
                console.log(`  - Ready Sockets: ${Array.from(this.readyPlayers).join(', ')}`);
                console.log(`  - Required Sockets: ${connectedSocketIds.join(', ')}`);

                if (allReady) {
                    console.log(`[Room ${this.roomId}] All players ready. Starting Next Round.`);
                    this.gameState = gameReducer(this.gameState, { type: 'START_ROUND' });
                    this.readyPlayers.clear();
                }

                this.broadcastGameState();
            } else {
                console.warn(`[Room ${this.roomId}] Ignored PLAYER_READY in phase ${this.gameState.phase}`);
            }
        }
    }

    checkDecisions() {
        const activePlayers = this.gameState.players.filter(p => p.status === 'IN');
        const activeIds = activePlayers.map(p => p.id);
        const decidedIds = Object.keys(this.pendingDecisions).map(k => parseInt(k));

        const allDecided = activePlayers.every(p => this.pendingDecisions[p.id]);

        console.log(`[Room ${this.roomId}] Check Decisions: Active Players: ${activeIds}, Decided: ${decidedIds}, All Decided? ${allDecided}`);

        if (allDecided) {
            console.log(`[Room ${this.roomId}] All decisions made! Processing...`);
            this.gameState = gameReducer(this.gameState, {
                type: 'DECISIONS_MADE',
                decisions: this.pendingDecisions
            });
            this.pendingDecisions = {};
            console.log(`[Room ${this.roomId}] New Game State Phase: ${this.gameState.phase}, Path Length: ${this.gameState.path.length}`);
        }
    }

    broadcastLobbyState() {
        this.io.to(this.roomId).emit('lobby_state', {
            roomId: this.roomId,
            players: this.players,
            inProgress: this.inProgress
        });
    }

    broadcastGameState() {
        // We might want to mask "deck" for cheaters, but trusted client for now.
        const payload = {
            ...this.gameState,
            // Add derived info if needed
            pendingDecisionsCount: Object.keys(this.pendingDecisions).length,
            readyPlayerIds: Array.from(this.readyPlayers).map(sid => {
                const p = this.players.find(pl => pl.socketId === sid);
                return p ? p.id : null;
            }).filter(id => id !== null)
        };
        // console.log(`[Room ${this.roomId}] Broadcasting State. Phase: ${payload.phase}`);
        this.io.to(this.roomId).emit('game_state', payload);
    }
}
