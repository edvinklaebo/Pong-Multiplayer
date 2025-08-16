# 🎮 Multiplayer Matrix Pong

A real-time multiplayer Pong game with Matrix-themed visual effects, jiggle physics, meme mode, and immersive sound effects.

## ✨ Features

- **Real-time Multiplayer**: Play against friends worldwide using WebSockets
- **Matrix Theme**: Falling code rain, glitch effects, and neon green styling
- **Visual Effects**: Jiggle physics, screen shake, spark explosions, and glitch lines
- **Meme Mode**: Play with Shrek, Donkey, and onion sprites
- **Sound System**: Procedurally generated Matrix-style sound effects and ambient music
- **Room System**: Create or join game rooms with custom IDs

## 🚀 Quick Start

### Option 1: Deploy to Railway (Required for Multiplayer)

**Important**: This game requires a Node.js server for multiplayer functionality. Netlify doesn't support WebSocket servers.

1. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "Deploy from GitHub repo"
   - Connect this repository
   - Railway will automatically detect Node.js and deploy
   - Your app will be live at: `https://your-app-name.up.railway.app`

2. **Alternative - Render**:
   - Go to [render.com](https://render.com)
   - Create a new Web Service
   - Connect this repository
   - Build command: `npm install`
   - Start command: `npm start`

### Option 2: Local Development

If you want to run locally, you'll need Node.js installed:

1. **Install Node.js**:
   - Download from [nodejs.org](https://nodejs.org)
   - Choose the LTS version
   - Install with default settings

2. **Run the game**:
   ```bash
   npm install
   npm start
   ```

3. **Play**:
   - Open `http://localhost:3000` in multiple browser tabs/windows
   - Enter the same room ID to play together

## 🎯 How to Play

1. **Join a Room**: Enter a room ID (or leave blank for random room)
2. **Wait for Player 2**: Share your room ID with a friend
3. **Controls**:
   - Player 1: W/S keys
   - Player 2: ↑/↓ arrow keys
4. **Start Game**: Player 1 (host) clicks "Start Game"
5. **Score**: First to 5 points wins!

## 🎨 Game Modes

- **Normal Mode**: Classic white paddles and ball
- **Meme Mode**: Shrek vs Donkey with onion ball
- **Sound Toggle**: Enable/disable Matrix-style audio

## 🛠 Technical Stack

- **Frontend**: HTML5 Canvas, JavaScript, CSS3
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: WebSocket communication
- **Audio**: Web Audio API with procedural synthesis
- **Hosting**: Railway/Render compatible

## 📁 Project Structure

```
pong-game/
├── server.js              # Node.js server with Socket.IO
├── multiplayer-game.js    # Client-side multiplayer game logic
├── index.html            # Game interface
├── style.css             # Matrix-themed styling
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🌐 Deployment

The game is configured for easy deployment to free hosting services:

- **Port**: Uses `process.env.PORT` or defaults to 3000
- **Static Files**: Serves client files from root directory
- **WebSockets**: Socket.IO handles real-time communication
- **No Database**: Game state is managed in memory

## 🎵 Sound Effects

All sounds are procedurally generated using Web Audio API:
- Paddle hits: Glitchy digital distortion
- Wall bounces: Triangular wave sweeps
- Scoring: Ascending chord progressions
- Background: Matrix-style ambient track with bass and percussion

## 🎮 Game Features

- **Jiggle Physics**: Ball and paddles shake on impact
- **Screen Shake**: Visual feedback on scoring
- **Particle Effects**: Spark explosions on collisions
- **Glitch Effects**: Random visual distortions
- **Matrix Rain**: Animated background with falling characters
- **Room System**: Private game rooms with custom IDs
- **Connection Handling**: Graceful player disconnect management

## 🚀 Ready to Play!

Deploy to Railway or Render and share the URL with friends to start playing multiplayer Matrix Pong!
