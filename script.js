class LudoGame {
            constructor(settings) {
                this.settings = {
                    playerCount: settings.playerCount || 4,
                    gameMode: settings.gameMode || 'multiplayer',
                    turnTime: 60
                };
                
                // Game state
                this.players = ['red', 'blue', 'yellow', 'green'].slice(0, this.settings.playerCount);
                this.currentPlayer = 0;
                this.diceValue = 0;
                this.canRoll = true;
                this.soundEnabled = true;
                this.gameFinished = false;
                
                // Player types (human or AI)
                this.playerTypes = {};
                this.setupPlayerTypes();
                
                // Timer variables
                this.timer = null;
                this.remainingTime = this.settings.turnTime;
                
                // Board positions
                this.boardPositions = this.generateBoardPositions();
                this.safePositions = [0, 8, 13, 21, 26, 34, 39, 47];
                this.startPositions = { red: 0, blue: 13, yellow: 26, green: 39 };
                
                // Token positions: -1 = home, 0-51 = board positions, 52-56 = home stretch, 57 = finished
                this.tokenPositions = {
                    red: [-1, -1, -1, -1],
                    blue: [-1, -1, -1, -1],
                    yellow: [-1, -1, -1, -1],
                    green: [-1, -1, -1, -1]
                };
                
                // Home stretch positions
                this.homeStretch = {
                    red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
                    blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
                    yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
                    green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
                };
                
                // Power-ups and special moves
                this.specialMoves = {
                    red: 1,
                    blue: 1,
                    yellow: 1,
                    green: 1
                };
                
                // Move history for undo
                this.moveHistory = [];
                
                // Initialize game
                this.createBoard();
                this.createPlayerCards();
                this.placeTokens();
                this.updateUI();
                
                // Update game mode display
                document.getElementById('gameMode').textContent = 
                    `${this.settings.playerCount} Players - ${this.getGameModeName()}`;
                
                // Start turn
                this.startTurnTimer();
                
                // Add event listeners
                document.getElementById('dice').addEventListener('click', () => this.rollDice());
                document.getElementById('newGameBtn')?.addEventListener('click', () => this.newGame());
                document.getElementById('soundBtn')?.addEventListener('click', () => this.toggleSound());
                document.getElementById('undoBtn')?.addEventListener('click', () => this.undoLastMove());
                document.getElementById('extraTurnBtn')?.addEventListener('click', () => this.useSpecialMove());
                
                // Handle window resize
                window.addEventListener('resize', () => this.adjustTokenSizes());
                this.adjustTokenSizes();
            }
            
            adjustTokenSizes() {
                // Dynamically adjust token sizes based on cell size
                const cellWidth = document.querySelector('.board-cell')?.clientWidth || 0;
                if (cellWidth > 0) {
                    const tokenSize = Math.max(Math.min(cellWidth * 0.8, 32), 16);
                    const fontSize = Math.max(Math.min(cellWidth * 0.3, 14), 8);
                    
                    const style = document.createElement('style');
                    style.textContent = `
                        .token {
                            width: ${tokenSize}px;
                            height: ${tokenSize}px;
                            font-size: ${fontSize}px;
                        }
                    `;
                    
                    // Remove any previously added style
                    const oldStyle = document.getElementById('dynamic-token-style');
                    if (oldStyle) oldStyle.remove();
                    
                    style.id = 'dynamic-token-style';
                    document.head.appendChild(style);
                }
            }
            
            setupPlayerTypes() {
                // Set player types based on game mode
                switch (this.settings.gameMode) {
                    case 'multiplayer':
                        this.players.forEach(player => this.playerTypes[player] = 'human');
                        break;
                    case 'ai':
                        this.playerTypes[this.players[0]] = 'human';
                        for (let i = 1; i < this.players.length; i++) {
                            this.playerTypes[this.players[i]] = 'ai';
                        }
                        break;
                    case 'mixed':
                        for (let i = 0; i < this.players.length; i++) {
                            this.playerTypes[this.players[i]] = i < 2 ? 'human' : 'ai';
                        }
                        break;
                }
            }
            
            getGameModeName() {
                const modes = {
                    'multiplayer': 'Multiplayer',
                    'ai': 'VS Computer',
                    'mixed': 'Mixed Mode'
                };
                return modes[this.settings.gameMode] || 'Multiplayer';
            }
            
            generateBoardPositions() {
                // Generate positions for the 52 cells around the board
                const positions = [];
                
                // Red side (bottom horizontal)
                for (let i = 1; i <= 5; i++) positions.push([6, i]);
                
                // Red to blue (right vertical up)
                for (let i = 5; i >= 0; i--) positions.push([i, 6]);
                
                // Blue side (left horizontal)
                positions.push([0, 7]);
                positions.push([0, 8]);
                
                // Blue start
                for (let i = 1; i <= 5; i++) positions.push([i, 8]);
                
                // Blue to yellow (top horizontal right)
                for (let i = 9; i <= 14; i++) positions.push([6, i]);
                
                // Yellow start
                positions.push([7, 14]);
                positions.push([8, 14]);
                
                // Yellow side (right vertical down)
                for (let i = 13; i >= 9; i--) positions.push([8, i]);
                
                // Yellow to green (bottom horizontal left)
                for (let i = 9; i <= 14; i++) positions.push([i, 8]);
                
                // Green start
                positions.push([14, 7]);
                positions.push([14, 6]);
                
                // Green side (left vertical up)
                for (let i = 13; i >= 9; i--) positions.push([i, 6]);
                
                // Green to red (top horizontal left)
                for (let i = 5; i >= 0; i--) positions.push([8, i]);
                
                // Red section finish
                positions.push([7, 0]);
                
                return positions;
            }
            
            createBoard() {
                const board = document.getElementById('ludoBoard');
                board.innerHTML = '';
                
                // Create 15x15 grid
                for (let row = 0; row < 15; row++) {
                    for (let col = 0; col < 15; col++) {
                        const cell = document.createElement('div');
                        cell.className = 'board-cell';
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        
                        // Style the cell based on position
                        this.styleCell(cell, row, col);
                        
                        board.appendChild(cell);
                    }
                }
            }
            
            styleCell(cell, row, col) {
                // Home areas
                if (row < 6 && col < 6) {
                    cell.classList.add('home-red');
                } else if (row < 6 && col > 8) {
                    cell.classList.add('home-blue');
                } else if (row > 8 && col > 8) {
                    cell.classList.add('home-yellow');
                } else if (row > 8 && col < 6) {
                    cell.classList.add('home-green');
                }
                
                // Center area
                if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
                    if (row === 7 && col === 7) {
                        cell.classList.add('center-area');
                        cell.textContent = '🏆';
                    }
                }
                
                // Find path position
                const pathIndex = this.boardPositions.findIndex(pos => pos[0] === row && pos[1] === col);
                if (pathIndex !== -1) {
                    cell.dataset.pathIndex = pathIndex;
                    
                    // Color paths by section
                    if (pathIndex >= 0 && pathIndex < 13) cell.classList.add('path-red');
                    else if (pathIndex >= 13 && pathIndex < 26) cell.classList.add('path-blue');
                    else if (pathIndex >= 26 && pathIndex < 39) cell.classList.add('path-yellow');
                    else if (pathIndex >= 39 && pathIndex < 52) cell.classList.add('path-green');
                    
                    // Mark starting positions
                    if (Object.values(this.startPositions).includes(pathIndex)) {
                        const color = Object.keys(this.startPositions).find(k => this.startPositions[k] === pathIndex);
                        cell.classList.add(`start-${color}`);
                    }
                    
                    // Mark safe zones
                    if (this.safePositions.includes(pathIndex)) {
                        cell.classList.add('safe-zone');
                    }
                }
                
                // Home stretch paths
                for (const [color, positions] of Object.entries(this.homeStretch)) {
                    for (const [index, pos] of positions.entries()) {
                        if (pos[0] === row && pos[1] === col) {
                            cell.classList.add(`path-${color}`);
                            cell.dataset.homeStretch = color;
                            cell.dataset.stretchIndex = index;
                            break;
                        }
                    }
                }
            }
            
            createPlayerCards() {
                const container = document.getElementById('playerCards');
                container.innerHTML = '';
                
                this.players.forEach((color, index) => {
                    const isAI = this.playerTypes[color] === 'ai';
                    const playerEmoji = this.getPlayerEmoji(color);
                    const card = document.createElement('div');
                    card.className = `player-card player-${color} ${index === 0 ? 'active' : ''}`;
                    card.id = `player-${color}`;
                    
                    card.innerHTML = `
                        <div class="player-icon">${playerEmoji}</div>
                        <div class="player-name">${color.charAt(0).toUpperCase() + color.slice(1)} ${isAI ? '(AI)' : ''}</div>
                        <div class="player-stats">
                            <div class="player-stat">
                                <span>Home</span>
                                <span class="stat-value" id="${color}-home">4</span>
                            </div>
                            <div class="player-stat">
                                <span>Finished</span>
                                <span class="stat-value" id="${color}-finished">0</span>
                            </div>
                        </div>
                    `;
                    
                    container.appendChild(card);
                });
            }
            
            getPlayerEmoji(color) {
                return {red: '🔴', blue: '🔵', yellow: '🟡', green: '🟢'}[color];
            }
            
            placeTokens() {
                document.querySelectorAll('.token').forEach(t => t.remove());
                
                this.players.forEach(color => {
                    for (let i = 0; i < 4; i++) {
                        const token = document.createElement('div');
                        token.className = `token token-${color}`;
                        token.id = `token-${color}-${i}`;
                        token.textContent = i + 1;
                        token.addEventListener('click', () => this.selectToken(color, i));
                        
                        const homePos = this.getHomePosition(color, i);
                        const cell = document.querySelector(`[data-row="${homePos[0]}"][data-col="${homePos[1]}"]`);
                        if (cell) cell.appendChild(token);
                    }
                });
            }
            
            getHomePosition(color, index) {
                const positions = {
                    red: [[1, 1], [1, 4], [4, 1], [4, 4]],
                    blue: [[1, 10], [1, 13], [4, 10], [4, 13]],
                    yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
                    green: [[10, 1], [10, 4], [13, 1], [13, 4]]
                };
                return positions[color][index];
            }
            
            updateUI() {
                // Update player cards
                this.players.forEach((color, index) => {
                    const card = document.getElementById(`player-${color}`);
                    if (card) {
                        card.classList.toggle('active', index === this.currentPlayer);
                        
                        // Update token stats
                        const homeCount = this.tokenPositions[color].filter(p => p === -1).length;
                        const finishedCount = this.tokenPositions[color].filter(p => p === 57).length;
                        
                        document.getElementById(`${color}-home`).textContent = homeCount;
                        document.getElementById(`${color}-finished`).textContent = finishedCount;
                    }
                });
                
                // Update action buttons
                const currentColor = this.players[this.currentPlayer];
                
                // Update undo button
                const undoBtn = document.getElementById('undoBtn');
                if (undoBtn) undoBtn.disabled = this.moveHistory.length === 0 || this.canRoll;
                
                // Update special move button
                const extraTurnBtn = document.getElementById('extraTurnBtn');
                if (extraTurnBtn) {
                    extraTurnBtn.disabled = 
                        this.specialMoves[currentColor] <= 0 || this.canRoll || this.isCurrentPlayerAI();
                }
                
                // Check if AI should play
                if (this.isCurrentPlayerAI() && !this.gameFinished && this.canRoll) {
                    setTimeout(() => this.aiTurn(), 1000);
                }
            }
            
            startTurnTimer() {
                this.remainingTime = this.settings.turnTime;
                this.updateTimerDisplay();
                
                clearInterval(this.timer);
                this.timer = setInterval(() => {
                    this.remainingTime--;
                    this.updateTimerDisplay();
                    
                    if (this.remainingTime <= 0) {
                        clearInterval(this.timer);
                        this.handleTimeExpired();
                    }
                }, 1000);
            }
            
            updateTimerDisplay() {
                const timerValue = document.getElementById('timerValue');
                if (!timerValue) return;
                
                timerValue.textContent = this.remainingTime;
                
                const percentage = (this.remainingTime / this.settings.turnTime) * 360;
                const timerDisplay = document.getElementById('timerDisplay');
                
                let color = '#4ecdc4';
                if (this.remainingTime <= 10) {
                    color = '#ef4444';
                    timerDisplay.classList.add('timer-warning');
                } else {
                    timerDisplay.classList.remove('timer-warning');
                }
                
                timerDisplay.style.background = `conic-gradient(${color} ${percentage}deg, #e9ecef ${percentage}deg)`;
            }
            
            handleTimeExpired() {
                const currentColor = this.players[this.currentPlayer];
                this.updateStatus(`Time's up! ${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} player's turn skipped.`);
                
                // Play sound
                this.playSound('timeout');
                
                // Go to next player
                this.nextPlayer();
            }
            
            isCurrentPlayerAI() {
                return this.playerTypes[this.players[this.currentPlayer]] === 'ai';
            }
            
            aiTurn() {
                this.rollDice();
                
                setTimeout(() => {
                    const color = this.players[this.currentPlayer];
                    const movableTokens = this.getMovableTokens(color);
                    
                    if (movableTokens.length > 0) {
                        // AI Strategy
                        let selectedToken = -1;
                        
                        // First priority: Move out of home if possible
                        if (this.diceValue === 6) {
                            const homeTokens = movableTokens.filter(i => this.tokenPositions[color][i] === -1);
                            if (homeTokens.length > 0) {
                                selectedToken = homeTokens[0];
                            }
                        }
                        
                        // Second priority: Try to capture opponent
                        if (selectedToken === -1) {
                            for (const tokenIndex of movableTokens) {
                                const currentPos = this.tokenPositions[color][tokenIndex];
                                if (currentPos >= 0 && currentPos < 52) {
                                    const newPos = (currentPos + this.diceValue) % 52;
                                    if (this.canCaptureAtPosition(newPos, color)) {
                                        selectedToken = tokenIndex;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Third priority: Finish a token if possible
                        if (selectedToken === -1) {
                            for (const tokenIndex of movableTokens) {
                                const currentPos = this.tokenPositions[color][tokenIndex];
                                if (currentPos >= 52 && currentPos < 57 && currentPos + this.diceValue === 57) {
                                    selectedToken = tokenIndex;
                                    break;
                                }
                            }
                        }
                        
                        // Fourth priority: Advance tokens on home stretch
                        if (selectedToken === -1) {
                            const homeStretchTokens = movableTokens.filter(i => {
                                const pos = this.tokenPositions[color][i];
                                return pos >= 52 && pos < 57;
                            });
                            
                            if (homeStretchTokens.length > 0) {
                                selectedToken = homeStretchTokens[0];
                            }
                        }
                        
                        // Final option: Random selection
                        if (selectedToken === -1) {
                            selectedToken = movableTokens[Math.floor(Math.random() * movableTokens.length)];
                        }
                        
                        // Make the move with animation delay
                        setTimeout(() => this.moveToken(color, selectedToken), 500);
                    }
                }, 1000);
            }
            
            canCaptureAtPosition(position, movingColor) {
                if (this.safePositions.includes(position)) return false;
                
                return this.players.some(color => {
                    if (color === movingColor) return false;
                    return this.tokenPositions[color].some(pos => pos === position);
                });
            }
            
            rollDice() {
                if (!this.canRoll || this.gameFinished) return;
                
                const dice = document.getElementById('dice');
                dice.classList.add('rolling');
                document.getElementById('diceResult').textContent = 'Rolling...';
                this.canRoll = false;
                
                this.playSound('dice');
                
                setTimeout(() => {
                                        this.diceValue = Math.floor(Math.random() * 6) + 1;
                    
                    // Use dice number emoji
                    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
                    dice.textContent = diceEmojis[this.diceValue - 1];
                    dice.classList.remove('rolling');
                    document.getElementById('diceResult').textContent = `Rolled: ${this.diceValue}`;
                    
                    this.handleDiceRoll();
                }, 800);
            }
            
            handleDiceRoll() {
                const currentColor = this.players[this.currentPlayer];
                const movableTokens = this.getMovableTokens(currentColor);
                
                if (movableTokens.length === 0) {
                    const playerName = currentColor.charAt(0).toUpperCase() + currentColor.slice(1);
                    this.updateStatus(`No valid moves for ${playerName}!`);
                    
                    setTimeout(() => {
                        if (this.diceValue !== 6) {
                            this.nextPlayer();
                        } else {
                            this.updateStatus(`${playerName} rolled a 6 - roll again!`);
                            this.canRoll = true;
                        }
                    }, 1500);
                } else if (movableTokens.length === 1 && this.isCurrentPlayerAI()) {
                    // AI move will be handled in aiTurn()
                } else if (movableTokens.length === 1) {
                    // Auto-move for single token for human player
                    const playerName = currentColor.charAt(0).toUpperCase() + currentColor.slice(1);
                    this.updateStatus(`Auto-moving ${playerName} token ${movableTokens[0] + 1}...`);
                    
                    setTimeout(() => this.moveToken(currentColor, movableTokens[0]), 800);
                } else {
                    const playerName = currentColor.charAt(0).toUpperCase() + currentColor.slice(1);
                    this.updateStatus(`Select a ${playerName} token to move!`);
                    
                    this.highlightMovableTokens(currentColor, movableTokens);
                }
            }
            
            getMovableTokens(color) {
                const movableTokens = [];
                
                for (let i = 0; i < 4; i++) {
                    const position = this.tokenPositions[color][i];
                    
                    if (position === -1 && this.diceValue === 6) {
                        movableTokens.push(i); // Can move out of home with a 6
                    } else if (position >= 0 && position < 52) {
                        movableTokens.push(i); // Can move along the main board
                    } else if (position >= 52 && position < 57) {
                        if (position + this.diceValue <= 57) {
                            movableTokens.push(i); // Can move in home stretch without overshooting
                        }
                    }
                }
                
                return movableTokens;
            }
            
            highlightMovableTokens(color, tokenIndices) {
                document.querySelectorAll('.token.selected').forEach(t => t.classList.remove('selected'));
                
                tokenIndices.forEach(index => {
                    const token = document.getElementById(`token-${color}-${index}`);
                    if (token) token.classList.add('selected');
                });
            }
            
            selectToken(color, tokenIndex) {
                if (this.players[this.currentPlayer] !== color || this.canRoll || this.gameFinished) return;
                
                const movableTokens = this.getMovableTokens(color);
                if (!movableTokens.includes(tokenIndex)) return;
                
                this.moveToken(color, tokenIndex);
            }
            
            moveToken(color, tokenIndex) {
                const currentPos = this.tokenPositions[color][tokenIndex];
                let newPos;
                let capturedToken = null;
                
                // Save move for undo
                this.moveHistory.push({
                    color: color,
                    tokenIndex: tokenIndex,
                    oldPosition: currentPos,
                    diceValue: this.diceValue
                });
                
                if (currentPos === -1) {
                    // Moving from home
                    newPos = this.startPositions[color];
                    const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                    this.updateStatus(`${playerName} token ${tokenIndex + 1} enters the board!`);
                } else if (currentPos >= 0 && currentPos < 52) {
                    // Moving on main board
                    newPos = (currentPos + this.diceValue) % 52;
                    
                    // Check if entering home stretch
                    const homeEntry = (this.startPositions[color] + 51) % 52;
                    if (this.hasPassedHomeEntry(color, currentPos, this.diceValue)) {
                        const stepsIntoHome = this.getStepsIntoHomeStretch(color, currentPos, this.diceValue);
                        if (stepsIntoHome >= 0 && stepsIntoHome < 5) {
                            newPos = 52 + stepsIntoHome;
                            const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                            this.updateStatus(`${playerName} token ${tokenIndex + 1} enters home stretch!`);
                            this.playSound('homestretch');
                        } else if (stepsIntoHome === 5) {
                            newPos = 57; // Finished
                            const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                            this.updateStatus(`${playerName} token ${tokenIndex + 1} reaches home!`);
                            this.playSound('finish');
                        }
                    }
                    
                    // Check for captures
                    if (newPos >= 0 && newPos < 52 && !this.safePositions.includes(newPos)) {
                        capturedToken = this.checkForCapture(newPos, color);
                        if (capturedToken) {
                            // Add captured token info to move history for undo
                            this.moveHistory[this.moveHistory.length - 1].captured = capturedToken;
                        }
                    }
                } else if (currentPos >= 52 && currentPos < 57) {
                    // Moving in home stretch
                    newPos = currentPos + this.diceValue;
                    if (newPos > 57) {
                        // Cannot overshoot
                        const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                        this.updateStatus(`${playerName} token ${tokenIndex + 1} cannot move that far!`);
                        this.moveHistory.pop(); // Remove from history
                        return;
                    }
                    
                    if (newPos === 57) {
                        const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                        this.updateStatus(`${playerName} token ${tokenIndex + 1} reached home!`);
                        this.playSound('finish');
                    }
                }
                
                // Update position
                this.tokenPositions[color][tokenIndex] = newPos;
                
                // Move token visually
                this.moveTokenVisually(color, tokenIndex, newPos);
                
                // Check for win
                if (this.checkWin(color)) {
                    this.gameFinished = true;
                    const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                    this.updateStatus(`🎉 ${playerName} player wins! 🎉`);
                    this.playConfetti();
                    clearInterval(this.timer);
                    return;
                }
                
                // Next turn
                setTimeout(() => {
                    if (this.diceValue === 6 || newPos === 57) {
                        // Extra turn
                        this.canRoll = true;
                        const playerName = color.charAt(0).toUpperCase() + color.slice(1);
                        this.updateStatus(`${playerName} gets another turn!`);
                        
                        // Reset timer
                        this.startTurnTimer();
                        
                        // Handle AI turn if needed
                        if (this.isCurrentPlayerAI()) {
                            setTimeout(() => this.aiTurn(), 1000);
                        }
                    } else {
                        this.nextPlayer();
                    }
                }, 800);
                
                this.updateUI();
            }
            
            hasPassedHomeEntry(color, currentPos, steps) {
                const homeEntry = (this.startPositions[color] + 51) % 52;
                const newPos = (currentPos + steps) % 52;
                
                if (currentPos <= homeEntry && newPos >= homeEntry) {
                    return true;
                }
                
                // Handling wrapping around the board
                if (currentPos > homeEntry && (currentPos + steps) >= 52 && newPos <= homeEntry) {
                    return true;
                }
                
                return false;
            }
            
            getStepsIntoHomeStretch(color, currentPos, steps) {
                const homeEntry = (this.startPositions[color] + 51) % 52;
                let stepsToHomeEntry;
                
                if (currentPos <= homeEntry) {
                    stepsToHomeEntry = homeEntry - currentPos;
                } else {
                    stepsToHomeEntry = 52 - currentPos + homeEntry;
                }
                
                return steps - stepsToHomeEntry;
            }
            
            checkForCapture(position, movingColor) {
                let capturedInfo = null;
                
                this.players.forEach(color => {
                    if (color === movingColor) return;
                    
                    for (let i = 0; i < 4; i++) {
                        if (this.tokenPositions[color][i] === position) {
                            capturedInfo = {
                                color: color,
                                tokenIndex: i,
                                position: position
                            };
                            
                            // Send token home
                            this.tokenPositions[color][i] = -1;
                            
                            // Add captured effect
                            const token = document.getElementById(`token-${color}-${i}`);
                            if (token) token.classList.add('captured');
                            
                            // Send home visually
                            setTimeout(() => {
                                if (token) token.classList.remove('captured');
                                const homePos = this.getHomePosition(color, i);
                                const homeCell = document.querySelector(`[data-row="${homePos[0]}"][data-col="${homePos[1]}"]`);
                                if (homeCell) homeCell.appendChild(token);
                            }, 500);
                            
                            const fromPlayer = movingColor.charAt(0).toUpperCase() + movingColor.slice(1);
                            const toPlayer = color.charAt(0).toUpperCase() + color.slice(1);
                            this.updateStatus(`${fromPlayer} captured ${toPlayer}'s token!`);
                            this.playSound('capture');
                            
                            return;
                        }
                    }
                });
                
                return capturedInfo;
            }
            
            moveTokenVisually(color, tokenIndex, position) {
                const token = document.getElementById(`token-${color}-${tokenIndex}`);
                if (!token) return;
                
                let targetCell;
                
                if (position === -1) {
                    // Home
                    const homePos = this.getHomePosition(color, tokenIndex);
                    targetCell = document.querySelector(`[data-row="${homePos[0]}"][data-col="${homePos[1]}"]`);
                } else if (position >= 0 && position < 52) {
                    // Main board
                    const [row, col] = this.boardPositions[position];
                    targetCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                } else if (position >= 52 && position < 57) {
                    // Home stretch
                    const [row, col] = this.homeStretch[color][position - 52];
                    targetCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                } else if (position === 57) {
                    // Finished (center)
                    targetCell = document.querySelector('.center-area');
                }
                
                if (targetCell) {
                    targetCell.appendChild(token);
                    this.playSound('move');
                }
            }
            
            checkWin(color) {
                return this.tokenPositions[color].every(p => p === 57);
            }
            
            nextPlayer() {
                this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
                this.canRoll = true;
                const playerName = this.players[this.currentPlayer].charAt(0).toUpperCase() 
                    + this.players[this.currentPlayer].slice(1);
                this.updateStatus(`${playerName} player's turn! Roll the dice.`);
                this.startTurnTimer();
                this.updateUI();
            }
            
            updateStatus(message) {
                document.getElementById('gameStatus').textContent = message;
            }
            
            undoLastMove() {
                if (this.moveHistory.length === 0 || this.canRoll || this.gameFinished) return;
                
                const lastMove = this.moveHistory.pop();
                const { color, tokenIndex, oldPosition, captured } = lastMove;
                
                // Restore token position
                this.tokenPositions[color][tokenIndex] = oldPosition;
                this.moveTokenVisually(color, tokenIndex, oldPosition);
                
                // Restore captured token if any
                if (captured) {
                    const { color: capturedColor, tokenIndex: capturedIndex, position: capturedPosition } = captured;
                    this.tokenPositions[capturedColor][capturedIndex] = capturedPosition;
                    this.moveTokenVisually(capturedColor, capturedIndex, capturedPosition);
                }
                
                this.updateStatus(`Move undone. Continue your turn.`);
                this.playSound('undo');
                this.updateUI();
            }
            
            useSpecialMove() {
                const currentColor = this.players[this.currentPlayer];
                if (this.specialMoves[currentColor] <= 0 || this.canRoll || this.gameFinished) return;
                
                // Use special move - extra turn or teleport
                this.specialMoves[currentColor]--;
                
                // Randomly choose between extra turn and token boost
                const specialType = Math.random() > 0.5 ? 'extraTurn' : 'boost';
                const playerName = currentColor.charAt(0).toUpperCase() + currentColor.slice(1);
                
                if (specialType === 'extraTurn') {
                    this.updateStatus(`${playerName} used special power: Extra Turn!`);
                    this.playSound('special');
                    
                    // Reset timer and allow another roll
                    this.remainingTime = this.settings.turnTime;
                    this.startTurnTimer();
                    this.canRoll = true;
                } else {
                    // Token boost - randomly select a token to move forward 3 spaces
                    const onBoardTokens = [];
                    for (let i = 0; i < 4; i++) {
                        const pos = this.tokenPositions[currentColor][i];
                        if (pos >= 0 && pos < 52) {
                            onBoardTokens.push(i);
                        }
                    }
                    
                    if (onBoardTokens.length > 0) {
                        const tokenIndex = onBoardTokens[Math.floor(Math.random() * onBoardTokens.length)];
                        const currentPos = this.tokenPositions[currentColor][tokenIndex];
                        const boostSteps = 3;
                        
                        this.updateStatus(`${playerName} used special power: Boost token ${tokenIndex + 1} by ${boostSteps} spaces!`);
                        this.playSound('special');
                        
                        // Save current position for undo
                        this.moveHistory.push({
                            color: currentColor,
                            tokenIndex: tokenIndex,
                            oldPosition: currentPos,
                            special: true
                        });
                        
                        // Move token forward
                        const newPos = (currentPos + boostSteps) % 52;
                        this.tokenPositions[currentColor][tokenIndex] = newPos;
                        this.moveTokenVisually(currentColor, tokenIndex, newPos);
                        
                        // Check for captures
                        if (!this.safePositions.includes(newPos)) {
                            const capturedToken = this.checkForCapture(newPos, currentColor);
                            if (capturedToken) {
                                this.moveHistory[this.moveHistory.length - 1].captured = capturedToken;
                            }
                        }
                    } else {
                        this.updateStatus(`${playerName} tried to use special power, but no tokens are on the board!`);
                        this.specialMoves[currentColor]++; // Refund the special move
                    }
                }
                
                this.updateUI();
            }
            
            playConfetti() {
                // Create colorful confetti animation
                const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
                
                for (let i = 0; i < 100; i++) {
                    const confetti = document.createElement('div');
                    confetti.style.position = 'fixed';
                    confetti.style.width = `${Math.random() * 10 + 5}px`;
                    confetti.style.height = `${Math.random() * 10 + 5}px`;
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.top = '-10px';
                    confetti.style.left = `${Math.random() * 100}vw`;
                    confetti.style.zIndex = '9999';
                    confetti.style.borderRadius = `${Math.random() > 0.5 ? '50%' : '3px'}`;
                    confetti.style.opacity = Math.random() * 0.5 + 0.5;
                    confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
                    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                    
                    document.body.appendChild(confetti);
                    
                    confetti.addEventListener('animationend', () => {
                        confetti.remove();
                    });
                }
                
                // Define the animation
                const style = document.createElement('style');
                style.innerHTML = `
                    @keyframes confettiFall {
                        to {
                            transform: translateY(100vh) rotate(${Math.random() * 720}deg);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
                
                // Play celebration sound
                this.playSound('win');
            }
            
            newGame() {
                clearInterval(this.timer);
                
                // Reset token positions
                for (const color of this.players) {
                    for (let i = 0; i < 4; i++) {
                        this.tokenPositions[color][i] = -1;
                    }
                }
                
                // Reset special moves
                for (const color of this.players) {
                    this.specialMoves[color] = 1;
                }
                
                this.moveHistory = [];
                this.currentPlayer = 0;
                this.gameFinished = false;
                this.canRoll = true;
                
                this.placeTokens();
                this.updateUI();
                this.startTurnTimer();
                this.updateStatus("New game started! Roll the dice to begin.");
                this.playSound('newgame');
            }
            
            toggleSound() {
                this.soundEnabled = !this.soundEnabled;
                const soundBtn = document.getElementById('soundBtn');
                if (soundBtn) {
                    soundBtn.innerHTML = 
                        this.soundEnabled ? '<span class="btn-icon">🔊</span> Sound: ON' : 
                                       '<span class="btn-icon">🔇</span> Sound: OFF';
                }
            }
            
            playSound(type) {
                if (!this.soundEnabled) return;
                
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    const frequencies = {
                        dice: [300, 400, 500],
                        move: [500, 600],
                        capture: [700, 500, 300, 200],
                        finish: [600, 800, 1000, 1200],
                        special: [800, 1000, 1200],
                        win: [523, 659, 784, 1047, 1319, 1568],
                        timeout: [400, 350, 300, 250],
                        undo: [500, 300],
                        homestretch: [600, 700, 800],
                        newgame: [400, 600, 800, 1000]
                    };
                    
                    const durations = {
                        dice: 0.15,
                        move: 0.1,
                        capture: 0.15,
                        finish: 0.2,
                        special: 0.15,
                        win: 0.2,
                        timeout: 0.1,
                        undo: 0.1,
                        homestretch: 0.1,
                        newgame: 0.1
                    };
                    
                    const freq = frequencies[type] || [440];
                    const duration = durations[type] || 0.15;
                    
                    freq.forEach((f, index) => {
                        setTimeout(() => {
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();
                            
                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            
                            oscillator.type = type === 'win' ? 'sine' : 
                                            type === 'capture' ? 'sawtooth' : 'triangle';
                            oscillator.frequency.setValueAtTime(f, audioContext.currentTime);
                            
                            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                            
                            oscillator.start(audioContext.currentTime);
                            oscillator.stop(audioContext.currentTime + duration);
                        }, index * (duration * 1000));
                    });
                } catch (e) {
                    console.log('Audio not supported');
                }
            }
        }

        // Loading screen logic
        document.addEventListener('DOMContentLoaded', () => {
            // Setup option selection
            const playerOptions = document.querySelectorAll('.players-options .option-btn');
            const modeOptions = document.querySelectorAll('.mode-options .option-btn');
            
            function setActiveOption(options, selected) {
                options.forEach(opt => opt.classList.remove('active'));
                selected.classList.add('active');
            }
            
            playerOptions.forEach(option => {
                option.addEventListener('click', () => {
                    setActiveOption(playerOptions, option);
                });
            });
            
            modeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    setActiveOption(modeOptions, option);
                });
            });
            
            // Start button
            document.getElementById('startBtn').addEventListener('click', () => {
                const playerCount = document.querySelector('.players-options .active').dataset.players;
                const gameMode = document.querySelector('.mode-options .active').dataset.mode;
                
                // Hide loading screen, show game
                document.getElementById('loadingScreen').classList.add('hide');
                document.getElementById('gameContainer').classList.add('visible');
                
                // Start game
                window.game = new LudoGame({
                    playerCount: parseInt(playerCount),
                    gameMode: gameMode
                });
            });
        });