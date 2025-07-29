const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Configuration
const CONFIG = {
    PHYSICS: {
        gravity: 0.5,
        jumpForce: -8,
        maxVelocity: 10
    },
    BIRD: {
        size: 30,
        width: 34,
        height: 24,
        collisionMargin: 5
    },
    PIPES: {
        width: 52,
        gap: 150,
        speed: 2,
        spawnInterval: 3000,
        minHeight: 50
    },
    POWERUPS: {
        size: 30,
        duration: 5000,
        spawnChance: 0.3,
        spikes: 5
    },
    BACKGROUND: {
        skyColor: '#4EC0CA',
        cloudSpeed: 0.5,
        mountainSpeed: 1,
        terrainSpeed: 2
    },
    PERFORMANCE: {
        maxPipes: 4,
        maxPowerUps: 3,
        maxClouds: 5
    }
};

// Image loading with error handling
const birdSprites = {
    upflap: new Image(),
    midflap: new Image(),
    downflap: new Image(),
    loaded: 0,
    total: 3
};

function loadImages() {
    const images = [
        { sprite: birdSprites.upflap, src: 'redbird-upflap.png' },
        { sprite: birdSprites.midflap, src: 'redbird-midflap.png' },
        { sprite: birdSprites.downflap, src: 'redbird-downflap.png' }
    ];
    
    images.forEach(({ sprite, src }) => {
        sprite.onload = () => {
            birdSprites.loaded++;
            if (birdSprites.loaded === birdSprites.total) {
                gameState.imagesLoaded = true;
            }
        };
        sprite.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            birdSprites.loaded++;
        };
        sprite.src = src;
    });
}

loadImages();

// GameState class for centralized state management
class GameState {
    constructor() {
        this.reset();
        this.imagesLoaded = false;
        this.highScore = parseInt(localStorage.getItem('flappyBirdHighScore') || '0');
    }
    
    reset() {
        this.gameOver = false;
        this.score = 0;
        this.isInvincible = false;
        this.invincibleTimer = null;
        this.difficulty = 1;
        this.lastPipeTime = 0;
    }
    
    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyBirdHighScore', this.highScore.toString());
        }
    }
    
    increaseDifficulty() {
        this.difficulty = Math.min(1 + (this.score / 20) * 0.2, 2);
    }
}

const gameState = new GameState();

const backgroundLayers = {
    sky: { color: CONFIG.BACKGROUND.skyColor },
    birds: {
        speed: CONFIG.BACKGROUND.cloudSpeed * 1.5,
        elements: []
    },
    particles: {
        speed: CONFIG.BACKGROUND.cloudSpeed * 0.2,
        elements: []
    },
    distantForest: {
        speed: CONFIG.BACKGROUND.mountainSpeed * 0.3,
        elements: []
    },
    mountains: {
        speed: CONFIG.BACKGROUND.mountainSpeed,
        height: canvas.height * 0.65, // Very top of screen
        backLayer: [],
        frontLayer: []
    },
    hills: {
        speed: CONFIG.BACKGROUND.mountainSpeed * 0.6,
        elements: []
    },
    terrain: {
        offset: 0,
        speed: CONFIG.BACKGROUND.terrainSpeed,
        height: canvas.height * 0.1
    }
};

function initHills() {
    const hillWidth = 100;
    const numHills = Math.ceil(canvas.width / hillWidth) + 2;
    
    for (let i = 0; i < numHills; i++) {
        const x = i * hillWidth - 50;
        const baseY = canvas.height * 0.65; // Lower down in middle blue area
        // Use deterministic values to prevent glitching
        const heightSeed = i * 1234;
        const hillHeight = 40 + ((heightSeed % 1000) / 1000) * 60; // Deterministic height
        const contentSeed = i * 5678;
        const topContent = (contentSeed % 1000) < 500 ? 'forest' : 'city';
        
        backgroundLayers.hills.elements.push({
            x: x,
            y: baseY,
            width: hillWidth,
            height: hillHeight,
            topContent: topContent
        });
    }
}

function initBirds() {
    const numBirds = 3;
    for (let i = 0; i < numBirds; i++) {
        backgroundLayers.birds.elements.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.4) + 20,
            size: Math.random() * 8 + 4,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: 0.08 + Math.random() * 0.06  // Reduced from 0.3 + 0.2 to 0.08 + 0.06
        });
    }
}

function initParticles() {
    const numParticles = 15;
    for (let i = 0; i < numParticles; i++) {
        backgroundLayers.particles.elements.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.3 + 0.1,
            drift: Math.random() * 0.5 - 0.25
        });
    }
}

function initDistantForest() {
    const forestWidth = 120;
    const numForestSections = Math.ceil(canvas.width / forestWidth) + 2;
    
    for (let i = 0; i < numForestSections; i++) {
        const x = i * forestWidth - 60;
        const mountainBase = canvas.height - backgroundLayers.mountains.height;
        const baseHeight = mountainBase - 10; // Just above mountain line
        const heightVariation = Math.random() * 20 + 15; // Smaller trees
        
        backgroundLayers.distantForest.elements.push({
            x: x,
            y: baseHeight,
            width: forestWidth + 20,
            height: heightVariation,
            treePattern: Math.floor(Math.random() * 3)
        });
    }
}

function updateHills() {
    // Hills are now static - no movement or generation
    // This function is kept for compatibility but does nothing
}

function drawHills() {
    backgroundLayers.hills.elements.forEach(hill => {
        if (hill.x + hill.width >= 0 && hill.x <= canvas.width) {
            // Draw hill base
            ctx.fillStyle = 'rgba(120, 140, 90, 0.7)';
            ctx.beginPath();
            ctx.moveTo(hill.x, hill.y);
            // Create curved hill shape
            for (let i = 0; i <= 20; i++) {
                const hillX = hill.x + (i * hill.width / 20);
                const hillY = hill.y - hill.height + Math.sin(i * Math.PI / 20) * hill.height;
                ctx.lineTo(hillX, hillY);
            }
            ctx.lineTo(hill.x + hill.width, hill.y);
            ctx.closePath();
            ctx.fill();
            
            // Draw content at bottom of hill (just above hill base)
            const hillBottom = hill.y; // hill.y is the base of the hill
            const contentOffset = -5; // Small offset to place content just above hill base
            
            if (hill.topContent === 'forest') {
                // Draw forest positioned lower on hill
                ctx.fillStyle = 'rgba(34, 80, 34, 0.8)';
                const numTrees = 6;
                for (let i = 0; i < numTrees; i++) {
                    const treeX = hill.x + (i + 1) * (hill.width / (numTrees + 1));
                    // Use deterministic tree height based on position
                    const treeSeed = Math.floor(hill.x / 100) * 100 + i * 456;
                    const treeHeight = 15 + ((treeSeed % 1000) / 1000) * 10;
                    ctx.beginPath();
                    ctx.arc(treeX, hillBottom + contentOffset - treeHeight, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Draw city positioned lower on hill
                ctx.fillStyle = 'rgba(70, 70, 100, 0.7)';
                const numBuildings = 3;
                for (let i = 0; i < numBuildings; i++) {
                    const buildingX = hill.x + (i + 1) * (hill.width / (numBuildings + 1)) - 8;
                    // Use deterministic building height based on position
                    const buildingSeed = Math.floor(hill.x / 100) * 200 + i * 789;
                    const buildingHeight = 20 + ((buildingSeed % 1000) / 1000) * 15;
                    ctx.fillRect(buildingX, hillBottom + contentOffset - buildingHeight, 16, buildingHeight);
                }
            }
        }
    });
}

function createMountain(x, layer) {
    const heightSeed = Math.floor(x / 80) * (layer === 'back' ? 137 : 211);
    const mountainHeight = layer === 'back' ? 
        60 + ((heightSeed % 1000) / 1000) * 80 : // 60-140px for back
        40 + ((heightSeed % 1000) / 1000) * 60;  // 40-100px for front
    
    return {
        x: x,
        height: mountainHeight,
        width: 80,
        hasSnow: layer === 'front' && mountainHeight > 70
    };
}

function initMountains() {
    // Initialize with mountains covering the screen plus some off-screen
    const mountainWidth = 80;
    
    // Back layer (offset by -40 for layering effect)
    for (let x = -40; x <= canvas.width + mountainWidth; x += mountainWidth) {
        backgroundLayers.mountains.backLayer.push(createMountain(x, 'back'));
    }
    
    // Front layer
    for (let x = 0; x <= canvas.width + mountainWidth; x += mountainWidth) {
        backgroundLayers.mountains.frontLayer.push(createMountain(x, 'front'));
    }
}

function drawBackground() {
    // Draw gradient sky instead of flat color
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');    // Sky blue at top
    gradient.addColorStop(0.7, '#4EC0CA');  // Current blue in middle
    gradient.addColorStop(1, '#3BA7B0');    // Slightly darker at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sun
    const sunX = canvas.width * 0.8;
    const sunY = canvas.height * 0.15;
    const sunRadius = 40;
    
    // Sun glow
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 2);
    sunGlow.addColorStop(0, 'rgba(255, 255, 0, 0.3)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - sunRadius * 2, sunY - sunRadius * 2, sunRadius * 4, sunRadius * 4);
    
    // Sun body
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, '#FFD700');
    sunGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw subtle sun rays
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
    ctx.lineWidth = 3;
    const numRays = 6;
    for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const rayLength = 200 + Math.sin(Date.now() * 0.001 + i) * 30; // Gentle animation
        
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * sunRadius, sunY + Math.sin(angle) * sunRadius);
        ctx.lineTo(sunX + Math.cos(angle) * rayLength, sunY + Math.sin(angle) * rayLength);
        ctx.stroke();
    }

    // Draw background birds
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    backgroundLayers.birds.elements.forEach(bird => {
        bird.x -= backgroundLayers.birds.speed * gameState.difficulty;
        bird.wingPhase += bird.wingSpeed;
        
        if (bird.x + bird.size < 0) {
            bird.x = canvas.width + Math.random() * 200;
            bird.y = Math.random() * (canvas.height * 0.4) + 20;
        }
        
        // Draw M-shaped bird with flapping animation
        const wingFlap = Math.sin(bird.wingPhase) * 0.4; // Flapping angle
        const wingSpan = bird.size;
        
        ctx.beginPath();
        // Left wing
        ctx.moveTo(bird.x - wingSpan * 0.8, bird.y + wingFlap * wingSpan * 0.3);
        ctx.lineTo(bird.x - wingSpan * 0.2, bird.y - wingFlap * wingSpan * 0.2);
        // Center body point
        ctx.lineTo(bird.x, bird.y + wingSpan * 0.1);
        // Right wing
        ctx.lineTo(bird.x + wingSpan * 0.2, bird.y - wingFlap * wingSpan * 0.2);
        ctx.lineTo(bird.x + wingSpan * 0.8, bird.y + wingFlap * wingSpan * 0.3);
        
        ctx.stroke();
    });

    // Draw mountains at top of screen first
    updateMountains();
    
    // Draw back mountain layer (darker, taller)
    ctx.fillStyle = '#7f8c8d';
    backgroundLayers.mountains.backLayer.forEach(mountain => {
        if (mountain.x + mountain.width >= 0 && mountain.x <= canvas.width) {
            drawMountain(mountain, 'back');
        }
    });
    
    // Draw front mountain layer (lighter, shorter)
    ctx.fillStyle = '#95a5a6';
    backgroundLayers.mountains.frontLayer.forEach(mountain => {
        if (mountain.x + mountain.width >= 0 && mountain.x <= canvas.width) {
            drawMountain(mountain, 'front');
        }
    });

    // Update and draw hills with content on top (in middle)
    updateHills();
    drawHills();

    // Draw atmospheric particles
    backgroundLayers.particles.elements.forEach(particle => {
        particle.x -= backgroundLayers.particles.speed * gameState.difficulty;
        particle.y += particle.drift;
        
        if (particle.x + particle.size < 0) {
            particle.x = canvas.width + Math.random() * 100;
            particle.y = Math.random() * canvas.height;
        }
        if (particle.y > canvas.height) {
            particle.y = -particle.size;
        } else if (particle.y < -particle.size) {
            particle.y = canvas.height;
        }
        
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#2ecc71';
    const terrainSegmentWidth = 40;
    const numSegments = Math.ceil(canvas.width / terrainSegmentWidth) + 1;
    
    backgroundLayers.terrain.offset = (backgroundLayers.terrain.offset + backgroundLayers.terrain.speed * gameState.difficulty) % terrainSegmentWidth;
    
    for (let i = 0; i < numSegments; i++) {
        const x = i * terrainSegmentWidth - backgroundLayers.terrain.offset;
        const baseHeight = backgroundLayers.terrain.height;
        
        // Create flat terrain base
        ctx.fillRect(
            x,
            canvas.height - baseHeight,
            terrainSegmentWidth,
            baseHeight
        );

        // Add swaying grass blades with deterministic positioning
        ctx.fillStyle = '#27ae60';
        const currentTime = Date.now() * 0.001; // Convert to seconds
        
        for (let j = 0; j < 6; j++) {
            // Use deterministic positioning based on segment index
            const seedX = (i * 1000 + j * 123) % 1000;
            const seedH = (i * 1500 + j * 456) % 1000;
            
            const grassX = x + (j * (terrainSegmentWidth/6)) + (seedX / 1000) * 8;
            const grassHeight = 15 + (seedH / 1000) * 12; // Heights between 15-27px
            const grassWidth = 3;
            
            // Add swaying motion based on position and time
            const swayAmount = Math.sin(currentTime * 2 + grassX * 0.02) * 2;
            
            // Draw grass blade with slight taper and sway
            ctx.beginPath();
            ctx.moveTo(grassX, canvas.height - baseHeight);
            ctx.lineTo(grassX + swayAmount, canvas.height - baseHeight - grassHeight * 0.7);
            ctx.lineTo(grassX + swayAmount * 1.5, canvas.height - baseHeight - grassHeight);
            ctx.lineTo(grassX + swayAmount * 1.5 + 1, canvas.height - baseHeight - grassHeight);
            ctx.lineTo(grassX + swayAmount + 1, canvas.height - baseHeight - grassHeight * 0.7);
            ctx.lineTo(grassX + grassWidth, canvas.height - baseHeight);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#2ecc71';
    }
}

function updateMountains() {
    const speed = backgroundLayers.mountains.speed * gameState.difficulty;
    const mountainWidth = 80;
    
    // Update back layer positions
    backgroundLayers.mountains.backLayer.forEach(mountain => {
        mountain.x -= speed;
    });
    
    // Update front layer positions
    backgroundLayers.mountains.frontLayer.forEach(mountain => {
        mountain.x -= speed;
    });
    
    // Remove mountains that have scrolled off screen (left side)
    backgroundLayers.mountains.backLayer = backgroundLayers.mountains.backLayer.filter(mountain => 
        mountain.x + mountain.width >= -100
    );
    backgroundLayers.mountains.frontLayer = backgroundLayers.mountains.frontLayer.filter(mountain => 
        mountain.x + mountain.width >= -100
    );
    
    // Add new mountains on the right side when needed
    // Find the rightmost mountain in each layer
    const rightmostBack = backgroundLayers.mountains.backLayer.reduce((max, mountain) => 
        Math.max(max, mountain.x + mountain.width), -Infinity);
    const rightmostFront = backgroundLayers.mountains.frontLayer.reduce((max, mountain) => 
        Math.max(max, mountain.x + mountain.width), -Infinity);
    
    // Add back layer mountains if needed
    let nextBackX = rightmostBack;
    while (nextBackX < canvas.width + mountainWidth) {
        backgroundLayers.mountains.backLayer.push(createMountain(nextBackX, 'back'));
        nextBackX += mountainWidth;
    }
    
    // Add front layer mountains if needed
    let nextFrontX = rightmostFront;
    while (nextFrontX < canvas.width + mountainWidth) {
        backgroundLayers.mountains.frontLayer.push(createMountain(nextFrontX, 'front'));
        nextFrontX += mountainWidth;
    }
}

function drawMountain(mountain, layer) {
    const baseHeight = backgroundLayers.mountains.height;
    const mountainHeight = mountain.height;
    const x = mountain.x;
    const mountainWidth = mountain.width;
    
    if (layer === 'back') {
        // Create more natural mountain shape with multiple peaks
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - baseHeight);
        ctx.lineTo(x + mountainWidth * 0.2, canvas.height - baseHeight - mountainHeight * 0.6);
        ctx.lineTo(x + mountainWidth * 0.4, canvas.height - baseHeight - mountainHeight * 0.8);
        ctx.lineTo(x + mountainWidth * 0.6, canvas.height - baseHeight - mountainHeight);
        ctx.lineTo(x + mountainWidth * 0.75, canvas.height - baseHeight - mountainHeight * 0.7);
        ctx.lineTo(x + mountainWidth * 0.9, canvas.height - baseHeight - mountainHeight * 0.9);
        ctx.lineTo(x + mountainWidth, canvas.height - baseHeight - mountainHeight * 0.3);
        ctx.lineTo(x + mountainWidth, canvas.height - baseHeight);
        ctx.closePath();
        ctx.fill();
    } else {
        // Simpler shapes for front mountains
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - baseHeight);
        ctx.lineTo(x + mountainWidth * 0.3, canvas.height - baseHeight - mountainHeight * 0.7);
        ctx.lineTo(x + mountainWidth * 0.7, canvas.height - baseHeight - mountainHeight);
        ctx.lineTo(x + mountainWidth, canvas.height - baseHeight - mountainHeight * 0.4);
        ctx.lineTo(x + mountainWidth, canvas.height - baseHeight);
        ctx.closePath();
        ctx.fill();
        
        // Add snow caps on taller mountains
        if (mountain.hasSnow) {
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.moveTo(x + mountainWidth * 0.6, canvas.height - baseHeight - mountainHeight * 0.85);
            ctx.lineTo(x + mountainWidth * 0.7, canvas.height - baseHeight - mountainHeight);
            ctx.lineTo(x + mountainWidth * 0.8, canvas.height - baseHeight - mountainHeight * 0.85);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#95a5a6';
        }
    }
}

// Object pools for performance
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        this.active.forEach(obj => {
            this.resetFn(obj);
            this.pool.push(obj);
        });
        this.active.length = 0;
    }
}

class Pipe {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = canvas.width;
        this.topHeight = 0;
        this.bottomY = 0;
        this.scored = false;
        this.active = false;
    }
    
    init(topHeight) {
        this.x = canvas.width;
        this.topHeight = topHeight;
        this.bottomY = topHeight + CONFIG.PIPES.gap;
        this.scored = false;
        this.active = true;
    }
    
    update() {
        if (!this.active) return;
        this.x -= CONFIG.PIPES.speed * gameState.difficulty;
        
        if (!this.scored && this.x + CONFIG.PIPES.width < bird.x) {
            gameState.score++;
            gameState.updateHighScore();
            gameState.increaseDifficulty();
            this.scored = true;
        }
        
        return this.x + CONFIG.PIPES.width > 0;
    }
    
    draw() {
        if (!this.active) return;
        
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(this.x, 0, CONFIG.PIPES.width, this.topHeight);
        ctx.fillRect(this.x, this.bottomY, CONFIG.PIPES.width, canvas.height - this.bottomY);
        
        ctx.fillStyle = '#27AE60';
        const edgeWidth = 4;
        ctx.fillRect(this.x - edgeWidth/2, this.topHeight - 20, CONFIG.PIPES.width + edgeWidth, 20);
        ctx.fillRect(this.x - edgeWidth/2, this.bottomY, CONFIG.PIPES.width + edgeWidth, 20);
    }
    
    checkCollision(bird) {
        if (!this.active) return false;
        
        const hitboxWidth = bird.width - CONFIG.BIRD.collisionMargin * 2;
        const hitboxHeight = bird.height - CONFIG.BIRD.collisionMargin * 2;
        
        if (bird.x + hitboxWidth/2 > this.x && bird.x - hitboxWidth/2 < this.x + CONFIG.PIPES.width) {
            if (bird.y - hitboxHeight/2 < this.topHeight || bird.y + hitboxHeight/2 > this.bottomY) {
                return true;
            }
        }
        return false;
    }
}

class PowerUp {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.collected = false;
        this.active = false;
    }
    
    init(x, y) {
        this.x = x;
        this.y = y;
        this.collected = false;
        this.active = true;
    }

    draw() {
        if (!this.active || this.collected) return;
        
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'gold';
        
        const spikes = CONFIG.POWERUPS.spikes;
        const outerRadius = CONFIG.POWERUPS.size / 2;
        const innerRadius = CONFIG.POWERUPS.size / 4;
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    checkCollision(bird) {
        if (!this.active || this.collected) return false;
        
        const distance = Math.sqrt(
            Math.pow(bird.x - this.x, 2) + 
            Math.pow(bird.y - this.y, 2)
        );
        
        if (distance < (CONFIG.POWERUPS.size / 2 + bird.width / 2)) {
            this.collected = true;
            return true;
        }
        return false;
    }
    
    update() {
        if (!this.active) return;
        this.x -= CONFIG.PIPES.speed * gameState.difficulty;
        return this.x + CONFIG.POWERUPS.size > 0 && !this.collected;
    }
}

const bird = {
    x: canvas.width / 3,
    y: canvas.height / 2,
    velocity: 0,
    width: CONFIG.BIRD.width,
    height: CONFIG.BIRD.height,
    
    reset() {
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.velocity = 0;
    },
    
    draw() {
        if (!gameState.imagesLoaded) return;
        
        let currentSprite;
        if (this.velocity < -3) {
            currentSprite = birdSprites.upflap;
        } else if (this.velocity > 3) {
            currentSprite = birdSprites.downflap;
        } else {
            currentSprite = birdSprites.midflap;
        }

        ctx.save();
        
        if (gameState.isInvincible) {
            ctx.shadowColor = 'gold';
            ctx.shadowBlur = 20;
        }
        
        ctx.translate(this.x, this.y);
        const rotation = Math.min(Math.max(this.velocity * 0.1, -0.5), 0.5);
        ctx.rotate(rotation);
        
        ctx.drawImage(
            currentSprite,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        
        ctx.restore();
    },

    update() {
        if (gameState.gameOver) return;

        this.velocity += CONFIG.PHYSICS.gravity;
        this.velocity = Math.min(this.velocity, CONFIG.PHYSICS.maxVelocity);
        this.y += this.velocity;

        if (this.y + this.height / 2 > canvas.height) {
            this.y = canvas.height - this.height / 2;
            this.velocity = 0;
            gameState.gameOver = true;
        }
        if (this.y - this.height / 2 < 0) {
            this.y = this.height / 2;
            this.velocity = Math.max(this.velocity, 0);
        }

        if (!gameState.isInvincible) {
            pipePool.active.forEach(pipe => {
                if (pipe.checkCollision(this)) {
                    gameState.gameOver = true;
                }
            });
        }

        powerUpPool.active.forEach(powerUp => {
            if (powerUp.checkCollision(this)) {
                activatePowerUp();
                powerUpPool.release(powerUp);
            }
        });
    },

    flap() {
        if (!gameState.gameOver) {
            this.velocity = CONFIG.PHYSICS.jumpForce;
        }
    }
};

const pipePool = new ObjectPool(
    () => new Pipe(),
    (pipe) => pipe.reset(),
    CONFIG.PERFORMANCE.maxPipes
);

const powerUpPool = new ObjectPool(
    () => new PowerUp(),
    (powerUp) => powerUp.reset(),
    CONFIG.PERFORMANCE.maxPowerUps
);

function activatePowerUp() {
    gameState.isInvincible = true;
    
    if (gameState.invincibleTimer) {
        clearTimeout(gameState.invincibleTimer);
    }
    
    gameState.invincibleTimer = setTimeout(() => {
        gameState.isInvincible = false;
        gameState.invincibleTimer = null;
    }, CONFIG.POWERUPS.duration);
}

function createPipe() {
    if (gameState.gameOver) return;

    const minHeight = CONFIG.PIPES.minHeight;
    // Account for terrain height and grass to prevent overlap
    const terrainHeight = backgroundLayers.terrain.height + 27; // 27px max grass height
    const maxHeight = canvas.height - CONFIG.PIPES.gap - minHeight - terrainHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    const pipe = pipePool.get();
    pipe.init(topHeight);

    if (Math.random() < CONFIG.POWERUPS.spawnChance) {
        const powerUpY = topHeight + (CONFIG.PIPES.gap / 2);
        const powerUp = powerUpPool.get();
        powerUp.init(canvas.width + CONFIG.PIPES.width/2, powerUpY);
    }
}

function updatePipes() {
    if (gameState.gameOver) return;

    pipePool.active.forEach(pipe => {
        if (!pipe.update()) {
            pipePool.release(pipe);
        }
    });
    
    powerUpPool.active.forEach(powerUp => {
        if (!powerUp.update()) {
            powerUpPool.release(powerUp);
        }
    });
}

function drawPipes() {
    pipePool.active.forEach(pipe => pipe.draw());
}

function drawPowerUps() {
    powerUpPool.active.forEach(powerUp => powerUp.draw());
}

function drawScore() {
    if (!gameState.imagesLoaded) {
        ctx.fillStyle = '#000';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameState.score}`, 10, 30);
    ctx.fillText(`High Score: ${gameState.highScore}`, 10, 60);
    ctx.fillText(`Difficulty: ${gameState.difficulty.toFixed(1)}x`, 10, 90);

    if (gameState.isInvincible) {
        ctx.fillStyle = 'gold';
        ctx.fillText('INVINCIBLE!', 10, 120);
    }

    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Press Space or Tap to Restart', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function resetGame() {
    gameState.reset();
    pipePool.releaseAll();
    powerUpPool.releaseAll();
    bird.reset();
    if (gameState.invincibleTimer) {
        clearTimeout(gameState.invincibleTimer);
        gameState.invincibleTimer = null;
    }
}

function handleInput() {
    if (gameState.gameOver) {
        resetGame();
    } else {
        bird.flap();
    }
}

// Listen for spacebar press
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState.gameOver) {
            // Reset game when space is pressed after game over
            resetGame();
        } else {
            // Make bird jump when space is pressed during game
            bird.flap();
        }
    }
});

// Add touch support for mobile devices
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling when touching the canvas
    if (gameState.gameOver) {
        // Reset game when touching after game over
        resetGame();
    } else {
        // Make bird jump when touching during game
        bird.flap();
    }
}, { passive: false });

// Add click support for desktop
canvas.addEventListener('click', (e) => {
    if (gameState.gameOver) {
        resetGame();
    } else {
        bird.flap();
    }
});

// Handle canvas resize
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const scale = Math.min(1, containerWidth / 800); // 800 is original canvas width
    
    // Update canvas display size while maintaining aspect ratio
    canvas.style.width = (800 * scale) + 'px';
    canvas.style.height = (600 * scale) + 'px';
}

// Call resize on window resize
window.addEventListener('resize', resizeCanvas);

// Initialize the game
function init() {
    resizeCanvas(); // Initial resize
    initHills();
    initBirds();
    initParticles();
    initMountains();
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameState.imagesLoaded) {
        drawScore();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (!gameState.gameOver && currentTime - gameState.lastPipeTime > CONFIG.PIPES.spawnInterval / gameState.difficulty) {
        createPipe();
        gameState.lastPipeTime = currentTime;
    }
    
    drawBackground();
    updatePipes();
    drawPipes();
    drawPowerUps();
    bird.update();
    bird.draw();
    drawScore();

    requestAnimationFrame(gameLoop);
}

// Start the game
init();
