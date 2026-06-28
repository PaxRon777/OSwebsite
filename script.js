// ===== State =====
const state = {
    zIndex: 100,
    openWindows: new Map(), // modalId -> { minimized, maximized, prevRect }
    drag: null, // { modal, startX, startY, startLeft, startTop }
};

// ===== Utility =====
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function getModalRect(modal) {
    return {
        left: modal.offsetLeft,
        top: modal.offsetTop,
        width: modal.offsetWidth,
        height: modal.offsetHeight,
    };
}

function setModalPos(modal, left, top) {
    const topBarH = 28;
    const taskbarH = 52;
    const desktopH = window.innerHeight - topBarH - taskbarH;
    const desktopW = window.innerWidth;
    modal.style.left = clamp(left, 0, desktopW - (modal.offsetWidth || 400)) + 'px';
    modal.style.top = clamp(top, topBarH, desktopH - (modal.offsetHeight || 300)) + 'px';
}

function bringToFront(modal) {
    state.zIndex++;
    modal.style.zIndex = state.zIndex;
}

// ===== Date/Time =====
function updateDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    document.getElementById('datetime').textContent = `${date}  ${time}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ===== Modal Management =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // If minimized, restore
    if (state.openWindows.has(modalId) && state.openWindows.get(modalId).minimized) {
        modal.classList.remove('minimized');
        const info = state.openWindows.get(modalId);
        info.minimized = false;
    }

    modal.classList.add('active');
    bringToFront(modal);

    // Position if first open
    if (!state.openWindows.has(modalId)) {
        const topBarH = 28;
        const taskbarH = 52;
        const desktopH = window.innerHeight - topBarH - taskbarH;
        const desktopW = window.innerWidth;
        const modalW = 600;
        const modalH = 450;
        const left = Math.max(20, (desktopW - modalW) / 2);
        const top = Math.max(topBarH + 20, (desktopH - modalH) / 2);
        modal.style.left = left + 'px';
        modal.style.top = top + 'px';
        modal.style.width = modalW + 'px';
        modal.style.height = modalH + 'px';
        state.openWindows.set(modalId, { minimized: false, maximized: false, prevRect: null });
    }

    // Update taskbar active state
    const iconMap = {
        settingsModal: 'openSettings',
        galleryModal: 'openGallery',
        textEditorModal: 'openTextEditor',
        terminalModal: 'openTerminal',
        browserModal: 'openBrowser',
        fileManagerModal: 'openFileManager',
    };
    const iconId = iconMap[modalId];
    if (iconId) {
        document.getElementById(iconId).classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    state.openWindows.delete(modalId);

    // Update taskbar
    const iconMap = {
        settingsModal: 'openSettings',
        galleryModal: 'openGallery',
        textEditorModal: 'openTextEditor',
        terminalModal: 'openTerminal',
        browserModal: 'openBrowser',
        fileManagerModal: 'openFileManager',
    };
    const iconId = iconMap[modalId];
    if (iconId) {
        document.getElementById(iconId).classList.remove('active');
    }
}

function minimizeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('minimized');
    const info = state.openWindows.get(modalId);
    if (info) info.minimized = true;
}

function maximizeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const info = state.openWindows.get(modalId);
    if (!info) return;

    if (info.maximized) {
        // Restore
        if (info.prevRect) {
            modal.style.left = info.prevRect.left + 'px';
            modal.style.top = info.prevRect.top + 'px';
            modal.style.width = info.prevRect.width + 'px';
            modal.style.height = info.prevRect.height + 'px';
        }
        info.maximized = false;
    } else {
        // Maximize
        info.prevRect = getModalRect(modal);
        modal.style.left = '0px';
        modal.style.top = '28px';
        modal.style.width = window.innerWidth + 'px';
        modal.style.height = (window.innerHeight - 28 - 52) + 'px';
        info.maximized = true;
    }
}

// ===== Dragging =====
function initDrag(modal) {
    const header = modal.querySelector('.modal-header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.modal-btn')) return;
        const info = state.openWindows.get(modal.id);
        if (info && info.maximized) return;

        bringToFront(modal);
        state.drag = {
            modal,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: modal.offsetLeft,
            startTop: modal.offsetTop,
        };
        e.preventDefault();
    });

    header.addEventListener('dblclick', (e) => {
        if (e.target.closest('.modal-btn')) return;
        maximizeModal(modal.id);
    });
}

document.addEventListener('mousemove', (e) => {
    if (!state.drag) return;
    const dx = e.clientX - state.drag.startX;
    const dy = e.clientY - state.drag.startY;
    setModalPos(state.drag.modal, state.drag.startLeft + dx, state.drag.startTop + dy);
});

document.addEventListener('mouseup', () => {
    state.drag = null;
});

// ===== Modal Button Bindings =====
function bindModalButtons(modalId) {
    const prefix = modalId.replace('Modal', '');
    const minimizeBtn = document.getElementById(prefix + 'Minimize');
    const maximizeBtn = document.getElementById(prefix + 'Maximize');
    const closeBtn = document.getElementById(prefix + 'Close');

    if (minimizeBtn) minimizeBtn.addEventListener('click', () => minimizeModal(modalId));
    if (maximizeBtn) maximizeBtn.addEventListener('click', () => maximizeModal(modalId));
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modalId));
}

// ===== Taskbar Icon Bindings =====
function bindTaskbarIcon(iconId, modalId) {
    const icon = document.getElementById(iconId);
    if (!icon) return;

    icon.addEventListener('click', () => {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (modal.classList.contains('active')) {
            if (state.openWindows.has(modalId) && state.openWindows.get(modalId).minimized) {
                openModal(modalId);
            } else {
                minimizeModal(modalId);
            }
        } else {
            openModal(modalId);
        }
    });
}

// ===== Search =====
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Dummy searchable content
const searchableContent = [
    { title: 'Getting Started Guide', desc: 'Introduction to the OS environment', icon: 'fa-book', url: 'https://wikipedia.org' },
    { title: 'System Documentation', desc: 'Technical specs and API references', icon: 'fa-file-lines', url: 'https://developer.mozilla.org' },
    { title: 'Community Forum', desc: 'Connect with other users', icon: 'fa-users', url: 'https://reddit.com' },
    { title: 'Software Repository', desc: 'Browse and download applications', icon: 'fa-box-open', url: 'https://github.com' },
    { title: 'Design Resources', desc: 'Templates, icons, and assets', icon: 'fa-palette', url: 'https://unsplash.com' },
    { title: 'Weather Forecast', desc: 'Real-time weather data', icon: 'fa-cloud-sun', url: 'https://weather.com' },
    { title: 'News Headlines', desc: 'Latest world news updates', icon: 'fa-newspaper', url: 'https://bbc.com' },
    { title: 'Code Playground', desc: 'Online coding environment', icon: 'fa-code', url: 'https://replit.com' },
    { title: 'Music Streaming', desc: 'Listen to your favorite tracks', icon: 'fa-music', url: 'https://spotify.com' },
    { title: 'Video Platform', desc: 'Watch and share videos', icon: 'fa-play', url: 'https://youtube.com' },
    { title: 'Cloud Storage', desc: 'Store and access files anywhere', icon: 'fa-cloud', url: 'https://drive.google.com' },
    { title: 'Email Client', desc: 'Manage your inbox', icon: 'fa-envelope', url: 'https://mail.google.com' },
];

document.getElementById('openSearch').addEventListener('click', () => {
    searchOverlay.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
});

searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResults.classList.remove('has-results');
        searchResults.innerHTML = '';
    }
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
        searchResults.classList.remove('has-results');
        searchResults.innerHTML = '';
        return;
    }

    const filtered = searchableContent.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        searchResults.classList.remove('has-results');
        searchResults.innerHTML = '<div class="search-result-item"><span class="result-text" style="color: var(--text-secondary);">No results found</span></div>';
        return;
    }

    searchResults.classList.add('has-results');
    searchResults.innerHTML = filtered.map(item => `
        <div class="search-result-item" data-url="${item.url}">
            <i class="fa-solid ${item.icon}"></i>
            <div class="result-text">
                ${item.title}
                <small>${item.desc}</small>
            </div>
        </div>
    `).join('');

    // Bind click on results
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            if (url) {
                searchOverlay.classList.remove('active');
                searchInput.value = '';
                searchResults.classList.remove('has-results');
                searchResults.innerHTML = '';
                // Open in browser modal
                const browserModal = document.getElementById('browserModal');
                const urlInput = browserModal.querySelector('.browser-url');
                urlInput.value = url;
                openModal('browserModal');
                // Try to load URL
                const iframe = browserModal.querySelector('iframe');
                if (iframe) iframe.src = url;
            }
        });
    });
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResults.classList.remove('has-results');
        searchResults.innerHTML = '';
    }
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchOverlay.classList.remove('active');
            searchInput.value = '';
            searchResults.classList.remove('has-results');
            searchResults.innerHTML = '';
            // Open in browser
            openModal('browserModal');
            const browserModal = document.getElementById('browserModal');
            const urlInput = browserModal.querySelector('.browser-url');
            let url = query;
            if (!url.includes('://')) url = 'https://' + url;
            urlInput.value = url;
            const iframe = browserModal.querySelector('iframe');
            if (iframe) iframe.src = url;
        }
    }
});

// ===== Settings =====
const varMap = { background: 'bg-primary', accent: 'accent' };

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        const type = swatch.dataset.type;
        const value = swatch.dataset.value;
        const cssVar = '--' + (varMap[type] || type);
        document.documentElement.style.setProperty(cssVar, value);

        // Update selected state
        swatch.parentElement.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');

        // Sync color picker
        const picker = swatch.parentElement.querySelector('.color-picker');
        if (picker) picker.value = value;
    });
});

document.querySelectorAll('.color-picker').forEach(picker => {
    picker.addEventListener('input', (e) => {
        const type = e.target.dataset.type;
        const value = e.target.value;
        const cssVar = '--' + (varMap[type] || type);
        document.documentElement.style.setProperty(cssVar, value);

        // Deselect swatches
        picker.parentElement.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    });
});

// ===== Gallery =====
function generateGallery() {
    const grid = document.getElementById('galleryGrid');
    const colors = [
        ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
        ['#ffecd2', '#fcb69f'], ['#ff9a9e', '#fecfef'], ['#a1c4fd', '#c2e9fb'],
        ['#d4fc79', '#96e6a1'], ['#84fab0', '#8fd3f4'], ['#cfd9df', '#e2ebf0'],
        ['#f5576c', '#ff6a00'], ['#667eea', '#00c6fb'], ['#89f7fe', '#66a6ff'],
        ['#fddb92', '#d1fdff'], ['#9890e3', '#b1f4cf'], ['#ebc0fd', '#d9ded8'],
    ];

    grid.innerHTML = colors.map((c, i) => {
        const hue = (i * 37) % 360;
        return `
            <div class="gallery-item" style="background: linear-gradient(135deg, ${c[0]}, ${c[1]});">
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:24px;">
                    <i class="fa-solid fa-image"></i>
                </div>
            </div>
        `;
    }).join('');
}
generateGallery();

// ===== Terminal =====
const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');

const terminalCommands = {
    help: () => [
        'Available commands:',
        '  help       - Show this help message',
        '  clear      - Clear the terminal',
        '  date       - Show current date and time',
        '  whoami     - Show current user',
        '  uname      - Show system info',
        '  ls         - List files',
        '  pwd        - Print working directory',
        '  echo [msg] - Print message',
        '  neofetch   - System information',
        '  color [hex]- Set terminal accent color',
    ],
    clear: () => {
        terminalOutput.innerHTML = '';
        return [];
    },
    date: () => [new Date().toString()],
    whoami: () => ['user'],
    uname: () => ['OS Desktop Kernel 1.0.0 (Web)'],
    ls: () => ['Documents/', 'Projects/', 'Backups/', 'readme.md', 'config.json', 'wallpaper.png'],
    pwd: () => ['/home/user'],
    neofetch: () => [
        '   ___       user@os',
        '  / __|  ___  ___  _ _',
        ' | (__ / -_)/ _ \\| \' \\',
        '  \\___|\\___|\\___/_||_|',
        '   ',
        '  OS: OS Desktop 1.0',
        '  Kernel: Web/HTML5',
        '  Shell: os-term 1.0',
        '  Theme: Charcoal Dark',
        '  Uptime: ' + Math.floor(Math.random() * 24) + ' hours',
    ],
};

terminalInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const cmd = terminalInput.value.trim();
    terminalInput.value = '';

    if (!cmd) return;

    // Echo command
    addTerminalLine(`user@os:~$ ${cmd}`, 'info');

    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === 'echo') {
        addTerminalLine(args.join(' '));
    } else if (command === 'color' && args[0]) {
        const hex = args[0];
        if (/^#[0-9a-f]{6}$/i.test(hex)) {
            addTerminalLine(`Accent color changed to ${hex}`);
            document.documentElement.style.setProperty('--accent', hex);
        } else {
            addTerminalLine(`Invalid color: ${hex}`, 'error');
        }
    } else if (command === 'clear') {
        terminalOutput.innerHTML = '';
    } else if (terminalCommands[command]) {
        const result = terminalCommands[command]();
        result.forEach(line => addTerminalLine(line));
    } else {
        addTerminalLine(`Command not found: ${command}`, 'error');
    }
});

function addTerminalLine(text, className = '') {
    const line = document.createElement('div');
    line.className = 'terminal-line' + (className ? ' ' + className : '');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// ===== Browser Navigation =====
const browserFrame = document.getElementById('browserFrame');
const browserError = document.getElementById('browserError');
const browserExternalLink = document.getElementById('browserExternalLink');
const browserUrlInput = document.querySelector('.browser-url');

function navigateBrowser(url) {
    url = url.trim();
    if (!url) return;

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    browserUrlInput.value = url;
    browserFrame.src = url;

    // Show iframe, hide error overlay
    browserFrame.style.display = 'block';
    browserError.style.display = 'none';

    // Wait for iframe to load, then check if it's empty
    // For same-origin or embeddable sites we can inspect; for cross-origin we assume success
    setTimeout(() => {
        try {
            const doc = browserFrame.contentDocument || browserFrame.contentWindow.document;
            // If the iframe loaded content, we're good (even if empty body means a redirect to blank)
            // If the iframe was blocked by X-Frame-Options, it will have no body at all
            if (!doc || !doc.body || doc.body.innerHTML.trim() === '') {
                browserFrame.style.display = 'none';
                browserError.style.display = 'flex';
                browserExternalLink.href = url;
            }
        } catch (e) {
            // Cross-origin — site loaded successfully but we can't inspect it
            // This is the normal case for most websites
            browserFrame.style.display = 'block';
            browserError.style.display = 'none';
        }
    }, 2000);
}

// Go button click
const goBtn = document.querySelector('.browser-toolbar .browser-btn:last-child');
if (goBtn) {
    goBtn.addEventListener('click', () => {
        navigateBrowser(browserUrlInput.value);
    });
}

// Enter key on URL input
if (browserUrlInput) {
    browserUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateBrowser(browserUrlInput.value);
        }
    });
}

// Back button
const backBtn = document.querySelectorAll('.browser-btn')[0];
if (backBtn) {
    backBtn.addEventListener('click', () => {
        try {
            browserFrame.contentWindow.history.back();
        } catch (e) {
            // Cross-origin — can't navigate back
        }
    });
}

// Forward button
const fwdBtn = document.querySelectorAll('.browser-btn')[1];
if (fwdBtn) {
    fwdBtn.addEventListener('click', () => {
        try {
            browserFrame.contentWindow.history.forward();
        } catch (e) {
            // Cross-origin — can't navigate forward
        }
    });
}

// Refresh button
const refreshBtn = document.querySelectorAll('.browser-btn')[2];
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        try {
            browserFrame.contentWindow.location.reload();
        } catch (e) {
            browserFrame.src = browserFrame.src;
        }
    });
}

// ===== Init =====
function init() {
    // Bind all modals
    const modals = ['settingsModal', 'galleryModal', 'textEditorModal', 'terminalModal', 'browserModal', 'fileManagerModal'];
    modals.forEach(id => {
        bindModalButtons(id);
        initDrag(document.getElementById(id));
    });

    // Bind taskbar icons
    const iconMap = [
        ['openSearch', 'searchOverlay'],
        ['openSettings', 'settingsModal'],
        ['openGallery', 'galleryModal'],
        ['openTextEditor', 'textEditorModal'],
        ['openTerminal', 'terminalModal'],
        ['openBrowser', 'browserModal'],
        ['openFileManager', 'fileManagerModal'],
    ];
    iconMap.forEach(([iconId, modalId]) => {
        if (modalId.startsWith('search')) {
            // Search is handled separately
            return;
        }
        bindTaskbarIcon(iconId, modalId);
    });

    // Keyboard shortcut: Escape to close search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.remove('active');
            searchInput.value = '';
            searchResults.classList.remove('has-results');
            searchResults.innerHTML = '';
        }
    });
}

init();
