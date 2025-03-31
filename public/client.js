// public/client.js
let username = prompt('Enter your username:');
let ws;
let editor;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Initialize CodeMirror
function initCodeMirror() {
    editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
        mode: 'javascript',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        extraKeys: {
            'Tab': 'indentMore',
            'Shift-Tab': 'indentLess'
        }
    });

    // Add paste event handler
    editor.on('paste', (cm, e) => {
        // Prevent default paste
        e.preventDefault();
        
        // Get clipboard data
        const text = e.clipboardData.getData('text');
        
        // Normalize line breaks and remove extra blank lines
        const normalizedText = text
            .replace(/\r\n/g, '\n') // Convert Windows line endings
            .replace(/\r/g, '\n')   // Convert remaining CR to LF
            .replace(/\n\s*\n/g, '\n') // Remove blank lines
            .trim();
        
        // Insert normalized text
        cm.replaceSelection(normalizedText);
    });
}

// Initialize WebSocket
function initWebSocket() {
    // Get the WebSocket URL from window.location or use a default
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = window.WS_URL || `${protocol}//${window.location.hostname}:10000/ws`;
    
    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to server');
            updateStatus(true);
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'code') {
                    editor.setValue(data.content);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from server');
            updateStatus(false);
            
            // Handle reconnection with exponential backoff
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectAttempts++;
                console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(initWebSocket, delay);
            } else {
                console.error('Max reconnection attempts reached');
                updateStatus(false, 'Connection failed. Please refresh the page.');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus(false);
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        updateStatus(false);
    }
}

// UI Elements
const languageSelect = document.getElementById('language');
const sendCodeBtn = document.getElementById('sendCode');
const copyCodeBtn = document.getElementById('copyCode');
const clearCodeBtn = document.getElementById('clearCode');
const statusBar = document.getElementById('status');

// Event Listeners
languageSelect.addEventListener('change', (e) => {
    editor.setOption('mode', e.target.value);
});

sendCodeBtn.addEventListener('click', () => {
    const code = editor.getValue();
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'code',
            content: code,
            username: username
        }));
    } else {
        alert('Not connected to server. Please wait for reconnection.');
    }
});

copyCodeBtn.addEventListener('click', () => {
    const code = editor.getValue();
    
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';  // Ensure it's always on screen
    textarea.style.opacity = '0';       // Make it invisible
    textarea.style.left = '0';
    textarea.style.top = '0';
    
    document.body.appendChild(textarea);
    
    try {
        // Select the text
        textarea.focus();
        textarea.select();
        
        // Try to copy
        const successful = document.execCommand('copy');
        if (successful) {
            alert('Code copied to clipboard!');
        } else {
            // If execCommand fails, try the Clipboard API
            navigator.clipboard.writeText(code).then(() => {
                alert('Code copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy code:', err);
                alert('Failed to copy code. Please select and copy manually.');
            });
        }
    } catch (err) {
        console.error('Failed to copy code:', err);
        alert('Failed to copy code. Please select and copy manually.');
    } finally {
        // Clean up
        document.body.removeChild(textarea);
    }
});

clearCodeBtn.addEventListener('click', () => {
    editor.setValue('');
});

// Helper Functions
function updateStatus(connected) {
    statusBar.textContent = connected ? 'Connected' : 'Disconnected';
    statusBar.className = 'status-bar ' + (connected ? 'connected' : 'disconnected');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCodeMirror();
    initWebSocket();
});