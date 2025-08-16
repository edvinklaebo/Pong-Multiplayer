const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const gameRooms = new Map();

class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = [];
        this.gameState = {
            ball: {
                x: 400,
                y: 200,
                dx: 5,
                dy: 3,
                radius: 8
            },
            paddle1: {
                x: 20,
                y: 150,
                width: 10,
                height: 100,
                score: 0
            },
            paddle2: {
                x: 770,
                y: 150,
                width: 10,
                height: 100,
                score: 0
            },
            gameRunning: false,
            winner: null
        };
        this.lastUpdate = Date.now();
    }

    addPlayer(socket) {
        if (this.players.length < 2) {
            const playerNumber = this.players.length + 1;
            const player = {
                id: socket.id,
                playerNumber: playerNumber,
                socket: socket
            };
            this.players.push(player);
            
            socket.emit('playerAssigned', {
                playerNumber: playerNumber,
                roomId: this.roomId
            });
            
            // Notify all players in room
            this.broadcast('playerJoined', {
                playerNumber: playerNumber,
                playersCount: this.players.length
            });
            
            if (this.players.length === 2) {
                this.broadcast('gameReady', this.gameState);
            }
            
            return player;
        }
        return null;
    }

    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
            const player = this.players[playerIndex];
            this.players.splice(playerIndex, 1);
            
            this.broadcast('playerLeft', {
                playerNumber: player.playerNumber,
                playersCount: this.players.length
            });
            
            // Stop game if player leaves
            this.gameState.gameRunning = false;
            this.broadcast('gameState', this.gameState);
        }
    }

    updatePaddle(playerNumber, y) {
        if (playerNumber === 1) {
            this.gameState.paddle1.y = Math.max(0, Math.min(300, y));
        } else if (playerNumber === 2) {
            this.gameState.paddle2.y = Math.max(0, Math.min(300, y));
        }
    }

    startGame() {
        if (this.players.length === 2 && !this.gameState.gameRunning) {
            this.gameState.gameRunning = true;
            this.gameState.ball.x = 400;
            this.gameState.ball.y = 200;
            this.gameState.ball.dx = Math.random() > 0.5 ? 5 : -5;
            this.gameState.ball.dy = (Math.random() - 0.5) * 6;
            this.broadcast('gameStarted', this.gameState);
            this.gameLoop();
        }
    }

    gameLoop() {
        if (!this.gameState.gameRunning) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 16.67; // Normalize to 60fps
        this.lastUpdate = now;

        // Update ball position
        this.gameState.ball.x += this.gameState.ball.dx * deltaTime;
        this.gameState.ball.y += this.gameState.ball.dy * deltaTime;

        // Ball collision with top and bottom walls
        if (this.gameState.ball.y <= this.gameState.ball.radius || 
            this.gameState.ball.y >= 400 - this.gameState.ball.radius) {
            this.gameState.ball.dy = -this.gameState.ball.dy;
            this.broadcast('wallHit', { x: this.gameState.ball.x, y: this.gameState.ball.y });
        }

        // Ball collision with paddles
        const ball = this.gameState.ball;
        const paddle1 = this.gameState.paddle1;
        const paddle2 = this.gameState.paddle2;

        // Paddle 1 collision
        if (ball.x - ball.radius <= paddle1.x + paddle1.width &&
            ball.x + ball.radius >= paddle1.x &&
            ball.y - ball.radius <= paddle1.y + paddle1.height &&
            ball.y + ball.radius >= paddle1.y &&
            ball.dx < 0) {
            ball.dx = -ball.dx;
            ball.dy += (Math.random() - 0.5) * 2;
            this.broadcast('paddleHit', { player: 1, x: ball.x, y: ball.y });
        }

        // Paddle 2 collision
        if (ball.x + ball.radius >= paddle2.x &&
            ball.x - ball.radius <= paddle2.x + paddle2.width &&
            ball.y - ball.radius <= paddle2.y + paddle2.height &&
            ball.y + ball.radius >= paddle2.y &&
            ball.dx > 0) {
            ball.dx = -ball.dx;
            ball.dy += (Math.random() - 0.5) * 2;
            this.broadcast('paddleHit', { player: 2, x: ball.x, y: ball.y });
        }

        // Scoring
        if (ball.x < 0) {
            this.gameState.paddle2.score++;
            this.broadcast('score', { player: 2, score: this.gameState.paddle2.score });
            this.resetBall();
        } else if (ball.x > 800) {
            this.gameState.paddle1.score++;
            this.broadcast('score', { player: 1, score: this.gameState.paddle1.score });
            this.resetBall();
        }

        // Check for winner
        if (this.gameState.paddle1.score >= 5) {
            this.gameState.winner = 1;
            this.gameState.gameRunning = false;
            this.broadcast('gameOver', { winner: 1 });
            return;
        } else if (this.gameState.paddle2.score >= 5) {
            this.gameState.winner = 2;
            this.gameState.gameRunning = false;
            this.broadcast('gameOver', { winner: 2 });
            return;
        }

        // Send game state to all players
        this.broadcast('gameState', this.gameState);

        // Continue game loop
        setTimeout(() => this.gameLoop(), 16); // ~60fps
    }

    resetBall() {
        this.gameState.ball.x = 400;
        this.gameState.ball.y = 200;
        this.gameState.ball.dx = Math.random() > 0.5 ? 5 : -5;
        this.gameState.ball.dy = (Math.random() - 0.5) * 6;
    }

    broadcast(event, data) {
        this.players.forEach(player => {
            player.socket.emit(event, data);
        });
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('joinRoom', (roomId) => {
        if (!roomId) {
            roomId = generateRoomId();
        }

        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, new GameRoom(roomId));
        }

        const room = gameRooms.get(roomId);
        const player = room.addPlayer(socket);

        if (player) {
            socket.join(roomId);
            socket.roomId = roomId;
            console.log(`Player ${socket.id} joined room ${roomId} as Player ${player.playerNumber}`);
        } else {
            socket.emit('roomFull', { roomId });
        }
    });

    socket.on('paddleMove', (data) => {
        if (socket.roomId) {
            const room = gameRooms.get(socket.roomId);
            if (room) {
                const player = room.players.find(p => p.id === socket.id);
                if (player) {
                    room.updatePaddle(player.playerNumber, data.y);
                }
            }
        }
    });

    socket.on('startGame', () => {
        if (socket.roomId) {
            const room = gameRooms.get(socket.roomId);
            if (room) {
                room.startGame();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (socket.roomId) {
            const room = gameRooms.get(socket.roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                // Clean up empty rooms
                if (room.players.length === 0) {
                    gameRooms.delete(socket.roomId);
                }
            }
        }
    });
});

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Multiplayer Pong server running on port ${PORT}`);
});
