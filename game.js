// Game State
let gameState = {
    currentPlayer: '',
    currentScore: 0,
    currentCategory: '',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    questions: [],
    answeredQuestions: 0,
    isAIReady: false,
    isDailyChallenge: false,
    scoreMultiplier: 1
};

// Initialize game
document.addEventListener('DOMContentLoaded', async function() {
    await checkAIConnection();
    createFloatingEmojis();
});

async function checkAIConnection() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    
    const isConnected = await aiService.checkConnection();
    
    if (isConnected) {
        statusDot.classList.add('online');
        statusText.textContent = 'AI พร้อมใช้งาน ✅';
        gameState.isAIReady = true;
    } else {
        statusDot.classList.add('offline');
        statusText.textContent = 'AI ไม่พร้อม ❌ (ตรวจสอบ LM Studio)';
        gameState.isAIReady = false;
    }
}

function startGame() {
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) {
        alert('กรุณากรอกชื่อผู้เล่น! 😊');
        return;
    }
    
    if (!gameState.isAIReady) {
        alert('AI ยังไม่พร้อม กรุณาตรวจสอบ LM Studio');
        return;
    }
    
    gameState.currentPlayer = nameInput;
    showCategories();
}

function showWelcome() {
    hideAllScreens();
    document.querySelector('.welcome-screen').classList.add('active');
}

function showCategories() {
    hideAllScreens();
    document.querySelector('.category-screen').classList.add('active');
    renderCategories();
    resetGame();
}

function renderCategories() {
    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = '';
    
    for (const [key, category] of Object.entries(STORY_CATEGORIES)) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.background = category.color;
        card.onclick = () => selectCategory(key);
        card.innerHTML = `
            <h3>${category.name}</h3>
            <p>${category.description}</p>
        `;
        grid.appendChild(card);
    }
}

async function selectCategory(categoryKey) {
    gameState.currentCategory = categoryKey;
    
    showLoadingOverlay(true);
    hideAllScreens();
    document.querySelector('.game-screen').classList.add('active');
    
    try {
        // Generate questions using AI
        gameState.questions = await aiService.generateQuestionSet(categoryKey);
        showLoadingOverlay(false);
        startGamePlay();
    } catch (error) {
        console.error('Error generating questions:', error);
        alert('เกิดข้อผิดพลาดในการสร้างคำถาม กรุณาลองใหม่');
        showCategories();
    }
}

function updateLoadingProgress(current, total) {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    text.textContent = `AI กำลังสร้างคำถาม... (${current}/${total})`;
}

window.updateLoadingProgress = updateLoadingProgress;

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function startGamePlay() {
    document.getElementById('playerDisplay').textContent = `👤 ${gameState.currentPlayer}`;
    
    // Set avatar
    if (window.premium && window.premium.playerData.avatar) {
        document.getElementById('playerAvatar').textContent = window.premium.playerData.avatar;
    }
    
    // Reset game stats
    gameState.currentQuestionIndex = 0;
    gameState.answeredQuestions = 0;
    document.getElementById('lives').textContent = '3';
    
    // Update premium UI
    if (window.premium) {
        window.premium.updatePlayerUI();
        window.premium.combo = 0;
        window.premium.updateComboUI();
    }
    
    showQuestion();
}

function showQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame();
        return;
    }

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

    // Update UI
    document.getElementById('storyTitle').textContent = currentQuestion.story.title;
    document.getElementById('storyText').textContent = currentQuestion.story.content;
    document.getElementById('questionText').textContent = `❓ ${currentQuestion.question}`;
    
    // Update progress bar
    const progress = ((gameState.currentQuestionIndex + 1) / gameState.totalQuestions) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.querySelector('.progress-text').textContent = `${gameState.currentQuestionIndex + 1}/${gameState.totalQuestions}`;

    // Show options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    currentQuestion.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        optionDiv.onclick = () => selectAnswer(index, optionDiv);
        optionsContainer.appendChild(optionDiv);
    });

    document.getElementById('nextBtn').style.display = 'none';
    
    // Start timer for premium
    if (window.premium) {
        window.premium.startQuestionTimer();
    }
}

function selectAnswer(selectedIndex, optionElement) {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct;
    
    // Stop timer
    if (window.premium) {
        window.premium.stopQuestionTimer();
    }

    // Disable all options
    const allOptions = document.querySelectorAll('.option');
    allOptions.forEach(opt => opt.style.pointerEvents = 'none');

    // Calculate score with premium features
    let scoreEarned = 0;
    if (window.premium) {
        scoreEarned = window.premium.calculateScore(isCorrect);
        // Apply daily challenge multiplier
        if (gameState.isDailyChallenge) {
            scoreEarned *= gameState.scoreMultiplier;
        }
        gameState.currentScore += scoreEarned;
    } else {
        // Fallback
        if (isCorrect) {
            scoreEarned = 10;
            gameState.currentScore += scoreEarned;
        }
    }

    // Show result
    if (isCorrect) {
        optionElement.classList.add('correct');
        document.getElementById('currentScore').textContent = gameState.currentScore;
        showFeedback(`✨ ถูกต้อง! +${scoreEarned} คะแนน`, true);
        if (window.premium) window.premium.playSound('correct');
    } else {
        optionElement.classList.add('wrong');
        allOptions[currentQuestion.correct].classList.add('correct');
        showFeedback('❌ ไม่ถูกต้อง ลองใหม่นะ!', false);
        if (window.premium) window.premium.playSound('wrong');
        
        // Reduce lives
        const livesEl = document.getElementById('lives');
        if (livesEl) {
            let lives = parseInt(livesEl.textContent);
            lives = Math.max(0, lives - 1);
            livesEl.textContent = lives;
            
            if (lives === 0) {
                // Game over
                setTimeout(() => endGame(), 1000);
                return;
            }
        }
    }

    gameState.answeredQuestions++;
    document.getElementById('nextBtn').style.display = 'inline-block';
}

function nextQuestion() {
    gameState.currentQuestionIndex++;
    showQuestion();
}

function endGame() {
    hideAllScreens();
    document.querySelector('.result-screen').classList.add('active');
    
    const percentage = (gameState.currentScore / (gameState.totalQuestions * 10)) * 100;
    document.getElementById('finalScore').textContent = `${gameState.currentScore} / ${gameState.totalQuestions * 10}`;
    
    // Calculate rewards
    const gemsEarned = Math.floor(gameState.currentScore / 5);
    const expEarned = gameState.currentScore;
    
    document.getElementById('gemsEarned').textContent = `+${gemsEarned}`;
    document.getElementById('expEarned').textContent = expEarned;
    
    if (window.premium) {
        window.premium.playerData.gems += gemsEarned;
        window.premium.addExperience(expEarned);
        
        // Check achievements
        if (percentage === 100) {
            window.premium.unlockAchievement('perfect_score');
        }
        if (!localStorage.getItem('firstWin')) {
            window.premium.unlockAchievement('first_win');
            localStorage.setItem('firstWin', 'true');
        }
    }
    
    let message = '';
    let emoji = '';
    if (percentage >= 80) {
        message = 'ยอดเยี่ยมมาก! 🌟';
        emoji = '🏆';
    } else if (percentage >= 60) {
        message = 'ดีมาก! 👍';
        emoji = '🥈';
    } else if (percentage >= 40) {
        message = 'พยายามดี! 💪';
        emoji = '🥉';
    } else {
        message = 'ลองใหม่นะ! 🌈';
        emoji = '🌱';
    }
    
    document.getElementById('resultMessage').innerHTML = `${emoji} ${message}`;
    
    // Show random moral
    const morals = gameState.questions.map(q => q.moral);
    const randomMoral = morals[Math.floor(Math.random() * morals.length)];
    document.getElementById('moralText').textContent = randomMoral;
    
    saveScore();
    
    // Reset daily challenge
    gameState.isDailyChallenge = false;
    gameState.scoreMultiplier = 1;
}

function saveScore() {
    const scores = JSON.parse(localStorage.getItem('storyGameScores') || '[]');
    scores.push({
        name: gameState.currentPlayer,
        score: gameState.currentScore,
        date: new Date().toLocaleDateString('th-TH')
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('storyGameScores', JSON.stringify(scores.slice(0, 10)));
}

function showLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const leaderboardList = document.getElementById('leaderboardList');
    const scores = JSON.parse(localStorage.getItem('storyGameScores') || '[]');
    
    leaderboardList.innerHTML = '';
    scores.slice(0, 5).forEach((score, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span>${index + 1}. ${score.name}</span>
            <span>${score.score} คะแนน</span>
        `;
        leaderboardList.appendChild(item);
    });
    
    leaderboard.style.display = 'block';
}

function resetGame() {
    gameState.currentScore = 0;
    gameState.currentQuestionIndex = 0;
    gameState.answeredQuestions = 0;
    document.getElementById('currentScore').textContent = '0';
}

function hideAllScreens() {
    document.querySelectorAll('.welcome-screen, .category-screen, .game-screen, .result-screen')
        .forEach(screen => screen.classList.remove('active'));
}

// Utility functions
function showFeedback(message, isCorrect) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${isCorrect ? '#48bb78' : '#f56565'};
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 1.5em;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 2000);
}

function createFloatingEmojis() {
    const emojis = ['📚', '✨', '🌟', '💫', '🦋', '🌈'];
    setInterval(() => {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.left = Math.random() * window.innerWidth + 'px';
        emoji.style.animationDuration = (Math.random() * 5 + 10) + 's';
        document.body.appendChild(emoji);
        
        setTimeout(() => emoji.remove(), 15000);
    }, 3000);
}

function playSound(type) {
    // เสียงเอฟเฟกต์ (ใช้ Web Audio API)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'correct') {
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    } else {
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
        oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.1); // G3
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}