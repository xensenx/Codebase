// ===== NEUTRALINO INITIALIZATION =====
Neutralino.init();

// Wait for Neutralino to be ready
Neutralino.events.on("ready", () => {
    console.log("Neutralino is ready");
});

// Handle window close event
Neutralino.events.on("windowClose", () => {
    saveContent();
    Neutralino.app.exit();
});

// ===== DOM ELEMENTS =====
const editor = document.getElementById('editor');
const newBtn = document.getElementById('newBtn');
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');
const newWindowBtn = document.getElementById('newWindowBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const themeSelect = document.getElementById('themeSelect');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const lineSpacingSelect = document.getElementById('lineSpacingSelect');
const wrapBtn = document.getElementById('wrapBtn');
const saveIndicator = document.getElementById('saveIndicator');

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    content: 'editor_content',
    theme: 'editor_theme',
    fontSize: 'editor_fontSize',
    lineSpacing: 'editor_lineSpacing',
    wordWrap: 'editor_wordWrap'
};

const AUTO_SAVE_DELAY = 2000; // Auto-save after 2 seconds of inactivity
let autoSaveTimer = null;
let currentFilePath = null;
let isMaximized = false;

// ===== INITIALIZATION =====
function init() {
    // Load saved settings
    loadSettings();
    
    // Load saved content
    loadContent();
    
    // Set up event listeners
    setupEventListeners();
    
    // Focus on editor
    editor.focus();
}

// ===== LOAD SETTINGS =====
async function loadSettings() {
    try {
        // Load theme
        const savedTheme = await getStorageItem(STORAGE_KEYS.theme) || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        themeSelect.value = savedTheme;
        
        // Load font size
        const savedFontSize = await getStorageItem(STORAGE_KEYS.fontSize) || 'medium';
        editor.setAttribute('data-font-size', savedFontSize);
        fontSizeSelect.value = savedFontSize;
        
        // Load line spacing
        const savedLineSpacing = await getStorageItem(STORAGE_KEYS.lineSpacing) || 'normal';
        editor.setAttribute('data-line-spacing', savedLineSpacing);
        lineSpacingSelect.value = savedLineSpacing;
        
        // Load word wrap
        const savedWordWrap = await getStorageItem(STORAGE_KEYS.wordWrap);
        const wordWrapEnabled = savedWordWrap !== 'false'; // Default true
        editor.setAttribute('data-wrap', wordWrapEnabled);
        wrapBtn.classList.toggle('active', wordWrapEnabled);
        
        // Update toggle text
        const toggleText = wrapBtn.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = wordWrapEnabled ? 'On' : 'Off';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ===== LOAD CONTENT =====
async function loadContent() {
    try {
        const savedContent = await getStorageItem(STORAGE_KEYS.content);
        if (savedContent) {
            editor.value = savedContent;
        }
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// ===== SAVE CONTENT =====
async function saveContent() {
    try {
        await setStorageItem(STORAGE_KEYS.content, editor.value);
        showSaveIndicator();
    } catch (error) {
        console.error('Error saving content:', error);
    }
}

// ===== NEUTRALINO STORAGE HELPERS =====
async function getStorageItem(key) {
    try {
        return await Neutralino.storage.getData(key);
    } catch (error) {
        return null;
    }
}

async function setStorageItem(key, value) {
    try {
        await Neutralino.storage.setData(key, value);
    } catch (error) {
        console.error('Storage error:', error);
    }
}

// ===== AUTO-SAVE =====
function triggerAutoSave() {
    // Clear existing timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // Set new timer
    autoSaveTimer = setTimeout(() => {
        saveContent();
    }, AUTO_SAVE_DELAY);
}

// ===== SHOW SAVE INDICATOR =====
function showSaveIndicator() {
    saveIndicator.classList.add('show');
    setTimeout(() => {
        saveIndicator.classList.remove('show');
    }, 1500);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Editor input - trigger auto-save
    editor.addEventListener('input', triggerAutoSave);
    
    // New document
    newBtn.addEventListener('click', createNewDocument);
    
    // Open file - using Neutralino native dialog
    openBtn.addEventListener('click', openFile);
    
    // Save file - using Neutralino native dialog
    saveBtn.addEventListener('click', saveFile);
    
    // New window
    newWindowBtn.addEventListener('click', openNewWindow);
    
    // Maximize toggle
    maximizeBtn.addEventListener('click', toggleMaximize);
    
    // Settings panel
    settingsBtn.addEventListener('click', toggleSettingsPanel);
    closeSettings.addEventListener('click', closeSettingsPanel);
    
    // Close settings panel when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Theme change
    themeSelect.addEventListener('change', changeTheme);
    
    // Font size change
    fontSizeSelect.addEventListener('change', changeFontSize);
    
    // Line spacing change
    lineSpacingSelect.addEventListener('change', changeLineSpacing);
    
    // Word wrap toggle
    wrapBtn.addEventListener('click', toggleWordWrap);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ===== CREATE NEW DOCUMENT =====
function createNewDocument() {
    if (editor.value.trim() && !confirm('Create new document? Current content will be cleared.')) {
        return;
    }
    
    editor.value = '';
    currentFilePath = null;
    editor.focus();
    saveContent();
}

// ===== OPEN FILE (NATIVE DIALOG) =====
async function openFile() {
    try {
        const entries = await Neutralino.os.showDialogOpen({
            title: 'Open Text File',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (entries && entries.length > 0) {
            const filePath = entries[0];
            const content = await Neutralino.filesystem.readFile(filePath);
            
            editor.value = content;
            currentFilePath = filePath;
            saveContent();
            showSaveIndicator();
        }
    } catch (error) {
        if (error.code !== 'NE_OS_DIACAN') { // Ignore dialog cancellation
            console.error('Error opening file:', error);
            alert('Error opening file: ' + error.message);
        }
    }
}

// ===== SAVE FILE (NATIVE DIALOG) =====
async function saveFile() {
    try {
        let filePath = currentFilePath;
        
        // If no current file, show save dialog
        if (!filePath) {
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const defaultName = `document_${timestamp}.txt`;
            
            filePath = await Neutralino.os.showDialogSave({
                title: 'Save Text File',
                defaultPath: defaultName,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
        }
        
        if (filePath) {
            await Neutralino.filesystem.writeFile(filePath, editor.value);
            currentFilePath = filePath;
            showSaveIndicator();
        }
    } catch (error) {
        if (error.code !== 'NE_OS_DIACAN') { // Ignore dialog cancellation
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    }
}

// ===== CHANGE THEME =====
async function changeTheme() {
    const theme = themeSelect.value;
    document.body.setAttribute('data-theme', theme);
    await setStorageItem(STORAGE_KEYS.theme, theme);
}

// ===== CHANGE FONT SIZE =====
async function changeFontSize() {
    const fontSize = fontSizeSelect.value;
    editor.setAttribute('data-font-size', fontSize);
    await setStorageItem(STORAGE_KEYS.fontSize, fontSize);
}

// ===== CHANGE LINE SPACING =====
async function changeLineSpacing() {
    const lineSpacing = lineSpacingSelect.value;
    editor.setAttribute('data-line-spacing', lineSpacing);
    await setStorageItem(STORAGE_KEYS.lineSpacing, lineSpacing);
}

// ===== TOGGLE WORD WRAP =====
async function toggleWordWrap() {
    const currentWrap = editor.getAttribute('data-wrap') === 'true';
    const newWrap = !currentWrap;
    
    editor.setAttribute('data-wrap', newWrap);
    wrapBtn.classList.toggle('active', newWrap);
    
    // Update toggle text
    const toggleText = wrapBtn.querySelector('.toggle-text');
    if (toggleText) {
        toggleText.textContent = newWrap ? 'On' : 'Off';
    }
    
    await setStorageItem(STORAGE_KEYS.wordWrap, newWrap);
}

// ===== SETTINGS PANEL FUNCTIONS =====
function toggleSettingsPanel(event) {
    event.stopPropagation();
    settingsPanel.classList.toggle('hidden');
}

function closeSettingsPanel() {
    settingsPanel.classList.add('hidden');
}

function handleOutsideClick(event) {
    // Close settings panel if clicking outside
    if (!settingsPanel.classList.contains('hidden') && 
        !settingsPanel.contains(event.target) && 
        !settingsBtn.contains(event.target)) {
        closeSettingsPanel();
    }
}

// ===== WINDOW FUNCTIONS =====
async function openNewWindow() {
    try {
        await Neutralino.window.create('/resources/', {
            title: 'Minimal Text Editor',
            width: 1000,
            height: 700,
            minWidth: 600,
            minHeight: 400
        });
    } catch (error) {
        console.error('Error opening new window:', error);
    }
}

async function toggleMaximize() {
    try {
        if (isMaximized) {
            await Neutralino.window.unmaximize();
        } else {
            await Neutralino.window.maximize();
        }
        isMaximized = !isMaximized;
        updateMaximizeIcon();
    } catch (error) {
        console.error('Error toggling maximize:', error);
    }
}

function updateMaximizeIcon() {
    const maximizeIcon = document.getElementById('maximizeIcon');
    
    if (isMaximized) {
        // Show restore icon
        maximizeIcon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>';
    } else {
        // Show maximize icon
        maximizeIcon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>';
    }
}

// ===== KEYBOARD SHORTCUTS =====
function handleKeyboardShortcuts(event) {
    // Escape key - close settings panel
    if (event.key === 'Escape') {
        if (!settingsPanel.classList.contains('hidden')) {
            closeSettingsPanel();
            return;
        }
    }
    
    // Check for Ctrl/Cmd key
    const isCtrl = event.ctrlKey || event.metaKey;
    
    if (!isCtrl) return;
    
    switch(event.key.toLowerCase()) {
        case 'n':
            // Ctrl+N: New document
            event.preventDefault();
            createNewDocument();
            break;
            
        case 'o':
            // Ctrl+O: Open file
            event.preventDefault();
            openFile();
            break;
            
        case 's':
            // Ctrl+S: Save file
            event.preventDefault();
            saveFile();
            break;
    }
}

// ===== START THE APPLICATION =====
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
