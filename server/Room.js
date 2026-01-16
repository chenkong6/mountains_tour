import { createInitialState, gameReducer } from '../src/engine/GameLogic.js';
import { leaderboardManager } from './leaderboardManager.js';
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
        this.gameMode = 'REFRESH'; // Default mode
        this.leaderboardRecorded = false;
        console.log(`[Room ${roomId}] Created`);
    }

    join(socket, playerName, mode) {
        console.log(`[Room ${this.roomId}] Player joining: ${playerName} (${socket.id}). Mode: ${mode}`);

        if (this.inProgress) {
            socket.emit('error_message', '游戏已经开始了，请等待下一局');
            return;
        }

        // Set mode if provided (usually by host creating room)
        if (mode) {
            this.gameMode = mode;
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
        const player = this.players.find(p => p.socketId === socket.id);
        this.players = this.players.filter(p => p.socketId !== socket.id);

        if (this.inProgress && player && player.id !== null) {
            const gamePlayer = this.gameState.players.find(p => p.id === player.id);
            if (gamePlayer) {
                console.log(`[Room ${this.roomId}] Game Player ${gamePlayer.name} disconnected. Marking OUT.`);
                gamePlayer.status = 'OUT';
                this.gameState.log.push(`${gamePlayer.name} 掉线了。`);

                if (this.gameState.phase === GAME_PHASES.DECISION) {
                    this.pendingDecisions[player.id] = 'LEAVE';
                    this.checkDecisions();
                }
            }
            this.broadcastGameState();
        }

        this.broadcastLobbyState();
    }

    reset() {
        console.log(`[Room ${this.roomId}] Resetting`);
        this.inProgress = false;
        this.gameState = null;
        this.pendingDecisions = {};
        this.leaderboardRecorded = false; // Reset leaderboard status
        this.broadcastLobbyState();
    }

    startGame() {
        console.log(`[Room ${this.roomId}] Starting Game. Players: ${this.players.length}`);
        if (this.players.length === 0) return;

        this.players.forEach((p, index) => {
            p.id = index;
            console.log(`  - Player ${p.name} assigned Game ID ${p.id}`);
        });

        const playerNames = this.players.map(p => p.name);
        this.gameState = createInitialState(playerNames, this.gameMode);
        this.inProgress = true;
        this.pendingDecisions = {};
        this.leaderboardRecorded = false; // Ensure reset for new game

        this.updateGameState({ type: 'START_ROUND' });
        this.broadcastLobbyState();
        console.log(`[Room ${this.roomId}] Game successfully started.`);
    }

    /**
     * Helper to apply an action to the game state and handle side effects like leaderboard
     */
    updateGameState(action) {
        if (!this.gameState) return;
        const prevPhase = this.gameState.phase;
        this.gameState = gameReducer(this.gameState, action);

        console.log(`[Room ${this.roomId}] Phase changed: ${prevPhase} -> ${this.gameState.phase}`);

        // Check for Game End to record leaderboard
        if (this.gameState.phase === 'GAME_END' && !this.leaderboardRecorded) {
            console.log(`[Room ${this.roomId}] Game Ended. Recording Leaderboard...`);
            console.log(`[Room ${this.roomId}] Player results:`, this.gameState.players.map(p => ({ name: p.name, score: p.score })));
            const updatedLeaderboard = leaderboardManager.update(this.gameState.players);
            this.leaderboardRecorded = true;
            this.io.emit('leaderboard_update', updatedLeaderboard); // Broadcast to all connected clients
        }

        this.broadcastGameState();
    }

    handleAction(socket, action) {
        const player = this.players.find(p => p.socketId === socket.id);
        if (!player) return;

        console.log(`[Room ${this.roomId}] Action [${action.type}] from ${player.name}`);

        // 1. Lobby Phase Actions
        if (action.type === 'SET_GAME_MODE') {
            const isHost = this.players.length > 0 && this.players[0].socketId === socket.id;
            if (isHost) {
                this.gameMode = action.mode;
                console.log(`[Room ${this.roomId}] Game Mode updated to: ${this.gameMode}`);
                this.broadcastLobbyState();
            } else {
                console.warn(`[Room ${this.roomId}] Mode change REJECTED: ${player.name} is not host.`);
            }
            return;
        }

        // 2. Gameplay Phase Actions (Must be in progress)
        if (!this.inProgress || !this.gameState) {
            console.warn(`[Room ${this.roomId}] Action skipped: Game not in progress.`);
            return;
        }

        const playerId = player.id;

        if (action.type === 'DECISION') {
            if (this.gameState.phase !== GAME_PHASES.DECISION) return;
            const gamePlayer = this.gameState.players.find(p => p.id === playerId);
            if (!gamePlayer || gamePlayer.status === 'OUT') return;

            this.pendingDecisions[playerId] = action.decision;
            this.checkDecisions();

        } else if (action.type === 'PLAYER_READY') {
            if (this.gameState.phase === GAME_PHASES.ROUND_START) {
                this.readyPlayers.add(socket.id);
                const connectedSocketIds = this.players.map(p => p.socketId);
                const allReady = connectedSocketIds.every(id => this.readyPlayers.has(id));

                if (allReady) {
                    this.updateGameState({ type: 'START_ROUND' });
                    this.readyPlayers.clear();
                } else {
                    this.broadcastGameState();
                }
            }
        }
    }

    checkDecisions() {
        const activePlayers = this.gameState.players.filter(p => p.status === 'IN');
        const allDecided = activePlayers.every(p => this.pendingDecisions[p.id]);

        if (allDecided) {
            this.updateGameState({
                type: 'DECISIONS_MADE',
                decisions: this.pendingDecisions
            });
            this.pendingDecisions = {};
        } else {
            this.broadcastGameState();
        }
    }

    broadcastLobbyState() {
        this.io.to(this.roomId).emit('lobby_state', {
            roomId: this.roomId,
            players: this.players,
            inProgress: this.inProgress,
            gameMode: this.gameMode,
            hostSocketId: this.players.length > 0 ? this.players[0].socketId : null
        });
    }

    broadcastGameState() {
        const payload = {
            ...this.gameState,
            pendingDecisionsCount: Object.keys(this.pendingDecisions).length,
            readyPlayerIds: Array.from(this.readyPlayers).map(sid => {
                const p = this.players.find(pl => pl.socketId === sid);
                return p ? p.id : null;
            }).filter(id => id !== null)
        };
        this.io.to(this.roomId).emit('game_state', payload);
    }
}
