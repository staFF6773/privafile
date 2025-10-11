const { ipcRenderer } = require('electron');

declare const lucide: {
    createIcons: (options?: { icons?: string[] }) => void;
};

let currentFilePath: string | null = null;

async function selectFile() {
    try {
        const filePath = await ipcRenderer.invoke('select-file');
        if (filePath) {
            currentFilePath = filePath;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = filePath;
            
            // Show the current status of the file
            const isEncrypted = filePath.endsWith('.encrypted');
            showStatus(`Selected file: ${isEncrypted ? 'Encrypted' : 'Not encrypted'}`, true);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Error selecting file: ' + errorMessage, false);
    }
}

async function encryptFile() {
    if (!currentFilePath) {
        showStatus('Please select a file first', false);
        return;
    }

    if (currentFilePath.endsWith('.encrypted')) {
        showStatus('This file is already encrypted', false);
        return;
    }

    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput.value;
    if (!password) {
        showStatus('Please enter a password', false);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('encrypt-file', currentFilePath, password);
        if (result.success) {
            currentFilePath = result.path;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = result.path;
            showStatus('File encrypted successfully', true);
        } else {
            showStatus('Encryption error: ' + result.error, false);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Encryption error: ' + errorMessage, false);
    }
}

async function decryptFile() {
    if (!currentFilePath) {
        showStatus('Please select a file first', false);
        return;
    }

    if (!currentFilePath.endsWith('.encrypted')) {
        showStatus('This file is not encrypted', false);
        return;
    }

    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput.value;
    if (!password) {
        showStatus('Please enter a password', false);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('decrypt-file', currentFilePath, password);
        if (result.success) {
            currentFilePath = result.path;
            const fileInput = document.getElementById('selectedFile') as HTMLInputElement;
            fileInput.value = result.path;
            showStatus('File decrypted successfully', true);
        } else {
            showStatus('Decryption error: ' + result.error, false);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showStatus('Decryption error: ' + errorMessage, false);
    }
}

function showStatus(message: string, success: boolean) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    const icon = success ? 'check-circle' : 'alert-circle';
    const iconColor = success ? 'text-green-500' : 'text-red-500';
    
    // Update the status message
    const messageElement = statusElement.querySelector('span');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Update the icon
    const iconElement = statusElement.querySelector('i');
    if (iconElement) {
        iconElement.setAttribute('data-lucide', icon);
        // Remove all classes and add the base classes
        iconElement.className = 'h-3.5 w-3.5';
        iconElement.classList.add(iconColor);
    }
    
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    // Make sure the status is visible
    statusElement.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        // Reset to default state after hiding
        setTimeout(() => {
            if (statusElement && messageElement) {
                messageElement.textContent = 'Ready to encrypt or decrypt files';
                if (iconElement) {
                    iconElement.setAttribute('data-lucide', 'info');
                    iconElement.className = 'h-3.5 w-3.5 text-text-secondary';
                    lucide.createIcons();
                }
            }
        }, 300);
    }, 5000);
}

// Make functions available to HTML
(window as any).selectFile = selectFile;
(window as any).encryptFile = encryptFile;
(window as any).decryptFile = decryptFile;
