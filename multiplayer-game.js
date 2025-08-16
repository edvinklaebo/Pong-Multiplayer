class MultiplayerPongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = null;
        this.playerNumber = null;
        this.roomId = null;
        this.gameRunning = false;
        this.isHost = false;
        
        // Game objects (will be synced from server)
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            dx: 5,
            dy: 3,
            radius: 8,
            jiggleX: 0,
            jiggleY: 0,
            jiggleIntensity: 0,
            jiggleDecay: 0.95
        };
        
        this.paddle1 = {
            x: 20,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            shakeX: 0,
            shakeY: 0,
            shakeIntensity: 0,
            shakeDecay: 0.9
        };
        
        this.paddle2 = {
            x: this.canvas.width - 30,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            shakeX: 0,
            shakeY: 0,
            shakeIntensity: 0,
            shakeDecay: 0.9
        };
        
        this.score = {
            player1: 0,
            player2: 0
        };
        
        // Visual effects
        this.screenShake = {
            x: 0,
            y: 0,
            intensity: 0,
            decay: 0.85
        };
        
        this.keys = {};
        this.maxScore = 5;
        this.memeMode = false;
        
        // Matrix background
        this.matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        this.matrixColumns = [];
        this.initMatrixColumns();
        
        // Particle systems
        this.sparks = [];
        this.glitchEffect = {
            active: false,
            intensity: 0,
            duration: 0
        };
        
        // Audio system
        this.audioContext = null;
        this.soundEnabled = true;
        this.backgroundMusic = null;
        this.initAudio();
        
        this.setupEventListeners();
        this.setupMultiplayer();
        this.draw();
    }
    
    setupMultiplayer() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            this.showMessage('❌ Socket.IO not loaded. Please refresh the page.');
            console.error('Socket.IO library not loaded');
            return;
        }
        
        // Connect to server
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.showMessage('✅ Connected! Enter room ID or leave blank for new room.');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.showMessage('❌ Connection failed. Server may be starting up...');
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.showMessage('❌ Disconnected from server.');
            });
        } catch (error) {
            console.error('Failed to initialize Socket.IO:', error);
            this.showMessage('❌ Failed to connect. Please refresh the page.');
            return;
        }
        
        this.socket.on('playerAssigned', (data) => {
            this.playerNumber = data.playerNumber;
            this.roomId = data.roomId;
            this.showMessage(`You are Player ${this.playerNumber}. Room ID: ${this.roomId}`);
            
            if (this.playerNumber === 1) {
                this.isHost = true;
            }
        });
        
        this.socket.on('playerJoined', (data) => {
            this.showMessage(`Player ${data.playerNumber} joined! (${data.playersCount}/2)`);
        });
        
        this.socket.on('gameReady', (gameState) => {
            this.showMessage('Both players connected! Ready to start!');
            if (this.isHost) {
                document.getElementById('startBtn').style.display = 'block';
            }
        });
        
        this.socket.on('gameStarted', (gameState) => {
            this.gameRunning = true;
            this.updateGameState(gameState);
            this.showMessage('Game Started!');
            this.gameLoop();
        });
        
        this.socket.on('gameState', (gameState) => {
            this.updateGameState(gameState);
        });
        
        this.socket.on('paddleHit', (data) => {
            this.addJiggle(this.ball, 5);
            if (data.player === 1) {
                this.addShake(this.paddle1, 8);
            } else {
                this.addShake(this.paddle2, 8);
            }
            this.createSparkExplosion(data.x, data.y, 25);
            this.addGlitchEffect(8, 15);
            this.playPaddleHitSound();
        });
        
        this.socket.on('wallHit', (data) => {
            this.addJiggle(this.ball, 3);
            this.createSparkExplosion(data.x, data.y, 15);
            this.addGlitchEffect(5, 10);
            this.playWallHitSound();
        });
        
        this.socket.on('score', (data) => {
            this.score[`player${data.player}`] = data.score;
            this.updateScore();
            this.addScreenShake(15);
            this.createSparkExplosion(data.player === 1 ? this.canvas.width : 0, this.ball.y, 40);
            this.addGlitchEffect(15, 30);
            this.playScoreSound();
        });
        
        this.socket.on('gameOver', (data) => {
            this.gameRunning = false;
            this.showMessage(`Player ${data.winner} Wins! 🎉`);
        });
        
        this.socket.on('playerLeft', (data) => {
            this.gameRunning = false;
            this.showMessage(`Player ${data.playerNumber} left the game.`);
        });
        
        this.socket.on('roomFull', (data) => {
            this.showMessage(`Room ${data.roomId} is full! Try another room.`);
        });
    }
    
    updateGameState(gameState) {
        this.ball.x = gameState.ball.x;
        this.ball.y = gameState.ball.y;
        this.ball.dx = gameState.ball.dx;
        this.ball.dy = gameState.ball.dy;
        
        this.paddle1.y = gameState.paddle1.y;
        this.paddle2.y = gameState.paddle2.y;
        
        this.score.player1 = gameState.paddle1.score;
        this.score.player2 = gameState.paddle2.score;
        
        this.updateScore();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Button controls
        document.getElementById('startBtn').addEventListener('click', () => {
            if (this.isHost && this.socket) {
                this.socket.emit('startGame');
            }
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('memeBtn').addEventListener('click', () => {
            this.toggleMemeMode();
        });
        
        document.getElementById('soundBtn').addEventListener('click', () => {
            this.toggleSound();
        });
        
        document.getElementById('joinBtn').addEventListener('click', () => {
            const roomInput = document.getElementById('roomInput');
            const roomId = roomInput.value.trim().toUpperCase();
            
            if (!this.socket) {
                this.showMessage('❌ Not connected to server. Please refresh the page.');
                return;
            }
            
            if (!this.socket.connected) {
                this.showMessage('❌ Connection lost. Please refresh the page.');
                return;
            }
            
            this.showMessage('🔄 Joining room...');
            this.socket.emit('joinRoom', roomId);
        });
    }
    
    updatePaddles() {
        if (!this.socket || !this.playerNumber) return;
        
        let moved = false;
        let newY = this.playerNumber === 1 ? this.paddle1.y : this.paddle2.y;
        
        // Only control your own paddle
        if (this.playerNumber === 1) {
            if (this.keys['w'] && this.paddle1.y > 0) {
                newY = this.paddle1.y - 6;
                moved = true;
            }
            if (this.keys['s'] && this.paddle1.y < this.canvas.height - this.paddle1.height) {
                newY = this.paddle1.y + 6;
                moved = true;
            }
        } else if (this.playerNumber === 2) {
            if (this.keys['arrowup'] && this.paddle2.y > 0) {
                newY = this.paddle2.y - 6;
                moved = true;
            }
            if (this.keys['arrowdown'] && this.paddle2.y < this.canvas.height - this.paddle2.height) {
                newY = this.paddle2.y + 6;
                moved = true;
            }
        }
        
        if (moved) {
            this.socket.emit('paddleMove', { y: newY });
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.score.player1 = 0;
        this.score.player2 = 0;
        this.updateScore();
        this.showMessage('Game reset. Waiting for host to start...');
        this.draw();
    }
    
    // Copy all the visual effects methods from the original game
    addJiggle(object, intensity) {
        object.jiggleIntensity = intensity;
        object.jiggleX = (Math.random() - 0.5) * intensity;
        object.jiggleY = (Math.random() - 0.5) * intensity;
    }
    
    addShake(object, intensity) {
        object.shakeIntensity = intensity;
        object.shakeX = (Math.random() - 0.5) * intensity;
        object.shakeY = (Math.random() - 0.5) * intensity;
    }
    
    addScreenShake(intensity) {
        this.screenShake.intensity = intensity;
        this.screenShake.x = (Math.random() - 0.5) * intensity;
        this.screenShake.y = (Math.random() - 0.5) * intensity;
    }
    
    addGlitchEffect(intensity, duration) {
        this.glitchEffect.active = true;
        this.glitchEffect.intensity = intensity;
        this.glitchEffect.duration = duration;
    }
    
    createSparkExplosion(x, y, intensity = 20) {
        for (let i = 0; i < intensity; i++) {
            this.sparks.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.01,
                size: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 15}, 100%, ${Math.random() * 50 + 50}%)`
            });
        }
    }
    
    updateJigglePhysics() {
        // Update ball jiggle
        if (this.ball.jiggleIntensity > 0.1) {
            this.ball.jiggleX = (Math.random() - 0.5) * this.ball.jiggleIntensity;
            this.ball.jiggleY = (Math.random() - 0.5) * this.ball.jiggleIntensity;
            this.ball.jiggleIntensity *= this.ball.jiggleDecay;
        } else {
            this.ball.jiggleX = 0;
            this.ball.jiggleY = 0;
            this.ball.jiggleIntensity = 0;
        }
        
        // Update paddle shakes
        [this.paddle1, this.paddle2].forEach(paddle => {
            if (paddle.shakeIntensity > 0.1) {
                paddle.shakeX = (Math.random() - 0.5) * paddle.shakeIntensity;
                paddle.shakeY = (Math.random() - 0.5) * paddle.shakeIntensity;
                paddle.shakeIntensity *= paddle.shakeDecay;
            } else {
                paddle.shakeX = 0;
                paddle.shakeY = 0;
                paddle.shakeIntensity = 0;
            }
        });
        
        // Update screen shake
        if (this.screenShake.intensity > 0.1) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= this.screenShake.decay;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
            this.screenShake.intensity = 0;
        }
    }
    
    updateGlitchEffect() {
        if (this.glitchEffect.active) {
            this.glitchEffect.duration--;
            if (this.glitchEffect.duration <= 0) {
                this.glitchEffect.active = false;
                this.glitchEffect.intensity = 0;
            }
        }
    }
    
    updateSparks() {
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.vy += 0.2; // gravity
            spark.life -= spark.decay;
            
            if (spark.life <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }
    
    initMatrixColumns() {
        const columnWidth = 20;
        const numColumns = Math.floor(this.canvas.width / columnWidth);
        
        for (let i = 0; i < numColumns; i++) {
            this.matrixColumns.push({
                x: i * columnWidth,
                y: Math.random() * this.canvas.height,
                speed: Math.random() * 3 + 1,
                chars: []
            });
        }
    }
    
    updateMatrixBackground() {
        this.matrixColumns.forEach(column => {
            column.y += column.speed;
            
            if (column.y > this.canvas.height + 100) {
                column.y = -100;
                column.speed = Math.random() * 3 + 1;
            }
            
            if (Math.random() < 0.1) {
                column.chars = [];
                const numChars = Math.floor(Math.random() * 15) + 5;
                for (let i = 0; i < numChars; i++) {
                    column.chars.push({
                        char: this.matrixChars[Math.floor(Math.random() * this.matrixChars.length)],
                        opacity: Math.max(0, 1 - (i * 0.1))
                    });
                }
            }
        });
    }
    
    toggleMemeMode() {
        this.memeMode = !this.memeMode;
        const btn = document.getElementById('memeBtn');
        btn.textContent = this.memeMode ? '🧅 Meme Mode ON' : '🧅 Meme Mode';
        btn.style.background = this.memeMode ? 
            'linear-gradient(45deg, #4CAF50, #45a049)' : 
            'linear-gradient(45deg, #ff6b6b, #ee5a24)';
        this.draw();
    }
    
    updateScore() {
        document.getElementById('player1Score').textContent = this.score.player1;
        document.getElementById('player2Score').textContent = this.score.player2;
    }
    
    showMessage(message) {
        document.getElementById('gameMessage').textContent = message;
    }
    
    // Audio methods (simplified versions)
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.startBackgroundMusic();
        } catch (e) {
            console.log('Audio not supported');
            this.soundEnabled = false;
        }
    }
    
    startBackgroundMusic() {
        if (!this.soundEnabled || !this.audioContext) return;
        this.createMatrixBackgroundTrack();
    }
    
    createMatrixBackgroundTrack() {
        const masterGain = this.audioContext.createGain();
        masterGain.connect(this.audioContext.destination);
        masterGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        
        bassOsc.connect(bassGain);
        bassGain.connect(masterGain);
        
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(55, this.audioContext.currentTime);
        bassGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        
        bassOsc.start();
        this.backgroundMusic = { bassOsc, masterGain, bassGain };
    }
    
    playPaddleHitSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    }
    
    playWallHitSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }
    
    playScoreSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const frequencies = [523, 659, 784, 1047];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.3);
            }, index * 100);
        });
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('soundBtn');
        btn.textContent = this.soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        btn.style.background = this.soundEnabled ? 
            'linear-gradient(45deg, #4CAF50, #45a049)' : 
            'linear-gradient(45deg, #f44336, #d32f2f)';
            
        if (this.soundEnabled && !this.audioContext) {
            this.initAudio();
        } else if (!this.soundEnabled && this.backgroundMusic) {
            if (this.backgroundMusic.bassOsc) this.backgroundMusic.bassOsc.stop();
            this.backgroundMusic = null;
        }
    }
    
    // Drawing methods (copy from original game)
    draw() {
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);
        
        if (this.glitchEffect.active) {
            const glitchOffset = (Math.random() - 0.5) * this.glitchEffect.intensity;
            this.ctx.translate(glitchOffset, 0);
        }
        
        this.drawMatrixBackground();
        
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = this.glitchEffect.active ? '#00ff00' : '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        if (this.memeMode) {
            this.drawMemeMode();
        } else {
            this.drawNormalMode();
        }
        
        this.drawSparks();
        
        if (this.glitchEffect.active && Math.random() < 0.3) {
            this.drawGlitchLines();
        }
        
        this.ctx.restore();
    }
    
    drawMatrixBackground() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(-this.screenShake.x, -this.screenShake.y, this.canvas.width, this.canvas.height);
        
        this.ctx.font = '14px monospace';
        this.matrixColumns.forEach(column => {
            column.chars.forEach((charObj, index) => {
                const y = column.y - (index * 16);
                if (y > -20 && y < this.canvas.height + 20) {
                    this.ctx.fillStyle = `rgba(0, 255, 0, ${charObj.opacity * 0.3})`;
                    this.ctx.fillText(charObj.char, column.x, y);
                }
            });
        });
    }
    
    drawSparks() {
        this.sparks.forEach(spark => {
            this.ctx.save();
            this.ctx.globalAlpha = spark.life;
            this.ctx.fillStyle = spark.color;
            this.ctx.beginPath();
            this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowColor = spark.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawGlitchLines() {
        const numLines = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < numLines; i++) {
            const y = Math.random() * this.canvas.height;
            const height = Math.random() * 3 + 1;
            
            this.ctx.fillStyle = Math.random() < 0.5 ? '#ff0000' : '#00ffff';
            this.ctx.fillRect(0, y, this.canvas.width, height);
        }
    }
    
    drawNormalMode() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(
            this.paddle1.x + this.paddle1.shakeX, 
            this.paddle1.y + this.paddle1.shakeY, 
            this.paddle1.width, 
            this.paddle1.height
        );
        this.ctx.fillRect(
            this.paddle2.x + this.paddle2.shakeX, 
            this.paddle2.y + this.paddle2.shakeY, 
            this.paddle2.width, 
            this.paddle2.height
        );
        
        this.ctx.beginPath();
        this.ctx.arc(
            this.ball.x + this.ball.jiggleX, 
            this.ball.y + this.ball.jiggleY, 
            this.ball.radius, 
            0, 
            Math.PI * 2
        );
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
    }
    
    drawMemeMode() {
        // Simplified meme mode for multiplayer
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(
            this.paddle1.x + this.paddle1.shakeX, 
            this.paddle1.y + this.paddle1.shakeY, 
            this.paddle1.width * 3, 
            this.paddle1.height
        );
        
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(
            this.paddle2.x + this.paddle2.shakeX - 20, 
            this.paddle2.y + this.paddle2.shakeY, 
            this.paddle2.width * 3, 
            this.paddle2.height
        );
        
        this.ctx.fillStyle = '#DDD';
        this.ctx.beginPath();
        this.ctx.arc(
            this.ball.x + this.ball.jiggleX, 
            this.ball.y + this.ball.jiggleY, 
            this.ball.radius * 2, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.updatePaddles();
        this.updateJigglePhysics();
        this.updateMatrixBackground();
        this.updateSparks();
        this.updateGlitchEffect();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize multiplayer game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new MultiplayerPongGame();
    game.showMessage('Welcome to Multiplayer Matrix Pong!');
});
