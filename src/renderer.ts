const { ipcRenderer } = require('electron');

declare const lucide: {
    createIcons: (options?: { icons?: string[] }) => void;
};

// --- Translations ---
const translations: Record<string, any> = {
    en: require('./locales/en.json'),
    es: require('./locales/es.json')
};

let currentFilePath: string | null = null;
let currentLanguage = 'en';

interface HistoryEntry {
    type: 'encrypt' | 'decrypt';
    path: string;
    timestamp: number;
}

let archiveHistory: HistoryEntry[] = [];

// --- View Management ---
function switchView(viewId: string) {
    const views = ['encrypt', 'settings', 'archive'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        const btn = document.getElementById(`btn-${v}`);
        if (el) {
            if (v === viewId) {
                el.classList.remove('hidden');
                btn?.classList.add('bg-neutral-surface', 'border', 'border-neutral-border', 'text-neutral-title');
                btn?.classList.remove('text-neutral-body');
                if (v === 'archive') renderHistory();
            } else {
                el.classList.add('hidden');
                btn?.classList.remove('bg-neutral-surface', 'border', 'border-neutral-border', 'text-neutral-title');
                btn?.classList.add('text-neutral-body');
            }
        }
    });
}

// --- Localization ---
function applyLanguageSetting() {
    const langSelect = document.getElementById('setting-language') as HTMLSelectElement;
    currentLanguage = langSelect.value;
    saveSettings();
    translateUI();
}

function translateUI() {
    const langData = translations[currentLanguage];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && langData[key]) {
            el.textContent = langData[key];
        }
    });
    
    // Update footer info if empty
    if (!currentFilePath) {
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) fileInfo.textContent = currentLanguage === 'es' ? 'Ningún documento cargado' : 'No document loaded';
    }
}

// --- Settings Persistence ---
function saveSettings() {
    const algorithm = (document.getElementById('setting-algorithm') as HTMLSelectElement).value;
    const language = (document.getElementById('setting-language') as HTMLSelectElement).value;
    
    const settings = { algorithm, language };
    localStorage.setItem('privafile-settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('privafile-settings');
    if (saved) {
        const settings = JSON.parse(saved);
        const algSelect = document.getElementById('setting-algorithm') as HTMLSelectElement;
        const langSelect = document.getElementById('setting-language') as HTMLSelectElement;
        
        if (algSelect) algSelect.value = settings.algorithm || 'aes-256-gcm';
        if (langSelect) langSelect.value = settings.language || 'en';
        
        currentLanguage = settings.language || 'en';
    }
    loadHistory();
    translateUI();
}

// --- History Management ---
function addToHistory(type: 'encrypt' | 'decrypt', path: string) {
    archiveHistory.unshift({
        type,
        path,
        timestamp: Date.now()
    });
    if (archiveHistory.length > 50) archiveHistory.pop();
    localStorage.setItem('privafile-history', JSON.stringify(archiveHistory));
}

function loadHistory() {
    const saved = localStorage.getItem('privafile-history');
    if (saved) {
        try {
            archiveHistory = JSON.parse(saved);
        } catch (e) {
            archiveHistory = [];
        }
    }
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    if (!list || !empty) return;

    if (archiveHistory.length === 0) {
        list.querySelectorAll('.history-item').forEach(el => el.remove());
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    // Clear existing items but keep the empty state element
    list.querySelectorAll('.history-item').forEach(el => el.remove());

    archiveHistory.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item bg-neutral-dark border border-neutral-border rounded-lg p-3 flex items-center justify-between group transition-all hover:border-neutral-body/20';
        
        const date = new Date(entry.timestamp).toLocaleString();
        const fileName = entry.path.split(/[\\/]/).pop() || entry.path;
        const typeKey = entry.type === 'encrypt' ? 'history_type_encrypt' : 'history_type_decrypt';
        const typeText = translations[currentLanguage][typeKey];
        const typeColor = entry.type === 'encrypt' ? 'text-green-500' : 'text-blue-500/80';
        const icon = entry.type === 'encrypt' ? 'lock' : 'unlock';

        item.innerHTML = `
            <div class="flex items-center space-x-4 overflow-hidden">
                <div class="w-8 h-8 rounded bg-neutral-surface border border-neutral-border flex items-center justify-center shrink-0">
                    <i data-lucide="${icon}" class="w-3.5 h-3.5 ${typeColor}"></i>
                </div>
                <div class="overflow-hidden">
                    <div class="flex items-center space-x-2">
                        <span class="text-[9px] font-extrabold uppercase tracking-widest ${typeColor}">${typeText}</span>
                        <span class="text-[9px] text-neutral-body opacity-40 font-medium">${date}</span>
                    </div>
                    <div class="text-[11px] text-neutral-title font-bold truncate mt-0.5 tracking-tight">${fileName}</div>
                    <div class="text-[9px] text-neutral-body/40 truncate font-mono">${entry.path}</div>
                </div>
            </div>
            <button onclick="locateFile('${entry.path.replace(/\\/g, '\\\\')}')" class="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-surface hover:bg-neutral-border border border-neutral-border text-neutral-body hover:text-neutral-title px-2.5 py-1.5 rounded text-[8px] uppercase font-bold tracking-widest">
                ${translations[currentLanguage].history_action_locate}
            </button>
        `;
        list.appendChild(item);
    });
    lucide.createIcons();
}

async function locateFile(path: string) {
    await ipcRenderer.invoke('locate-file', path);
}

function clearHistory() {
    archiveHistory = [];
    localStorage.removeItem('privafile-history');
    renderHistory();
}

// --- Encryption Logic ---
async function selectFile() {
    try {
        const filePath = await ipcRenderer.invoke('select-file');
        if (filePath) {
            currentFilePath = filePath;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = filePath;
            
            const fileInfo = document.getElementById('file-info');
            if (fileInfo) fileInfo.textContent = filePath.split(/[\\/]/).pop() || filePath;

            const isEncrypted = filePath.endsWith('.encrypted');
            const msgKey = isEncrypted ? 'select_status_encrypted' : 'select_status_not_encrypted';
            showStatus(translations[currentLanguage][msgKey], true);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Error: ' + errorMessage, false);
    }
}

async function encryptFile() {
    if (!currentFilePath) {
        showStatus(translations[currentLanguage].err_select_file, false);
        return;
    }

    if (currentFilePath.endsWith('.encrypted')) {
        showStatus(translations[currentLanguage].err_already_encrypted, false);
        return;
    }

    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput.value;
    if (!password) {
        showStatus(translations[currentLanguage].err_no_password, false);
        return;
    }

    try {
        const algSelect = document.getElementById('setting-algorithm') as HTMLSelectElement;
        const algorithm = algSelect ? algSelect.value : 'aes-256-gcm';
        
        const result = await ipcRenderer.invoke('encrypt-file', currentFilePath, password, algorithm);
        if (result.success) {
            addToHistory('encrypt', result.path);
            currentFilePath = result.path;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = result.path;
            showStatus(translations[currentLanguage].success_encrypt, true);
        } else {
            showStatus('Error: ' + result.error, false);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Error: ' + errorMessage, false);
    }
}

async function decryptFile() {
    if (!currentFilePath) {
        showStatus(translations[currentLanguage].err_select_file, false);
        return;
    }

    if (!currentFilePath.endsWith('.encrypted')) {
        showStatus(translations[currentLanguage].err_not_encrypted, false);
        return;
    }

    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput.value;
    if (!password) {
        showStatus(translations[currentLanguage].err_no_password, false);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('decrypt-file', currentFilePath, password);
        if (result.success) {
            addToHistory('decrypt', result.path);
            currentFilePath = result.path;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = result.path;
            showStatus(translations[currentLanguage].success_decrypt, true);
        } else {
            showStatus('Error: ' + result.error, false);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Error: ' + errorMessage, false);
    }
}

function showStatus(message: string, success: boolean) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    const icon = success ? 'check-circle' : 'alert-circle';
    const iconColor = success ? 'text-neutral-title' : 'text-red-500';
    
    const messageElement = statusElement.querySelector('p');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    const iconElement = statusElement.querySelector('i');
    if (iconElement) {
        iconElement.setAttribute('data-lucide', icon);
        iconElement.className = `w-3.5 h-3.5 ${iconColor}`;
    }
    
    lucide.createIcons();
    
    setTimeout(() => {
        if (statusElement && messageElement) {
            messageElement.textContent = translations[currentLanguage].status_ready;
            if (iconElement) {
                iconElement.setAttribute('data-lucide', 'info');
                iconElement.className = 'w-3.5 h-3.5 text-neutral-body';
                lucide.createIcons();
            }
        }
    }, 5000);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    lucide.createIcons();
});

// Make functions available to HTML
(window as any).selectFile = selectFile;
(window as any).encryptFile = encryptFile;
(window as any).decryptFile = decryptFile;
(window as any).switchView = switchView;
(window as any).saveSettings = saveSettings;
(window as any).applyLanguageSetting = applyLanguageSetting;
(window as any).clearHistory = clearHistory;
(window as any).locateFile = locateFile;
