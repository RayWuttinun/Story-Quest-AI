// Premium Features Module
class PremiumFeatures {
    constructor() {
        this.playerData = {
            level: 1,
            exp: 0,
            gems: 100,
            streak: 0,
            avatar: '🦊',
            powerups: {
                hint: 0,
                skip: 0,
                timeFreeze: 0
            },
            achievements: [],
            lastLogin: null
        };
        
        this.soundEnabled = true;
        this.darkTheme = false;
        this.combo = 0;
        this.timeBonus = 0;
        this.questionTimer = null;
        
        this.achievements = [
            { id: 'first_win', name: 'ชัยชนะครั้งแรก', icon: '🏆', condition: 'ชนะเกมครั้งแรก' },
            { id: 'perfect_score', name: 'คะแนนเต็ม', icon: '💯', condition: 'ได้คะแนนเต็ม 100' },
            { id: 'combo_master', name: 'Combo Master', icon: '🔥', condition: 'Combo x5' },
            { id: 'speed_demon', name: 'เร็วปานสายฟ้า', icon: '⚡', condition: 'ตอบภายใน 5 วินาที' },
            { id: 'week_streak', name: 'สม่ำเสมอ', icon: '📅', condition: 'เล่น 7 วันติดต่อกัน' },
            { id: 'story_master', name: 'นักอ่านตัวยง', icon: '📚', condition: 'เล่นครบทุกหมวด' },
            { id: 'gem_collector', name: 'นักสะสม', icon: '💎', condition: 'สะสม 1000 gems' },
            { id: 'level_10', name: 'ผู้เชี่ยวชาญ', icon: '⭐', condition: 'ถึง Level 10' }
        ];
        
        this.loadPlayerData();
        this.initializeFeatures();
    }
    
    initializeFeatures() {
        // Initialize particles
        this.initParticles();
        
        // Check daily login
        this.checkDailyLogin();
        
        // Start background music
        if (this.soundEnabled) {
            this.playBackgroundMusic();
        }
        
        // Update UI
        this.updatePlayerUI();
        
        // Start daily challenge timer
        this.startDailyChallengeTimer();
    }
    
    initParticles() {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                particles: {
                    number: { value: 80 },
                    color: { value: '#667eea' },
                    shape: { type: 'circle' },
                    opacity: { value: 0.5, random: true },
                    size: { value: 3, random: true },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: 'none',
                        random: true,
                        out_mode: 'out'
                    }
                },
                interactivity: {
                    events: {
                        onhover: { enable: true, mode: 'repulse' },
                        onclick: { enable: true, mode: 'push' }
                    }
                }
            });
        }
    }
    
    loadPlayerData() {
        const saved = localStorage.getItem('premiumPlayerData');
        if (saved) {
            this.playerData = { ...this.playerData, ...JSON.parse(saved) };
        }
    }
    
    savePlayerData() {
        localStorage.setItem('premiumPlayerData', JSON.stringify(this.playerData));
    }
    
    checkDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = this.playerData.lastLogin;
        
        if (lastLogin !== today) {
            this.playerData.lastLogin = today;
            this.playerData.gems += 50;
            this.playerData.streak++;
            
            // Show daily bonus
            const dailyBonus = document.getElementById('dailyBonus');
            if (dailyBonus) {
                dailyBonus.style.display = 'block';
                setTimeout(() => {
                    dailyBonus.style.display = 'none';
                }, 3000);
            }
            
            // Check streak achievement
            if (this.playerData.streak >= 7) {
                this.unlockAchievement('week_streak');
            }
            
            this.savePlayerData();
            this.updatePlayerUI();
        }
    }
    
    updatePlayerUI() {
        // Update level
        const levelEl = document.getElementById('playerLevel');
        if (levelEl) levelEl.textContent = this.playerData.level;
        
        // Update gems
        const gemsEl = document.getElementById('playerGems');
        if (gemsEl) gemsEl.textContent = this.playerData.gems;
        
        // Update streak
        const streakEl = document.getElementById('playerStreak');
        if (streakEl) streakEl.textContent = this.playerData.streak;
        
        // Update level progress
        const expNeeded = this.playerData.level * 100;
        const progress = (this.playerData.exp % expNeeded) / expNeeded * 100;
        const progressEl = document.getElementById('levelProgress');
        if (progressEl) progressEl.style.width = `${progress}%`;
    }
    
    startQuestionTimer(duration = 30) {
        const timerBar = document.getElementById('timerBar');
        const timerFill = document.getElementById('timerFill');
        const timerText = document.getElementById('timerText');
        
        if (!timerBar) return;
        
        timerBar.style.display = 'block';
        let timeLeft = duration;
        
        if (this.questionTimer) clearInterval(this.questionTimer);
        
        this.questionTimer = setInterval(() => {
            timeLeft--;
            const percentage = (timeLeft / duration) * 100;
            
            timerFill.style.width = `${percentage}%`;
            timerText.textContent = `${timeLeft}s`;
            
            // Change color based on time left
            if (timeLeft <= 10) {
                timerFill.style.background = 'linear-gradient(90deg, #f56565 0%, #e53e3e 100%)';
            } else if (timeLeft <= 20) {
                timerFill.style.background = 'linear-gradient(90deg, #ed8936 0%, #dd6b20 100%)';
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.questionTimer);
                this.onTimeUp();
            }
        }, 1000);
        
        // Calculate time bonus
        this.timeBonus = timeLeft;
    }
    
    stopQuestionTimer() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
    }
    
    onTimeUp() {
        // Auto select wrong answer
        this.combo = 0;
        this.updateComboUI();
        if (window.nextQuestion) {
            window.nextQuestion();
        }
    }
    
    calculateScore(isCorrect, baseScore = 10) {
        if (!isCorrect) {
            this.combo = 0;
            this.updateComboUI();
            return 0;
        }
        
        // Increase combo
        this.combo++;
        this.updateComboUI();
        
        // Calculate score with bonuses
        let totalScore = baseScore;
        
        // Combo bonus
        const comboMultiplier = Math.min(this.combo, 5);
        totalScore *= comboMultiplier;
        
        // Time bonus
        if (this.timeBonus > 25) {
            totalScore += 5;
            this.unlockAchievement('speed_demon');
        } else if (this.timeBonus > 20) {
            totalScore += 3;
        } else if (this.timeBonus > 15) {
            totalScore += 1;
        }
        
        // Add gems
        this.playerData.gems += Math.floor(totalScore / 10);
        
        // Add exp
        this.addExperience(totalScore);
        
        // Check combo achievement
        if (this.combo >= 5) {
            this.unlockAchievement('combo_master');
        }
        
        return totalScore;
    }
    
    updateComboUI() {
        const comboEl = document.getElementById('combo');
        if (comboEl) {
            comboEl.textContent = `x${Math.max(1, this.combo)}`;
            if (this.combo > 1) {
                comboEl.parentElement.classList.add('pulse');
                this.showComboIndicator();
            }
        }
    }
    
    showComboIndicator() {
        const indicator = document.getElementById('comboIndicator');
        if (indicator) {
            indicator.textContent = `COMBO x${this.combo}!`;
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1000);
        }
    }
    
    addExperience(exp) {
        this.playerData.exp += exp;
        const expNeeded = this.playerData.level * 100;
        
        if (this.playerData.exp >= expNeeded) {
            this.levelUp();
        }
        
        this.updatePlayerUI();
        this.savePlayerData();
    }
    
    levelUp() {
        this.playerData.level++;
        this.playerData.gems += 100; // Level up bonus
        
        // Show level up animation
        this.showNotification(`🎉 Level Up! ถึง Level ${this.playerData.level} แล้ว!`);
        
        // Check level achievement
        if (this.playerData.level >= 10) {
            this.unlockAchievement('level_10');
        }
        
        this.playSound('levelup');
    }
    
    useHint() {
        if (this.playerData.powerups.hint > 0) {
            this.playerData.powerups.hint--;
            // Implement hint logic
            this.showNotification('💡 คำใบ้: ลองอ่านนิทานอีกครั้ง');
            this.playSound('powerup');
        } else {
            this.showNotification('❌ ไม่มีคำใบ้');
        }
    }
    
    skipQuestion() {
        if (this.playerData.powerups.skip > 0) {
            this.playerData.powerups.skip--;
            if (window.nextQuestion) {
                window.nextQuestion();
            }
            this.playSound('powerup');
        } else {
            this.showNotification('❌ ไม่มีไอเทมข้าม');
        }
    }
    
    buyPowerup(type) {
        const costs = {
            hint: 30,
            skip: 40,
            timeFreeze: 50
        };
        
        const cost = costs[type];
        if (this.playerData.gems >= cost) {
            this.playerData.gems -= cost;
            this.playerData.powerups[type] = (this.playerData.powerups[type] || 0) + 1;
            this.updatePlayerUI();
            this.savePlayerData();
            this.showNotification(`✅ ซื้อไอเทมสำเร็จ!`);
            this.playSound('purchase');
        } else {
            this.showNotification(`❌ Gems ไม่พอ (ต้องการ ${cost} 💎)`);
        }
    }
    
    unlockAchievement(achievementId) {
        if (!this.playerData.achievements.includes(achievementId)) {
            this.playerData.achievements.push(achievementId);
            const achievement = this.achievements.find(a => a.id === achievementId);
            
            if (achievement) {
                this.showAchievementUnlock(achievement);
                this.playerData.gems += 50; // Achievement reward
                this.savePlayerData();
                this.updatePlayerUI();
            }
        }
    }
    
    showAchievementUnlock(achievement) {
        const unlockEl = document.getElementById('achievementUnlock');
        const nameEl = document.getElementById('achievementName');
        
        if (unlockEl && nameEl) {
            nameEl.textContent = `${achievement.icon} ${achievement.name}`;
            unlockEl.style.display = 'block';
            this.playSound('achievement');
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    playSound(type) {
        if (!this.soundEnabled) return;
        
        const sounds = {
            correct: [523.25, 659.25, 783.99],
            wrong: [220, 196],
            powerup: [440, 523.25, 659.25],
            purchase: [523.25, 783.99],
            achievement: [523.25, 659.25, 783.99, 1046.50],
            levelup: [523.25, 659.25, 783.99, 1046.50, 1318.51]
        };
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const frequencies = sounds[type] || sounds.correct;
        
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime + index * 0.1);
            oscillator.stop(audioContext.currentTime + 0.5);
        });
    }
    
    playBackgroundMusic() {
        const bgMusic = document.getElementById('bgMusic');
        if (bgMusic && this.soundEnabled) {
            bgMusic.volume = 0.3;
            bgMusic.play().catch(e => console.log('Auto-play prevented'));
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const icon = document.getElementById('soundIcon');
        const bgMusic = document.getElementById('bgMusic');
        
        if (this.soundEnabled) {
            icon.className = 'fas fa-volume-up';
            this.playBackgroundMusic();
        } else {
            icon.className = 'fas fa-volume-mute';
            if (bgMusic) bgMusic.pause();
        }
    }
    
    toggleTheme() {
        this.darkTheme = !this.darkTheme;
        const icon = document.getElementById('themeIcon');
        
        if (this.darkTheme) {
            document.body.classList.add('dark-theme');
            icon.className = 'fas fa-sun';
        } else {
            document.body.classList.remove('dark-theme');
            icon.className = 'fas fa-moon';
        }
    }
    
    startDailyChallengeTimer() {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const timeLeft = tomorrow - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            const timerEl = document.getElementById('challengeTimer');
            if (timerEl) {
                timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }
    
    shareResult() {
        const score = gameState.currentScore;
        const text = `🎮 ฉันได้ ${score} คะแนนใน Story Quest Premium! มาท้าแข่งกันไหม? 📚✨`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Story Quest Premium',
                text: text,
                url: window.location.href
            });
        } else {
            // Fallback to Twitter
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
        }
    }
}

// Initialize premium features
const premium = new PremiumFeatures();

// Global functions
window.toggleTheme = () => premium.toggleTheme();
window.toggleSound = () => premium.toggleSound();
window.buyPowerup = (type) => premium.buyPowerup(type);
window.useHint = () => premium.useHint();
window.skipQuestion = () => premium.skipQuestion();
window.shareResult = () => premium.shareResult();
window.selectAvatar = (avatar) => {
    premium.playerData.avatar = avatar;
    premium.savePlayerData();
    
    // Update UI
    document.querySelectorAll('.avatar-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.avatar === avatar) {
            item.classList.add('selected');
        }
    });
    
    const avatarDisplay = document.getElementById('playerAvatar');
    if (avatarDisplay) avatarDisplay.textContent = avatar;
};

window.showTutorial = () => {
    document.getElementById('tutorialModal').style.display = 'block';
};

window.closeTutorial = () => {
    document.getElementById('tutorialModal').style.display = 'none';
};

window.showAchievements = () => {
    const modal = document.getElementById('achievementModal');
    const grid = document.getElementById('achievementGrid');
    
    grid.innerHTML = '';
    premium.achievements.forEach(achievement => {
        const unlocked = premium.playerData.achievements.includes(achievement.id);
        const div = document.createElement('div');
        div.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `
            <i>${achievement.icon}</i>
            <h4>${achievement.name}</h4>
            <p>${achievement.condition}</p>
        `;
        grid.appendChild(div);
    });
    
    modal.style.display = 'block';
};

window.closeAchievements = () => {
    document.getElementById('achievementModal').style.display = 'none';
};

window.startDailyChallenge = () => {
    // Set special mode
    gameState.isDailyChallenge = true;
    gameState.scoreMultiplier = 2;
    showCategories();
};

window.showLeaderboardTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load leaderboard data for selected tab
    // Implementation depends on backend
};

// Export for game.js
window.premium = premium;