# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- **Local Server**: `node server.js` - Starts a basic HTTP server on port 3000
- **Browser Access**: Open `http://localhost:3000` to play the game
- **Direct File**: Open `index.html` directly in a browser (no server needed)

### No Build Process
This is a vanilla JavaScript project with no build tools, package managers, or dependencies. All files can be served directly.

## Code Architecture

### File Structure
- `index.html` - Main HTML file with canvas element and basic styling
- `Script.js` - Complete game implementation (~650 lines)
- `Style.css` - Minimal CSS with glow animation for power-ups
- `server.js` - Simple Node.js HTTP server for local development
- Bird sprite images: `redbird-upflap.png`, `redbird-midflap.png`, `redbird-downflap.png`

### Game Architecture (Script.js)

**Configuration System**
- Centralized `CONFIG` object containing all game parameters (physics, sprites, performance limits)
- Easily adjustable difficulty scaling and game mechanics

**State Management**
- `GameState` class manages game state, score, high score persistence, difficulty scaling
- Invincibility power-up timer management

**Object Pooling**
- `ObjectPool` class for performance optimization
- Separate pools for pipes (`pipePool`) and power-ups (`powerUpPool`)
- Prevents garbage collection during gameplay

**Game Objects**
- `Pipe` class with collision detection and scoring
- `PowerUp` class with star-shaped rendering and collision
- `bird` object with sprite animation based on velocity

**Rendering System**
- Multi-layer parallax background (sky, clouds, mountains, terrain)
- Sprite-based bird animation with rotation
- Performance-optimized drawing with object culling

**Game Loop**
- Single `gameLoop()` function using `requestAnimationFrame`
- Handles pipe spawning based on difficulty-adjusted intervals
- Updates all game objects and renders complete scene

### Key Features
- Dynamic difficulty scaling based on score
- Invincibility power-ups with visual feedback
- High score persistence via localStorage
- Responsive touch/click/keyboard controls
- Multi-layer scrolling background
- Performance optimizations with object pools

## Development Notes

- No external dependencies or build tools required
- All game logic contained in single JavaScript file
- Canvas-based 2D rendering
- Mobile-friendly touch controls implemented
- Images loaded asynchronously with error handling