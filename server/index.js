import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { leaderboardManager } from './leaderboardManager.js';
import { Room } from './Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from the React app build folder
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map(); // roomId -> Room instance

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current leaderboard on connection
    socket.emit('leaderboard_update', leaderboardManager.get());

    socket.on('join_room', ({ roomId, playerName, mode }) => {
        let room = rooms.get(roomId);
        if (!room) {
            room = new Room(io, roomId);
            rooms.set(roomId, room);
        }
        room.join(socket, playerName, mode);
        socket.data.roomId = roomId;
    });

    socket.on('start_game', () => {
        const roomId = socket.data.roomId;
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId).startGame();
        }
    });

    socket.on('game_action', (action) => {
        const roomId = socket.data.roomId;
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId).handleAction(socket, action);
        }
    });

    socket.on('reset_room', () => {
        const roomId = socket.data.roomId;
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId).reset();
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.data.roomId;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.leave(socket);
            if (room.players.length === 0) {
                rooms.delete(roomId);
            }
        }
    });
});

// All other GET requests return the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
