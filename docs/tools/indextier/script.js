// Default tier configuration
const defaultTiers = [
    { id: 't1', label: 'S', color: '#ff7f7f', items: [] },
    { id: 't2', label: 'A', color: '#ffbf7f', items: [] },
    { id: 't3', label: 'B', color: '#ffdf7f', items: [] },
    { id: 't4', label: 'C', color: '#ffff7f', items: [] },
    { id: 't5', label: 'D', color: '#bfff7f', items: [] },
    { id: 't6', label: 'F', color: '#7fff7f', items: [] }
];

// Application state
let state = {
    tiers: JSON.parse(JSON.stringify(defaultTiers)),
    pool: []
};

// DOM element references
let tierBoardEl, poolEl;

// Drag and drop state
let draggedItem = null;
let sourceContainer = null;
let touchClone = null;
let touchOffsetX = 0;
let touchOffsetY = 0;

/**
 * Initialize the application
 */
function init() {
    tierBoardEl = document.getElementById('tier-board');
    poolEl = document.getElementById('item-pool');
    
    loadState();
    render();
    setupFileDropZone();
}

/**
 * Load state from localStorage
 */
function loadState() {
    const saved = localStorage.getItem('tierListState');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
}

/**
 * Save state to localStorage
 */
function saveState() {
    try {
        localStorage.setItem('tierListState', JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

/**
 * Main render function - rebuilds the entire UI
 */
function render() {
    renderTiers();
    renderPool();
    setupDragAndDrop();
}

/**
 * Render all tier rows
 */
function renderTiers() {
    tierBoardEl.innerHTML = '';
    state.tiers.forEach((tier, index) => {
        tierBoardEl.appendChild(createTierRow(tier, index));
    });
}

/**
 * Create a single tier row element
 */
function createTierRow(tier, index) {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.dataset.tierId = tier.id;
    row.dataset.tierIndex = index;
    
    // Tier label
    const label = document.createElement('div');
    label.className = 'tier-label';
    label.style.backgroundColor = tier.color;
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = tier.label;
    label.appendChild(labelSpan);
    
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'tier-settings-btn';
    settingsBtn.onclick = () => ui.openEditTier(tier.id);
    settingsBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-8.48 8.48l-4.24 4.24M23 12h-6m-6 0H1m20.66 8.66l-4.24-4.24m-8.48-8.48l-4.24-4.24"/>
        </svg>
    `;
    label.appendChild(settingsBtn);
    
    // Tier content area (drop zone for items)
    const content = document.createElement('div');
    content.className = 'tier-content drop-zone';
    content.dataset.id = tier.id;
    tier.items.forEach(item => {
        content.appendChild(createItemElement(item));
    });
    
    // Tier controls (delete button and drag handle)
    const controls = document.createElement('div');
    controls.className = 'tier-controls';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'control-btn';
    deleteBtn.title = 'Delete tier';
    deleteBtn.onclick = () => actions.deleteTier(tier.id);
    deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    `;
    controls.appendChild(deleteBtn);
    
    // Drag handle for reordering tiers
    const dragHandle = document.createElement('div');
    dragHandle.className = 'tier-drag-handle';
    dragHandle.title = 'Drag to reorder';
    dragHandle.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
    `;
    controls.appendChild(dragHandle);
    
    row.appendChild(label);
    row.appendChild(content);
    row.appendChild(controls);
    
    return row;
}

/**
 * Render the item pool
 */
function renderPool() {
    poolEl.innerHTML = '';
    state.pool.forEach(item => {
        poolEl.appendChild(createItemElement(item));
    });
}

/**
 * Create a single item element
 */
function createItemElement(itemData) {
    const el = document.createElement('div');
    el.className = 'item';
    el.draggable = true;
    el.dataset.id = itemData.id;
    
    if (itemData.img) {
        const img = document.createElement('img');
        img.src = itemData.img;
        img.alt = itemData.text || 'Item';
        img.draggable = false;
        el.appendChild(img);
    }
    
    if (itemData.text) {
        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = itemData.text;
        el.appendChild(label);
    }
    
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'item-delete';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        actions.deleteItem(itemData.id);
    };
    delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    `;
    el.appendChild(delBtn);
    
    return el;
}

// ============================
// FILE DROP ZONE SETUP
// ============================

/**
 * Set up file drag and drop on the item pool
 */
function setupFileDropZone() {
    poolEl.addEventListener('dragover', handleFileDragOver);
    poolEl.addEventListener('dragleave', handleFileDragLeave);
    poolEl.addEventListener('drop', handleFileDrop);
}

function handleFileDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
        poolEl.classList.add('file-drag-over');
    }
}

function handleFileDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!poolEl.contains(e.relatedTarget)) {
        poolEl.classList.remove('file-drag-over');
    }
}

/**
 * Handle file drop - processes images one by one with proper error handling
 * CRITICAL FIX: This was the main bug - now properly handles multiple files
 */
async function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    poolEl.classList.remove('file-drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        // Check if this is an item drag, not a file drag
        if (e.dataTransfer.getData('text/plain')) {
            return;
        }
        alert('Please drop image files only');
        return;
    }
    
    await processMultipleImages(imageFiles);
}

/**
 * Process multiple image files safely
 * Each file is processed independently to prevent cascade failures
 */
async function processMultipleImages(files) {
    if (files.length === 0) return;
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadingProgress = document.getElementById('loading-progress');
    
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'Processing images...';
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        try {
            // Update progress
            loadingProgress.textContent = `Processing ${i + 1} of ${files.length}`;
            
            // Process single file
            await processImageFile(files[i], i);
            successCount++;
            
            // Small delay to prevent UI freezing
            await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
            console.error(`Failed to process ${files[i].name}:`, error);
            failCount++;
            // Continue processing other files instead of breaking
        }
    }
    
    // Save and render once after all files are processed
    if (successCount > 0) {
        saveState();
        render();
    }
    
    loadingOverlay.style.display = 'none';
    
    // Show result message
    if (failCount > 0) {
        alert(`Uploaded ${successCount} image(s). ${failCount} file(s) failed.`);
    }
}

/**
 * Process a single image file
 * Returns a promise that resolves when the file is loaded and added to state
 */
function processImageFile(file, index) {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('Not an image file'));
            return;
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            reject(new Error('File too large (max 10MB)'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const fileName = file.name.replace(/\.[^/.]+$/, '');
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substr(2, 9);
                
                // Add to state
                state.pool.push({
                    id: `i_${timestamp}_${index}_${randomId}`,
                    text: fileName,
                    img: e.target.result
                });
                
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error(`Failed to read file: ${file.name}`));
        };
        
        reader.readAsDataURL(file);
    });
}

// ============================
// DRAG AND DROP LOGIC FOR ITEMS
// ============================

/**
 * Set up drag and drop event listeners for all items and drop zones
 */
function setupDragAndDrop() {
    const items = document.querySelectorAll('.item');
    const zones = document.querySelectorAll('.drop-zone');
    const tierRows = document.querySelectorAll('.tier-row');
    
    // Setup item dragging
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('touchstart', handleTouchStart, {passive: false});
        item.addEventListener('touchmove', handleTouchMove, {passive: false});
        item.addEventListener('touchend', handleTouchEnd);
    });
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
    
    // Setup tier dragging - attach to drag handles
    tierRows.forEach(row => {
        const dragHandle = row.querySelector('.tier-drag-handle');
        if (dragHandle) {
            // Desktop drag support - make row draggable only from handle
            dragHandle.addEventListener('mousedown', (e) => {
                row.draggable = true;
            });
            
            dragHandle.addEventListener('mouseup', (e) => {
                setTimeout(() => {
                    row.draggable = false;
                }, 100);
            });
            
            // Mobile touch support for tier dragging
            dragHandle.addEventListener('touchstart', handleTierTouchStart, {passive: false});
            dragHandle.addEventListener('touchmove', handleTierTouchMove, {passive: false});
            dragHandle.addEventListener('touchend', handleTierTouchEnd, {passive: false});
        }
        
        // Tier drag events
        row.addEventListener('dragstart', handleTierDragStart);
        row.addEventListener('dragend', handleTierDragEnd);
    });
}

/**
 * Attach tier drag listeners when we start dragging a tier
 */
function attachTierDragListeners() {
    const tierRows = document.querySelectorAll('.tier-row');
    tierRows.forEach(row => {
        row.addEventListener('dragover', handleTierDragOver);
        row.addEventListener('drop', handleTierDrop);
    });
}

/**
 * Remove tier drag listeners when we finish dragging a tier
 */
function removeTierDragListeners() {
    const tierRows = document.querySelectorAll('.tier-row');
    tierRows.forEach(row => {
        row.removeEventListener('dragover', handleTierDragOver);
        row.removeEventListener('drop', handleTierDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    sourceContainer = this.parentNode;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    
    // CRITICAL: Stop propagation so tier-row doesn't catch this event
    e.stopPropagation();
    
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedItem = null;
    sourceContainer = null;
    
    // Stop propagation here too
    e.stopPropagation();
}

function handleDragOver(e) {
    if (!e.dataTransfer.types.includes('text/plain')) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDragEnter(e) {
    if (!e.dataTransfer.types.includes('text/plain')) return;
    
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    // Only remove if we're actually leaving this element
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    // Ignore if files are being dropped
    if (e.dataTransfer.files.length > 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    
    const itemId = e.dataTransfer.getData('text/plain');
    const targetZoneId = this.dataset.id;
    
    if (itemId && targetZoneId) {
        moveItemInState(itemId, targetZoneId);
    }
}

// Touch event handlers for mobile support
function handleTouchStart(e) {
    e.preventDefault();
    draggedItem = this;
    sourceContainer = this.parentNode;
    
    const touch = e.touches[0];
    const rect = this.getBoundingClientRect();
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    
    touchClone = this.cloneNode(true);
    touchClone.style.position = 'fixed';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.zIndex = '1000';
    touchClone.style.opacity = '0.8';
    touchClone.style.width = rect.width + 'px';
    touchClone.style.height = rect.height + 'px';
    document.body.appendChild(touchClone);
    
    updateTouchPosition(touch.clientX, touch.clientY);
    this.style.opacity = '0.3';
}

function handleTouchMove(e) {
    if (!draggedItem) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    updateTouchPosition(touch.clientX, touch.clientY);
    
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elementBelow?.closest('.drop-zone');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleTouchEnd(e) {
    if (!draggedItem) return;
    
    draggedItem.style.opacity = '1';
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elementBelow?.closest('.drop-zone');
    
    if (dropZone && touchClone) {
        const itemId = draggedItem.dataset.id;
        const targetZoneId = dropZone.dataset.id;
        moveItemInState(itemId, targetZoneId);
    }
    
    if (touchClone) document.body.removeChild(touchClone);
    touchClone = null;
    draggedItem = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function updateTouchPosition(x, y) {
    if (touchClone) {
        touchClone.style.left = (x - touchOffsetX) + 'px';
        touchClone.style.top = (y - touchOffsetY) + 'px';
    }
}

/**
 * Move an item from one zone to another in the state
 */
function moveItemInState(itemId, targetZoneId) {
    let itemData = null;
    
    // Find and remove from pool
    const poolIndex = state.pool.findIndex(i => i.id === itemId);
    if (poolIndex !== -1) {
        itemData = state.pool.splice(poolIndex, 1)[0];
    }
    
    // Find and remove from tiers if not found in pool
    if (!itemData) {
        for (let tier of state.tiers) {
            const idx = tier.items.findIndex(i => i.id === itemId);
            if (idx !== -1) {
                itemData = tier.items.splice(idx, 1)[0];
                break;
            }
        }
    }
    
    if (!itemData) return;
    
    // Add to target zone
    if (targetZoneId === 'pool') {
        state.pool.push(itemData);
    } else {
        const targetTier = state.tiers.find(t => t.id === targetZoneId);
        if (targetTier) {
            targetTier.items.push(itemData);
        } else {
            state.pool.push(itemData);
        }
    }
    
    saveState();
    render();
}

// ============================
// TIER DRAG AND DROP
// ============================

let draggedTier = null;

function handleTierDragStart(e) {
    // Don't handle if this is an item being dragged
    if (e.target.classList.contains('item')) {
        return;
    }
    
    // Only allow dragging if the row is draggable (set by drag handle mousedown)
    if (!this.draggable) {
        return;
    }
    
    draggedTier = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/tier', this.dataset.tierId);
    setTimeout(() => this.classList.add('dragging-tier'), 0);
    
    // NOW attach tier drag listeners since we're actually dragging a tier
    attachTierDragListeners();
}

function handleTierDragEnd(e) {
    // Don't handle if this is an item being dragged
    if (e.target.classList.contains('item')) {
        return;
    }
    
    this.classList.remove('dragging-tier');
    this.draggable = false;
    document.querySelectorAll('.drag-over-tier').forEach(el => el.classList.remove('drag-over-tier'));
    draggedTier = null;
    
    // Remove tier drag listeners after dragging ends
    removeTierDragListeners();
}

function handleTierDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Don't add drag-over class to the dragged element itself
    if (this !== draggedTier) {
        this.classList.add('drag-over-tier');
    }
}

function handleTierDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over-tier');
    
    if (this === draggedTier) return;
    
    const draggedId = e.dataTransfer.getData('text/tier');
    const draggedIndex = state.tiers.findIndex(t => t.id === draggedId);
    const targetIndex = parseInt(this.dataset.tierIndex);
    
    if (draggedIndex === -1 || targetIndex === undefined) return;
    
    // Reorder tiers
    const [movedTier] = state.tiers.splice(draggedIndex, 1);
    state.tiers.splice(targetIndex, 0, movedTier);
    
    saveState();
    render();
}

// Mobile touch support for tier dragging
let draggedTierRow = null;
let tierTouchClone = null;
let tierTouchOffsetX = 0;
let tierTouchOffsetY = 0;

function handleTierTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const tierRow = e.target.closest('.tier-row');
    if (!tierRow) return;
    
    draggedTierRow = tierRow;
    
    const touch = e.touches[0];
    const rect = tierRow.getBoundingClientRect();
    tierTouchOffsetX = touch.clientX - rect.left;
    tierTouchOffsetY = touch.clientY - rect.top;
    
    tierTouchClone = tierRow.cloneNode(true);
    tierTouchClone.style.position = 'fixed';
    tierTouchClone.style.pointerEvents = 'none';
    tierTouchClone.style.zIndex = '1000';
    tierTouchClone.style.opacity = '0.8';
    tierTouchClone.style.width = rect.width + 'px';
    tierTouchClone.style.height = rect.height + 'px';
    document.body.appendChild(tierTouchClone);
    
    updateTierTouchPosition(touch.clientX, touch.clientY);
    tierRow.style.opacity = '0.3';
}

function handleTierTouchMove(e) {
    if (!draggedTierRow) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    updateTierTouchPosition(touch.clientX, touch.clientY);
    
    document.querySelectorAll('.drag-over-tier').forEach(el => el.classList.remove('drag-over-tier'));
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const tierBelow = elementBelow?.closest('.tier-row');
    if (tierBelow && tierBelow !== draggedTierRow) {
        tierBelow.classList.add('drag-over-tier');
    }
}

function handleTierTouchEnd(e) {
    if (!draggedTierRow) return;
    e.preventDefault();
    e.stopPropagation();
    
    draggedTierRow.style.opacity = '1';
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetTier = elementBelow?.closest('.tier-row');
    
    if (targetTier && tierTouchClone && targetTier !== draggedTierRow) {
        const draggedIndex = parseInt(draggedTierRow.dataset.tierIndex);
        const targetIndex = parseInt(targetTier.dataset.tierIndex);
        
        if (draggedIndex !== undefined && targetIndex !== undefined) {
            const [movedTier] = state.tiers.splice(draggedIndex, 1);
            state.tiers.splice(targetIndex, 0, movedTier);
            saveState();
            render();
        }
    }
    
    if (tierTouchClone) document.body.removeChild(tierTouchClone);
    tierTouchClone = null;
    draggedTierRow = null;
    document.querySelectorAll('.drag-over-tier').forEach(el => el.classList.remove('drag-over-tier'));
}

function updateTierTouchPosition(x, y) {
    if (tierTouchClone) {
        tierTouchClone.style.left = (x - tierTouchOffsetX) + 'px';
        tierTouchClone.style.top = (y - tierTouchOffsetY) + 'px';
    }
}

// ============================
// ACTIONS
// ============================

const actions = {
    /**
     * Add a new tier
     */
    addTier: () => {
        const newId = 't_' + Date.now();
        state.tiers.push({
            id: newId,
            label: 'NEW',
            color: '#cccccc',
            items: []
        });
        saveState();
        render();
    },
    
    /**
     * Delete a tier and move its items to the pool
     */
    deleteTier: (id) => {
        const tierIndex = state.tiers.findIndex(t => t.id === id);
        if (tierIndex === -1) return;
        
        if (!confirm('Delete this tier? Items will be moved to the pool.')) return;
        
        const itemsToReturn = state.tiers[tierIndex].items;
        state.pool = [...state.pool, ...itemsToReturn];
        state.tiers.splice(tierIndex, 1);
        saveState();
        render();
    },
    
    /**
     * Create a new item from URL/text input
     */
    createItem: () => {
        const img = document.getElementById('input-img-url').value.trim();
        const text = document.getElementById('input-item-text').value.trim();
        
        if (!img && !text) {
            alert("Please enter text or an image URL");
            return;
        }
        
        state.pool.push({
            id: 'i_' + Date.now(),
            text: text,
            img: img
        });
        
        document.getElementById('input-img-url').value = '';
        document.getElementById('input-item-text').value = '';
        ui.closeModal('modal-add-item');
        saveState();
        render();
    },
    
    /**
     * Upload images from file input
     */
    uploadImages: async () => {
        const fileInput = document.getElementById('image-file-input');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            alert('Please select at least one image');
            return;
        }
        
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('Please select valid image files');
            return;
        }
        
        ui.closeModal('modal-upload-images');
        await processMultipleImages(imageFiles);
        
        // Reset file input
        fileInput.value = '';
    },
    
    /**
     * Delete an item
     */
    deleteItem: (id) => {
        if (!confirm("Delete this item?")) return;
        
        state.pool = state.pool.filter(i => i.id !== id);
        state.tiers.forEach(t => t.items = t.items.filter(i => i.id !== id));
        saveState();
        render();
    },
    
    /**
     * Clear all items from the pool
     */
    clearPool: () => {
        if (confirm("Clear all unranked items?")) {
            state.pool = [];
            saveState();
            render();
        }
    },
    
    /**
     * Reset the entire board
     */
    resetBoard: () => {
        if (confirm("Reset everything to default? All data will be lost.")) {
            localStorage.removeItem('tierListState');
            state = { tiers: JSON.parse(JSON.stringify(defaultTiers)), pool: [] };
            render();
        }
    },
    
    /**
     * Save tier edits
     */
    saveTierEdit: () => {
        const id = document.getElementById('edit-tier-id').value;
        const name = document.getElementById('edit-tier-name').value.trim();
        const color = document.getElementById('edit-tier-color').value;
        
        const tier = state.tiers.find(t => t.id === id);
        if (tier) {
            tier.label = name || tier.label;
            tier.color = color;
            saveState();
            render();
        }
        ui.closeModal('modal-edit-tier');
    },
    
    /**
     * Clear all items from the currently edited tier
     */
    clearTier: () => {
        const id = document.getElementById('edit-tier-id').value;
        const tier = state.tiers.find(t => t.id === id);
        
        if (!tier) return;
        
        if (!confirm(`Clear all items from tier "${tier.label}"? Items will be moved to the pool.`)) {
            return;
        }
        
        // Move all tier items to pool
        state.pool = [...state.pool, ...tier.items];
        tier.items = [];
        
        saveState();
        render();
        ui.closeModal('modal-edit-tier');
    },
    
    /**
     * Export state as JSON
     */
    exportJSON: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "tierlist_" + Date.now() + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },
    
    /**
     * Import state from JSON file
     */
    importJSON: (input) => {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.tiers && json.pool) {
                    state = json;
                    saveState();
                    render();
                    alert("Loaded successfully!");
                } else {
                    alert("Invalid file format.");
                }
            } catch (err) {
                alert("Error parsing JSON: " + err.message);
            }
        };
        reader.readAsText(file);
        input.value = '';
    }
};

// ============================
// UI UTILITIES
// ============================

const ui = {
    /**
     * Open a modal by ID
     */
    openModal: (id) => {
        document.getElementById(id).style.display = 'flex';
    },
    
    /**
     * Close a modal by ID
     */
    closeModal: (id) => {
        document.getElementById(id).style.display = 'none';
    },
    
    /**
     * Open the edit tier modal with tier data
     */
    openEditTier: (id) => {
        const tier = state.tiers.find(t => t.id === id);
        if (!tier) return;
        
        document.getElementById('edit-tier-id').value = tier.id;
        document.getElementById('edit-tier-name').value = tier.label;
        document.getElementById('edit-tier-color').value = tier.color;
        ui.openModal('modal-edit-tier');
    },
    
    /**
     * Enter the main app from landing page
     */
    enterApp: () => {
        const landingPage = document.getElementById('landing-page');
        const appContainer = document.getElementById('app-container');
        
        // Fade out landing page
        landingPage.classList.add('fade-out');
        
        // After fade out completes, hide landing and show app
        setTimeout(() => {
            landingPage.style.display = 'none';
            appContainer.style.display = 'flex';
            
            // Trigger fade in for app
            setTimeout(() => {
                appContainer.classList.add('fade-in');
            }, 50);
        }, 500);
    }
};

// ============================
// EVENT LISTENERS
// ============================

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = "none";
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
