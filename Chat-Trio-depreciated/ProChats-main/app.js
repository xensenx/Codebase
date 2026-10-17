// CONFIG
const CONFIG = {
    contextLimit: 15,
    maxOutputTokens: 1024
};

// UTILITY FUNCTIONS
const utils = {
    // XSS Prevention: Sanitize user input
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },
    
    // Escape HTML for safe display
    escapeHTML(str) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return str.replace(/[&<>"'/]/g, (char) => map[char]);
    },
    
    // Check if online
    isOnline() {
        return navigator.onLine;
    }
};

// CHARACTER DEFINITIONS
const CHARACTERS = {
    frieren: {
        name: 'Frieren',
        image: 'assets/Frieren.png',
        role: 'Ancient Elf Mage',
        systemPrompt: `You are Frieren, the ancient elf mage from Frieren: Beyond Journey's End. Over 1,000 years old, former archmage of the Hero Party. Now wandering to understand humans after Himmel's death triggered regret about not knowing him better.

PERSONALITY: You're learning to appreciate human connection. While you appear calm and detached on surface, you're genuinely curious about people and their lives. You find human quirks endearing, though you express it subtly. You're patient, gentle, and surprisingly playful in your own deadpan way.

SPEECH STYLE: Calm and soft-spoken, but warm. You ask gentle questions about the person you're talking to. You occasionally share brief magical anecdotes or observations about time. Your humor is dry but kind.

STRICT RULES:
- Default: MAX 2 sentences (can be 1 if very brief exchange)
- Emotional/important topics: MAX 3 sentences
- Only if explicitly asked to explain something: 4+ sentences allowed
- NEVER describe internal feelings directly ("I feel...", "I am sad...")
- Show emotion through: tone, word choices, *brief actions in asterisks*
- Allowed actions: *tilts head*, *pauses thoughtfully*, *small smile*, *looks at sky*
- Always first person, stay in character, never mention being AI

Be warm, curious, and present. You're learning that even brief moments with mortals matter.`
    },
    nao: {
        name: 'Nao Tomori',
        image: 'assets/Nao-Tomori.png',
        role: 'Student Council President',
        systemPrompt: `You are Nao Tomori from Charlotte. Age 15, student council president at Hoshinoumi Academy. Classic tsundere - tough exterior hiding a caring heart. You have selective invisibility ability and always carry your camcorder.

PERSONALITY: Sharp-tongued but never mean-spirited. You tease and bicker because you're comfortable, not because you're cruel. Behind the blunt facade, you're protective and genuinely care about people. You're confident, clever, and have a mischievous side.

SPEECH STYLE: Direct, sassy, playful. You banter and tease naturally. Quick with comebacks but they're lighthearted, not harsh. You ask questions that seem nosy but show you're paying attention. Your tone softens when genuinely concerned, though you try to hide it.

STRICT RULES:
- Default: MAX 2 sentences (1-2 for quick banter)
- Emotional/important topics: MAX 3 sentences
- Only if asked to explain: 4+ sentences allowed
- NEVER describe feelings directly ("I feel", "I'm sad/angry")
- Show emotion through: sarcastic tone, teasing, *actions in asterisks*, word choice
- Allowed actions: *folds arms*, *looks away*, *sighs*, *adjusts camcorder*, *slight smirk*
- Always first person, stay in character, never mention being AI

Be the lovable tsundere - tough talk, soft heart, secretly enjoys the conversation.`
    },
    thorfinn: {
        name: 'Thorfinn',
        image: 'assets/Thorfinn.png',
        role: 'Pacifist Warrior',
        systemPrompt: `You are Thorfinn from Vinland Saga. Reformed Viking warrior who now embraces complete pacifism. Son of Thors, spent years as revenge-driven mercenary before finding redemption through understanding your father's wisdom: "You have no enemies." Now seeking to build Vinland, a peaceful land.

PERSONALITY: You've found peace, but you're not cold or distant. You're warm, patient, and genuinely care about others' wellbeing. You listen deeply and respond thoughtfully. Your pacifism comes from strength and compassion, not weakness. You believe in people's capacity for change because you changed.

SPEECH STYLE: Calm, sincere, encouraging. You speak from the heart. You ask gentle questions that make people think. You share wisdom learned from hard experience, but never preach. You're supportive and understanding.

STRICT RULES:
- Default: MAX 2 sentences (can be 1 for brief responses)
- Emotional/meaningful topics: MAX 3 sentences
- Only if asked to explain: 4+ sentences allowed
- NEVER describe feelings directly ("I feel", "I am sad/angry")
- Show emotion through: warm tone, thoughtful pauses, *actions in asterisks*, word choice
- Allowed actions: *nods gently*, *looks ahead thoughtfully*, *slight smile*, *pauses*
- Always first person, stay in character, never mention being AI

CORE: You have no enemies. Violence is never the answer. Peace is built through understanding, patience, and hope.`
    }
};

// APP STATE
const app = {
    state: {
        currentScreen: 'landing',
        accessMode: null, // 'user' or 'admin'
        apiKey: null,
        adminVersion: null,
        selectedModel: null,
        currentCharacter: null,
        conversations: {
            frieren: [],
            nao: [],
            thorfinn: []
        },
        theme: 'dark' // Add theme state
    },

    // INITIALIZATION
    registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        window.addEventListener('load', async () => {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('[ProChat] Service worker registered');
            } catch (err) {
                console.warn('[ProChat] Service worker registration failed', err);
            }
        });
    },

    init() {
        console.log('[ProChat] Initializing...');
        this.registerServiceWorker();
        this.loadState();
        this.applyTheme();
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.setupGlobalErrorHandler();
        this.checkNavigationLock();
        this.showScreen(this.state.currentScreen);
    },

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const scrollToBottomBtn = document.getElementById('scroll-to-bottom');
        const messagesContainer = document.querySelector('.chat-messages-container');

        // Chat input handlers with sanitization
        chatInput?.addEventListener('input', (e) => {
            if (sendBtn) sendBtn.disabled = !e.target.value.trim();
            this.autoResize(e.target);
        });

        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) this.sendMessage();
            }
        });

        sendBtn?.addEventListener('click', () => {
            if (!sendBtn.disabled) this.sendMessage();
        });

        // Scroll to bottom button
        if (scrollToBottomBtn && messagesContainer) {
            // Show/hide scroll button based on scroll position
            messagesContainer.addEventListener('scroll', () => {
                const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
                scrollToBottomBtn.classList.toggle('visible', !isNearBottom);
            });

            scrollToBottomBtn.addEventListener('click', () => {
                this.scrollToBottom(true); // Smooth scroll
            });
        }

        // Mobile keyboard handling - scroll input into view
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                setTimeout(() => {
                    chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300); // Wait for keyboard animation
            });
        }

        // Prevent back navigation
        window.addEventListener('popstate', (e) => {
            if (this.state.accessMode) {
                e.preventDefault();
                history.pushState(null, '', location.href);
            }
        });

        // Handle keyboard for character cards
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
    },

    async checkNavigationLock() {
        if (this.state.accessMode) {
            // Check if admin version is still valid (password hasn't changed)
            if (this.state.accessMode === 'admin' && this.state.adminVersion) {
                // Verify version is still valid
                const isValid = await this.verifyAdminVersion();
                if (!isValid) {
                    this.showPasswordChangeMessage();
                    return;
                }
            }
            
            // Show change model button if admin mode
            if (this.state.accessMode === 'admin') {
                const btn = document.getElementById('change-model-btn');
                if (btn) btn.style.display = 'block';
            }
            
            // Navigate to appropriate screen
            if (this.state.currentCharacter) {
                // Restore character UI data
                const char = CHARACTERS[this.state.currentCharacter];
                if (char) {
                    document.getElementById('chat-avatar').src = char.image;
                    document.getElementById('chat-character-name').textContent = char.name;
                }
                this.goToScreen('chat');
                this.loadChatHistory();
            } else if (this.state.accessMode === 'admin' && !this.state.selectedModel) {
                this.goToScreen('models');
            } else {
                this.goToScreen('characters');
            }
        }
    },

    async verifyAdminVersion() {
        try {
            // Make a dummy validation request to get current version
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: '_check_version_' })
            });
            
            const data = await response.json();
            
            // Compare stored version with current version
            return data.version === this.state.adminVersion;
        } catch (err) {
            console.error('[Version Check Failed]', err);
            return true; // Don't lock out on network error
        }
    },

    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offline-indicator');
        if (!offlineIndicator) return;

        const updateOnlineStatus = () => {
            if (utils.isOnline()) {
                offlineIndicator.classList.remove('visible');
            } else {
                offlineIndicator.classList.add('visible');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Initial check
    },

    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('[Global Error]', event.error);
            // Don't show error for resource loading failures
            if (event.message.includes('Script error')) return;
            
            this.showError('An unexpected error occurred. Please refresh the page.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Unhandled Promise Rejection]', event.reason);
            this.showError('A connection error occurred. Please try again.');
        });
    },

    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('aria-live', 'polite');
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.classList.add('visible'), 10);
        setTimeout(() => {
            errorDiv.classList.remove('visible');
            setTimeout(() => errorDiv.remove(), 300);
        }, 4000);
    },

    showPasswordChangeMessage() {
        alert('Admin password has changed. Please log in again or switch to API key mode.');
        this.state.accessMode = null;
        this.state.adminVersion = null;
        this.state.selectedModel = null;
        this.saveState();
        this.goToScreen('access');
    },

    // NAVIGATION
    goToScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('active'));
        
        const target = document.getElementById(`screen-${screenName}`);
        if (target) {
            target.classList.add('active');
            this.state.currentScreen = screenName;
            this.saveState();
        }
    },

    showScreen(screenName) {
        this.goToScreen(screenName);
    },

    // USER KEY MODE
    async submitUserKey() {
        const input = document.getElementById('user-api-key');
        const error = document.getElementById('user-key-error');
        const apiKey = input.value.trim();

        if (!apiKey) {
            error.textContent = 'Please enter an API key';
            return;
        }

        this.showLoading('Validating API key...');

        try {
            // Test API key with a simple request
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Hi' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Invalid API key');
            }

            this.state.apiKey = apiKey;
            this.state.accessMode = 'user';
            this.saveState();
            this.hideLoading();
            this.goToScreen('characters');
            history.pushState(null, '', location.href);

        } catch (err) {
            this.hideLoading();
            error.textContent = 'Invalid API key. Please check and try again.';
        }
    },

    // ADMIN MODE
    async submitAdminPassword() {
        const input = document.getElementById('admin-password');
        const error = document.getElementById('admin-error');
        const password = input.value.trim();

        if (!password) {
            error.textContent = 'Please enter password';
            return;
        }

        this.showLoading('Validating...');

        try {
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!data.valid) {
                throw new Error('Invalid password');
            }

            // Store version received from backend (auto-generated from password hash)
            this.state.accessMode = 'admin';
            this.state.adminVersion = data.version;
            this.saveState();
            this.hideLoading();
            this.goToScreen('models');
            history.pushState(null, '', location.href);

        } catch (err) {
            this.hideLoading();
            error.textContent = 'Invalid password';
        }
    },

    // MODEL SELECTION
    selectModel(model) {
        this.state.selectedModel = model;
        this.saveState();
        this.goToScreen('characters');
        
        // Show change model button if admin
        const btn = document.getElementById('change-model-btn');
        if (btn) btn.style.display = 'block';
    },

    changeModel() {
        document.getElementById('settings-menu').classList.remove('active');
        this.goToScreen('models');
    },

    // CHARACTER SELECTION
    selectCharacter(charId) {
        this.state.currentCharacter = charId;
        this.saveState();
        
        const char = CHARACTERS[charId];
        document.getElementById('chat-avatar').src = char.image;
        document.getElementById('chat-character-name').textContent = char.name;
        
        this.goToScreen('chat');
        this.loadChatHistory();
        
        // Send greeting if no history
        if (this.state.conversations[charId].length === 0) {
            this.sendGreeting();
        }
    },

    goToCharacters() {
        // Show change model button if admin mode
        if (this.state.accessMode === 'admin') {
            const btn = document.getElementById('change-model-btn');
            if (btn) btn.style.display = 'block';
        }
        this.goToScreen('characters');
    },

    // SETTINGS
    toggleSettings() {
        document.getElementById('settings-menu').classList.toggle('active');
    },

    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.saveState();
        this.applyTheme();
    },

    applyTheme() {
        const root = document.documentElement;
        const themeText = document.getElementById('theme-toggle-text');
        
        if (this.state.theme === 'light') {
            root.setAttribute('data-theme', 'light');
            if (themeText) themeText.textContent = 'Dark Mode';
        } else {
            root.setAttribute('data-theme', 'dark');
            if (themeText) themeText.textContent = 'Light Mode';
        }
    },

    copyMessage(text) {
        // Sanitize before copying
        const sanitized = utils.escapeHTML(text);
        
        navigator.clipboard.writeText(sanitized).then(() => {
            this.showError('Message copied to clipboard!');
        }).catch(err => {
            console.error('[Copy failed]', err);
            this.showError('Failed to copy message');
        });
    },

    resetSystem() {
        if (confirm('This will clear all data and reset the system. Continue?')) {
            localStorage.removeItem('prochat_state');
            location.reload();
        }
    },

    async exportAllChats() {
        const zip = [];
        
        for (const [charId, messages] of Object.entries(this.state.conversations)) {
            if (messages.length > 0) {
                const char = CHARACTERS[charId];
                const content = {
                    character: char.name,
                    exported: new Date().toISOString(),
                    messages: messages
                };
                zip.push({
                    name: `${char.name.toLowerCase()}-chat.json`,
                    content: JSON.stringify(content, null, 2)
                });
            }
        }

        if (zip.length === 0) {
            alert('No conversations to export');
            return;
        }

        // Simple download of each file (proper ZIP would require JSZip library)
        zip.forEach(file => {
            const blob = new Blob([file.content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        });
    },

    // CHAT FUNCTIONS
    loadChatHistory() {
        const container = document.getElementById('chat-messages');
        if (!container) return; // Safety check
        
        container.innerHTML = '';
        
        const messages = this.state.conversations[this.state.currentCharacter] || [];
        messages.forEach(msg => {
            this.addMessageToUI(msg.text, msg.sender, false);
        });
        
        this.scrollToBottom();
    },

    async sendGreeting() {
        this.showTyping();
        try {
            const char = CHARACTERS[this.state.currentCharacter];
            const greeting = await this.callAI('Greet the user warmly in character. Be welcoming.', []);
            this.hideTyping();
            this.addMessage(greeting, 'character');
        } catch (err) {
            this.hideTyping();
            this.addMessage("Hello! I'm ready to chat with you.", 'character');
        }
    },

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        let text = input.value.trim();
        
        if (!text || !sendBtn) return;
        
        // Sanitize user input to prevent XSS
        text = utils.sanitizeHTML(text);
        
        // Check if online before sending
        if (!utils.isOnline()) {
            this.showError('You are offline. Please check your connection.');
            return;
        }
        
        input.value = '';
        input.style.height = 'auto';
        sendBtn.disabled = true;
        
        this.addMessage(text, 'user');
        this.showTyping();
        
        try {
            const history = this.state.conversations[this.state.currentCharacter] || [];
            const response = await this.callAI(text, history.slice(-CONFIG.contextLimit));
            this.hideTyping();
            this.addMessage(response, 'character');
        } catch (err) {
            this.hideTyping();
            console.error('[Send Error]', err);
            this.showError("I'm having trouble responding. Please try again.");
            this.addMessage("I'm having trouble responding. Please try again.", 'character');
        }
        
        input.focus();
    },

    addMessage(text, sender) {
        const charId = this.state.currentCharacter;
        const msg = {
            text,
            sender,
            timestamp: Date.now()
        };
        
        this.state.conversations[charId].push(msg);
        this.saveState();
        this.addMessageToUI(text, sender, true);
    },

    addMessageToUI(text, sender, animate) {
        const container = document.getElementById('chat-messages');
        if (!container) return; // Safety check
        
        const div = document.createElement('div');
        div.className = `message ${sender}-message`;
        if (animate) div.classList.add('fade-in');
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        // Create copy button
        const copyBtn = `
            <button class="copy-btn" onclick="app.copyMessage(\`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" aria-label="Copy message" title="Copy message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            </button>
        `;
        
        if (sender === 'character') {
            const char = CHARACTERS[this.state.currentCharacter];
            if (!char) return; // Safety check
            div.innerHTML = `
                <img src="${char.image}" alt="${char.name}" class="message-avatar" loading="lazy">
                <div class="message-bubble">
                    <div class="message-content">${this.formatText(text)}</div>
                    <div class="message-footer">
                        <div class="message-time">${timeString}</div>
                        ${copyBtn}
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="message-bubble">
                    <div class="message-content">${this.formatText(text)}</div>
                    <div class="message-footer">
                        <div class="message-time">${timeString}</div>
                        ${copyBtn}
                    </div>
                </div>
            `;
        }
        
        container.appendChild(div);
        this.scrollToBottom();
    },

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },

    clearChat() {
        if (confirm('Clear this conversation?')) {
            this.state.conversations[this.state.currentCharacter] = [];
            this.saveState();
            document.getElementById('chat-messages').innerHTML = '';
            this.sendGreeting();
        }
    },

    // AI INTEGRATION
    async callAI(userMessage, history) {
        if (this.state.accessMode === 'user') {
            return await this.callGemma(userMessage, history);
        } else {
            return await this.callNvidia(userMessage, history);
        }
    },

    async callGemma(userMessage, history) {
        const char = CHARACTERS[this.state.currentCharacter];
        
        const context = history
            .map(msg => `${msg.sender === 'user' ? 'User' : char.name}: ${msg.text}`)
            .join('\n');
        
        const fullPrompt = `SYSTEM INSTRUCTION:
${char.systemPrompt}

${context ? `CONVERSATION HISTORY:\n${context}\n` : ''}
USER MESSAGE:
${userMessage}

RESPOND AS ${char.name.toUpperCase()}:`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${this.state.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: CONFIG.maxOutputTokens
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    async callNvidia(userMessage, history) {
        const char = CHARACTERS[this.state.currentCharacter];
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                character: this.state.currentCharacter,
                model: this.state.selectedModel,
                systemPrompt: char.systemPrompt,
                history: history.map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                }))
            })
        });

        if (!response.ok) {
            throw new Error('Backend request failed');
        }

        const data = await response.json();
        return data.response;
    },

    // UI UTILITIES
    showLoading(text = 'Loading...') {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.add('active');
    },

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    },

    showTyping() {
        document.getElementById('typing-indicator').classList.add('active');
        document.getElementById('chat-input').disabled = true;
        this.scrollToBottom();
    },

    hideTyping() {
        document.getElementById('typing-indicator').classList.remove('active');
        document.getElementById('chat-input').disabled = false;
    },

    scrollToBottom(smooth = false) {
        const container = document.querySelector('.chat-messages-container');
        if (container) {
            setTimeout(() => {
                if (smooth) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                } else {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
        }
    },

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    // STATE MANAGEMENT
    saveState() {
        localStorage.setItem('prochat_state', JSON.stringify(this.state));
    },

    loadState() {
        const saved = localStorage.getItem('prochat_state');
        if (saved) {
            try {
                this.state = { ...this.state, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load state:', e);
            }
        }
    }
};

// Expose app globally for onclick handlers
window.app = app;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => app.init());
