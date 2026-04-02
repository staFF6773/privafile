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
    const iconColor = success ? 'text-neutral-title' : 'text-red-500';
    
    // Update the status message (in the <p> tag)
    const messageElement = statusElement.querySelector('p');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Update the icon container and icon
    const iconElement = statusElement.querySelector('i');
    if (iconElement) {
        iconElement.setAttribute('data-lucide', icon);
        iconElement.className = `w-3.5 h-3.5 ${iconColor}`;
    }
    
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    // Auto-hide after 5 seconds (reset to default)
    setTimeout(() => {
        if (statusElement && messageElement) {
            messageElement.textContent = 'Ready to process requests';
            if (iconElement) {
                iconElement.setAttribute('data-lucide', 'info');
                iconElement.className = 'w-3.5 h-3.5 text-neutral-body';
                lucide.createIcons();
            }
        }
    }, 5000);
}

// Make functions available to HTML
(window as any).selectFile = selectFile;
(window as any).encryptFile = encryptFile;
(window as any).decryptFile = decryptFile;
