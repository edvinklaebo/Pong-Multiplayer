class PongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameRunning = false;
        
        // Game objects
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            dx: 5,
            dy: 3,
            radius: 8,
            speed: 5,
            // Jiggle physics
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
            dy: 0,
            speed: 6,
            // Shake effects
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
            dy: 0,
            speed: 6,
            // Shake effects
            shakeX: 0,
            shakeY: 0,
            shakeIntensity: 0,
            shakeDecay: 0.9
        };
        
        this.score = {
            player1: 0,
            player2: 0
        };
        
        // Screen shake
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
        this.draw();
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
            this.startGame();
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
    }
    
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
        
        // Create "Clubbed to Death" inspired Matrix background
        this.createMatrixBackgroundTrack();
    }
    
    createMatrixBackgroundTrack() {
        const masterGain = this.audioContext.createGain();
        masterGain.connect(this.audioContext.destination);
        masterGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        
        // Deep bass line (like Clubbed to Death)
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        const bassFilter = this.audioContext.createBiquadFilter();
        
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(masterGain);
        
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(55, this.audioContext.currentTime); // A1
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(150, this.audioContext.currentTime);
        bassGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        
        // Atmospheric pad
        const padOsc = this.audioContext.createOscillator();
        const padGain = this.audioContext.createGain();
        const padFilter = this.audioContext.createBiquadFilter();
        
        padOsc.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(masterGain);
        
        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        padGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        
        // Digital noise layer
        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        noiseGain.gain.setValueAtTime(0.03, this.audioContext.currentTime);
        
        bassOsc.start();
        padOsc.start();
        noiseSource.start();
        
        this.backgroundMusic = { 
            bassOsc, padOsc, noiseSource, 
            masterGain, bassGain, padGain, noiseGain,
            bassFilter, padFilter
        };
        
        // Start the ambient beat system
        this.startAmbientBeat();
    }
    
    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        return buffer;
    }
    
    startAmbientBeat() {
        if (!this.backgroundMusic) return;
        
        const bpm = 120;
        const beatInterval = (60 / bpm) * 1000; // Convert BPM to milliseconds
        const measureInterval = beatInterval * 4; // 4 beats per measure
        
        let beatCount = 0;
        
        // Main beat loop
        const beatLoop = setInterval(() => {
            if (!this.soundEnabled || !this.backgroundMusic) {
                clearInterval(beatLoop);
                return;
            }
            
            const currentBeat = beatCount % 4;
            
            // Kick drum pattern (beats 1 and 3)
            if (currentBeat === 0 || currentBeat === 2) {
                this.playKickDrum();
                
                // Bass pulse on kick
                this.backgroundMusic.bassGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
                this.backgroundMusic.bassGain.gain.exponentialRampToValueAtTime(0.4, this.audioContext.currentTime + 0.1);
                this.backgroundMusic.bassGain.gain.exponentialRampToValueAtTime(0.6, this.audioContext.currentTime + 0.3);
            }
            
            // Hi-hat pattern (off-beats)
            if (currentBeat === 1 || currentBeat === 3) {
                this.playHiHat();
            }
            
            // Snare on beat 2 and 4
            if (currentBeat === 1 || currentBeat === 3) {
                setTimeout(() => this.playSnare(), beatInterval / 4);
            }
            
            // Ambient pad modulation every measure
            if (currentBeat === 0) {
                this.modulatePad();
            }
            
            beatCount++;
        }, beatInterval);
        
        // Bass line pattern
        this.startBassPattern();
    }
    
    playKickDrum() {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.backgroundMusic.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.1);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);
    }
    
    playHiHat() {
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        
        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.backgroundMusic.masterGain);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        source.start();
    }
    
    playSnare() {
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        
        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.backgroundMusic.masterGain);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.Q.setValueAtTime(5, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        source.start();
    }
    
    modulatePad() {
        // Slowly modulate the pad filter for atmosphere
        this.backgroundMusic.padFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        this.backgroundMusic.padFilter.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 2);
        this.backgroundMusic.padFilter.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 4);
        this.backgroundMusic.padFilter.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 6);
    }
    
    startBassPattern() {
        const bassNotes = [55, 55, 73, 55]; // A1, A1, D2, A1
        let noteIndex = 0;
        
        const bassInterval = setInterval(() => {
            if (!this.soundEnabled || !this.backgroundMusic) {
                clearInterval(bassInterval);
                return;
            }
            
            const freq = bassNotes[noteIndex % bassNotes.length];
            this.backgroundMusic.bassOsc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            this.backgroundMusic.bassOsc.frequency.exponentialRampToValueAtTime(freq, this.audioContext.currentTime + 0.1);
            
            noteIndex++;
        }, (60 / 120) * 1000 * 2); // Half notes at 120 BPM
    }
    
    playPaddleHitSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Create glitchy digital paddle hit
        this.createGlitchyHit(1200, 0.15);
        
        // Add digital static burst
        this.playDigitalStatic(0.05, 0.2);
    }
    
    createGlitchyHit(baseFreq, duration) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const distortion = this.audioContext.createWaveShaper();
        
        // Create distortion curve
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + 50) * x * 20 * deg) / (Math.PI + 50 * Math.abs(x));
        }
        distortion.curve = curve;
        distortion.oversample = '4x';
        
        oscillator1.connect(distortion);
        oscillator2.connect(distortion);
        distortion.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'square';
        oscillator2.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime);
        
        // Glitchy frequency modulation
        oscillator1.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, this.audioContext.currentTime + duration * 0.3);
        oscillator1.frequency.setValueAtTime(baseFreq * 2, this.audioContext.currentTime + duration * 0.5);
        oscillator1.frequency.exponentialRampToValueAtTime(baseFreq * 0.1, this.audioContext.currentTime + duration);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + duration);
        filter.Q.setValueAtTime(10, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(this.audioContext.currentTime + duration);
        oscillator2.stop(this.audioContext.currentTime + duration);
    }
    
    playDigitalStatic(duration, volume) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
        const leftData = buffer.getChannelData(0);
        const rightData = buffer.getChannelData(1);
        
        for (let i = 0; i < bufferSize; i++) {
            leftData[i] = (Math.random() * 2 - 1) * volume;
            rightData[i] = (Math.random() * 2 - 1) * volume;
        }
        
        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        source.start();
    }
    
    playWallHitSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Create digital wall impact with glitch
        this.createDigitalImpact(800, 0.08);
        this.playDigitalStatic(0.03, 0.15);
    }
    
    createDigitalImpact(freq, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const delay = this.audioContext.createDelay();
        const delayGain = this.audioContext.createGain();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Add digital delay effect
        gainNode.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freq * 0.2, this.audioContext.currentTime + duration);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + duration);
        
        delay.delayTime.setValueAtTime(0.02, this.audioContext.currentTime);
        delayGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playScoreSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Epic Matrix-style digital explosion score sound
        this.createMatrixScoreExplosion();
        
        // Add massive digital glitch burst
        setTimeout(() => this.playDigitalStatic(0.2, 0.4), 100);
        setTimeout(() => this.playDigitalStatic(0.15, 0.3), 300);
    }
    
    createMatrixScoreExplosion() {
        // Create multiple layered digital sounds
        const frequencies = [110, 220, 440, 880]; // A notes across octaves
        
        frequencies.forEach((baseFreq, index) => {
            setTimeout(() => {
                // Main digital tone
                const osc1 = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const osc3 = this.audioContext.createOscillator();
                
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                const distortion = this.audioContext.createWaveShaper();
                const delay = this.audioContext.createDelay();
                const delayGain = this.audioContext.createGain();
                
                // Create harsh digital distortion
                const samples = 44100;
                const curve = new Float32Array(samples);
                for (let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.3);
                }
                distortion.curve = curve;
                distortion.oversample = '4x';
                
                // Connect the chain
                osc1.connect(distortion);
                osc2.connect(distortion);
                osc3.connect(distortion);
                distortion.connect(filter);
                filter.connect(gain);
                gain.connect(this.audioContext.destination);
                
                // Add delay for digital echo
                gain.connect(delay);
                delay.connect(delayGain);
                delayGain.connect(this.audioContext.destination);
                
                // Set oscillator types and frequencies
                osc1.type = 'square';
                osc2.type = 'sawtooth';
                osc3.type = 'triangle';
                
                osc1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
                osc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime);
                osc3.frequency.setValueAtTime(baseFreq * 0.75, this.audioContext.currentTime);
                
                // Dramatic frequency sweeps
                osc1.frequency.exponentialRampToValueAtTime(baseFreq * 3, this.audioContext.currentTime + 0.1);
                osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.25, this.audioContext.currentTime + 0.5);
                
                osc2.frequency.exponentialRampToValueAtTime(baseFreq * 4, this.audioContext.currentTime + 0.15);
                osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, this.audioContext.currentTime + 0.6);
                
                // Filter sweep for digital effect
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
                filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.6);
                filter.Q.setValueAtTime(15, this.audioContext.currentTime);
                
                // Delay settings
                delay.delayTime.setValueAtTime(0.05, this.audioContext.currentTime);
                delayGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
                delayGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                
                // Volume envelope
                gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                
                osc1.start();
                osc2.start();
                osc3.start();
                osc1.stop(this.audioContext.currentTime + 0.8);
                osc2.stop(this.audioContext.currentTime + 0.8);
                osc3.stop(this.audioContext.currentTime + 0.8);
                
            }, index * 150);
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
            if (this.backgroundMusic.padOsc) this.backgroundMusic.padOsc.stop();
            if (this.backgroundMusic.noiseSource) this.backgroundMusic.noiseSource.stop();
            this.backgroundMusic = null;
        }
    }
    
    startGame() {
        if (!this.gameRunning) {
            this.gameRunning = true;
            this.showMessage('');
            this.gameLoop();
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.score.player1 = 0;
        this.score.player2 = 0;
        this.updateScore();
        this.resetBall();
        this.paddle1.y = this.canvas.height / 2 - 50;
        this.paddle2.y = this.canvas.height / 2 - 50;
        this.showMessage('Press Start Game to begin!');
        this.draw();
    }
    
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() - 0.5) * this.ball.speed;
        this.ball.jiggleX = 0;
        this.ball.jiggleY = 0;
        this.ball.jiggleIntensity = 0;
    }
    
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
            
            // Update characters in column
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
    
    addGlitchEffect(intensity, duration) {
        this.glitchEffect.active = true;
        this.glitchEffect.intensity = intensity;
        this.glitchEffect.duration = duration;
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
    
    updatePaddles() {
        // Player 1 controls (W/S)
        if (this.keys['w'] && this.paddle1.y > 0) {
            this.paddle1.y -= this.paddle1.speed;
        }
        if (this.keys['s'] && this.paddle1.y < this.canvas.height - this.paddle1.height) {
            this.paddle1.y += this.paddle1.speed;
        }
        
        // Player 2 controls (Arrow keys)
        if (this.keys['arrowup'] && this.paddle2.y > 0) {
            this.paddle2.y -= this.paddle2.speed;
        }
        if (this.keys['arrowdown'] && this.paddle2.y < this.canvas.height - this.paddle2.height) {
            this.paddle2.y += this.paddle2.speed;
        }
    }
    
    updateBall() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Ball collision with top and bottom walls
        if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.canvas.height) {
            this.ball.dy = -this.ball.dy;
            this.addJiggle(this.ball, 3);
            this.createSparkExplosion(this.ball.x, this.ball.y, 15);
            this.addGlitchEffect(5, 10);
            this.playWallHitSound();
        }
        
        // Ball collision with paddles
        if (this.ballPaddleCollision(this.paddle1)) {
            this.ball.dx = -this.ball.dx;
            this.ball.dy += (Math.random() - 0.5) * 2;
            this.addJiggle(this.ball, 5);
            this.addShake(this.paddle1, 8);
            this.createSparkExplosion(this.ball.x, this.ball.y, 25);
            this.addGlitchEffect(8, 15);
            this.playPaddleHitSound();
        } else if (this.ballPaddleCollision(this.paddle2)) {
            this.ball.dx = -this.ball.dx;
            this.ball.dy += (Math.random() - 0.5) * 2;
            this.addJiggle(this.ball, 5);
            this.addShake(this.paddle2, 8);
            this.createSparkExplosion(this.ball.x, this.ball.y, 25);
            this.addGlitchEffect(8, 15);
            this.playPaddleHitSound();
        }
        
        // Ball goes off screen (scoring)
        if (this.ball.x < 0) {
            this.score.player2++;
            this.updateScore();
            this.addScreenShake(15);
            this.createSparkExplosion(0, this.ball.y, 40);
            this.addGlitchEffect(15, 30);
            this.playScoreSound();
            this.checkWin();
            this.resetBall();
        } else if (this.ball.x > this.canvas.width) {
            this.score.player1++;
            this.updateScore();
            this.addScreenShake(15);
            this.createSparkExplosion(this.canvas.width, this.ball.y, 40);
            this.addGlitchEffect(15, 30);
            this.playScoreSound();
            this.checkWin();
            this.resetBall();
        }
    }
    
    ballPaddleCollision(paddle) {
        return this.ball.x - this.ball.radius < paddle.x + paddle.width &&
               this.ball.x + this.ball.radius > paddle.x &&
               this.ball.y - this.ball.radius < paddle.y + paddle.height &&
               this.ball.y + this.ball.radius > paddle.y;
    }
    
    checkWin() {
        if (this.score.player1 >= this.maxScore) {
            this.gameRunning = false;
            this.showMessage('Player 1 Wins! 🎉');
        } else if (this.score.player2 >= this.maxScore) {
            this.gameRunning = false;
            this.showMessage('Player 2 Wins! 🎉');
        }
    }
    
    updateScore() {
        document.getElementById('player1Score').textContent = this.score.player1;
        document.getElementById('player2Score').textContent = this.score.player2;
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
    
    showMessage(message) {
        document.getElementById('gameMessage').textContent = message;
    }
    
    draw() {
        // Apply screen shake and glitch effects
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);
        
        // Apply glitch effect
        if (this.glitchEffect.active) {
            const glitchOffset = (Math.random() - 0.5) * this.glitchEffect.intensity;
            this.ctx.translate(glitchOffset, 0);
        }
        
        // Clear canvas with Matrix-style background
        this.drawMatrixBackground();
        
        // Draw center line
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
        
        // Draw sparks
        this.drawSparks();
        
        // Apply additional glitch effects
        if (this.glitchEffect.active && Math.random() < 0.3) {
            this.drawGlitchLines();
        }
        
        this.ctx.restore();
    }
    
    drawMatrixBackground() {
        // Dark background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(-this.screenShake.x, -this.screenShake.y, this.canvas.width, this.canvas.height);
        
        // Matrix falling code
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
            
            // Add glow effect
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
        // Draw paddles
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
        
        // Draw ball
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
        // Draw Shrek (Player 1)
        this.drawShrek(
            this.paddle1.x + this.paddle1.shakeX, 
            this.paddle1.y + this.paddle1.shakeY, 
            this.paddle1.width * 3, 
            this.paddle1.height
        );
        
        // Draw Donkey (Player 2)
        this.drawDonkey(
            this.paddle2.x + this.paddle2.shakeX - 20, 
            this.paddle2.y + this.paddle2.shakeY, 
            this.paddle2.width * 3, 
            this.paddle2.height
        );
        
        // Draw Onion (Ball)
        this.drawOnion(
            this.ball.x + this.ball.jiggleX, 
            this.ball.y + this.ball.jiggleY, 
            this.ball.radius * 2
        );
    }
    
    drawShrek(x, y, width, height) {
        // Shrek's body (green)
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(x, y, width, height);
        
        // Shrek's head
        this.ctx.fillStyle = '#66BB6A';
        this.ctx.fillRect(x - 5, y - 15, width + 10, 20);
        
        // Shrek's ears
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.arc(x - 2, y - 5, 8, 0, Math.PI * 2);
        this.ctx.arc(x + width + 2, y - 5, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(x + 5, y - 10, 4, 4);
        this.ctx.fillRect(x + width - 9, y - 10, 4, 4);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 6, y - 9, 2, 2);
        this.ctx.fillRect(x + width - 8, y - 9, 2, 2);
        
        // Mouth
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y - 5, 6, 0, Math.PI);
        this.ctx.stroke();
    }
    
    drawDonkey(x, y, width, height) {
        // Donkey's body (brown)
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(x, y, width, height);
        
        // Donkey's head
        this.ctx.fillStyle = '#A1887F';
        this.ctx.fillRect(x - 5, y - 15, width + 10, 20);
        
        // Donkey's long ears
        this.ctx.fillStyle = '#8D6E63';
        this.ctx.fillRect(x - 8, y - 25, 6, 25);
        this.ctx.fillRect(x + width + 2, y - 25, 6, 25);
        
        // Eyes (big and expressive)
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(x + 8, y - 8, 6, 0, Math.PI * 2);
        this.ctx.arc(x + width - 8, y - 8, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x + 8, y - 8, 3, 0, Math.PI * 2);
        this.ctx.arc(x + width - 8, y - 8, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Mouth (always talking)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + width/2 - 3, y - 3, 6, 3);
    }
    
    drawOnion(x, y, radius) {
        // Onion layers (multiple circles)
        const colors = ['#DDD', '#CCC', '#BBB', '#AAA'];
        
        for (let i = 0; i < colors.length; i++) {
            this.ctx.fillStyle = colors[i];
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius - i * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Onion top (green sprout)
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(x - 2, y - radius - 8, 4, 8);
        this.ctx.fillRect(x - 4, y - radius - 6, 2, 4);
        this.ctx.fillRect(x + 2, y - radius - 6, 2, 4);
        
        // Onion face (because why not)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x - 3, y - 2, 1, 1);
        this.ctx.fillRect(x + 2, y - 2, 1, 1);
        this.ctx.fillRect(x - 1, y + 1, 2, 1);
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.updatePaddles();
        this.updateBall();
        this.updateJigglePhysics();
        this.updateMatrixBackground();
        this.updateSparks();
        this.updateGlitchEffect();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new PongGame();
    game.showMessage('Press Start Game to begin!');
});
