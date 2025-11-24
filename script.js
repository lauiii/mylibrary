document.addEventListener('DOMContentLoaded', () => {
    const mediaGrid = document.getElementById('media-grid');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');

    // Auth Elements
    const authModal = document.getElementById('auth-modal');
    // Close button removed
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const modalTitle = document.getElementById('modal-title');
    const switchAuth = document.getElementById('switch-auth');
    const toggleAuthText = document.getElementById('toggle-auth');

    const loginBtnSidebar = document.getElementById('login-btn-sidebar');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadSection = document.getElementById('upload-section');

    let isRegistering = false;
    let currentUser = null;

    const API_URL = 'http://localhost:3000';

    // Check Login Status on Load
    fetch(`${API_URL}/me`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                handleLoginSuccess(data.user);
                loadFiles();
            } else {
                handleLogoutSuccess();
            }
        })
        .catch(err => {
            console.error('Error checking auth:', err);
            handleLogoutSuccess();
        });

    // Auth Event Listeners
    switchAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        if (isRegistering) {
            modalTitle.textContent = 'Register';
            authSubmitBtn.textContent = 'Register';
            toggleAuthText.innerHTML = 'Already have an account? <a href="#" id="switch-auth">Login</a>';
        } else {
            modalTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Login';
            toggleAuthText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-auth">Register</a>';
        }
        // Re-attach listener to new link
        document.getElementById('switch-auth').addEventListener('click', arguments.callee);
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;
        const endpoint = isRegistering ? '/register' : '/login';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                authModal.style.display = 'none';
                handleLoginSuccess(data.user);
                usernameInput.value = '';
                passwordInput.value = '';
                loadFiles();
            } else {
                alert(data.error || 'Authentication failed');
            }
        } catch (err) {
            console.error('Auth error:', err);
            alert('An error occurred');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
            handleLogoutSuccess();
        } catch (err) {
            console.error('Logout error:', err);
        }
    });

    function handleLoginSuccess(user) {
        currentUser = user;
        loginBtnSidebar.style.display = 'none';
        userInfo.style.display = 'flex';
        usernameDisplay.textContent = user.username;
        uploadSection.style.display = 'block';
        authModal.style.display = 'none';
    }

    function handleLogoutSuccess() {
        currentUser = null;
        loginBtnSidebar.style.display = 'block';
        userInfo.style.display = 'none';
        usernameDisplay.textContent = '';
        uploadSection.style.display = 'none';
        mediaGrid.innerHTML = ''; // Clear content
        openModal(); // Force modal
    }

    function openModal() {
        authModal.style.display = 'block';
        // Reset to login state
        isRegistering = false;
        modalTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        toggleAuthText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-auth">Register</a>';

        const switchLink = document.getElementById('switch-auth');
        if (switchLink) {
            // Remove old listeners to prevent stacking (simple approach)
            const newLink = switchLink.cloneNode(true);
            switchLink.parentNode.replaceChild(newLink, switchLink);

            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                isRegistering = true;
                modalTitle.textContent = 'Register';
                authSubmitBtn.textContent = 'Register';
                toggleAuthText.innerHTML = 'Already have an account? <a href="#" id="switch-auth">Login</a>';
                // Recursive re-attach for toggle back
                document.getElementById('switch-auth').addEventListener('click', arguments.callee);
            });
        }
    }

    function loadFiles() {
        fetch(`${API_URL}/files`, { credentials: 'include' })
            .then(response => {
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                return response.json();
            })
            .then(data => {
                mediaGrid.innerHTML = '';
                data.forEach(item => createMediaCard(item));
            })
            .catch(error => {
                console.error('Error loading files:', error);
                if (error.message === 'Unauthorized') {
                    handleLogoutSuccess();
                }
            });
    }

    // Upload Preview Elements
    const uploadPreviewModal = document.getElementById('upload-preview-modal');
    const uploadTitleInput = document.getElementById('upload-title');
    const confirmUploadBtn = document.getElementById('confirm-upload-btn');
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    let selectedFile = null;

    // Upload functionality
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            // Pre-fill title with filename (without extension)
            const filename = selectedFile.name;
            const title = filename.substring(0, filename.lastIndexOf('.')) || filename;
            uploadTitleInput.value = title;

            uploadPreviewModal.style.display = 'block';
        }
        // Reset input so same file can be selected again if cancelled
        fileInput.value = '';
    });

    cancelUploadBtn.addEventListener('click', () => {
        uploadPreviewModal.style.display = 'none';
        selectedFile = null;
    });

    confirmUploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const title = uploadTitleInput.value.trim() || selectedFile.name;
        const formData = new FormData();
        formData.append('mediaFile', selectedFile);
        formData.append('title', title);

        confirmUploadBtn.disabled = true;
        confirmUploadBtn.textContent = 'Uploading...';

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                createMediaCard(result.file, true);
                uploadPreviewModal.style.display = 'none';
            } else {
                console.error('Upload failed');
                alert('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            confirmUploadBtn.disabled = false;
            confirmUploadBtn.textContent = 'Upload';
            selectedFile = null;
        }
    });

    function generateCover(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        const gradients = [
            ['#1DB954', '#191414'], ['#535353', '#121212'], ['#4000F4', '#10003D'],
            ['#E91429', '#3D050B'], ['#F59B23', '#402809'], ['#B49BC8', '#2E2833']
        ];

        const charSum = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const gradientColors = gradients[charSum % gradients.length];

        const gradient = ctx.createLinearGradient(0, 0, 300, 300);
        gradient.addColorStop(0, gradientColors[0]);
        gradient.addColorStop(1, gradientColors[1]);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 300);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 140px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const letter = text.charAt(0).toUpperCase();
        ctx.fillText(letter, 150, 150);

        return canvas.toDataURL('image/jpeg');
    }

    function createMediaCard(item, prepend = false) {
        const card = document.createElement('div');
        card.className = 'media-card';

        const isVideo = item.type === 'mp4' || item.type.includes('video');

        let mediaElement = '';
        if (isVideo) {
            mediaElement = `<video controls src="${API_URL}/${item.url}"></video>`;
        } else {
            mediaElement = `<audio controls src="${API_URL}/${item.url}"></audio>`;
        }

        const coverSrc = item.cover || generateCover(item.title);

        card.innerHTML = `
            <div class="card-image">
                <img src="${coverSrc}" alt="${item.title}">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title" title="${item.title}">${item.title}</div>
                <div class="card-artist">${item.artist}</div>
            </div>
            ${mediaElement}
            <div class="card-actions">
                <a href="${API_URL}/${item.url}" download="${item.title}" class="download-btn">
                    <i class="fas fa-download"></i> Download
                </a>
                ${isVideo ? `<button class="download-btn export-btn" data-url="${API_URL}/${item.url}" data-title="${item.title}">
                    <i class="fas fa-file-audio"></i> Export MP3
                </button>` : ''}
                <button class="download-btn delete-btn" style="border-color: #ff4444; color: #ff4444;" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        const playBtn = card.querySelector('.play-overlay');
        const mediaEl = card.querySelector(isVideo ? 'video' : 'audio');
        const deleteBtn = card.querySelector('.delete-btn');

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                try {
                    // Extract filename from URL
                    const filename = item.url.split('/').pop();
                    const response = await fetch(`${API_URL}/delete/${filename}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        card.remove();
                    } else {
                        alert('Failed to delete file');
                    }
                } catch (error) {
                    console.error('Error deleting file:', error);
                    alert('Error deleting file');
                }
            }
        });

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (mediaEl.paused) {
                document.querySelectorAll('audio, video').forEach(el => {
                    if (el !== mediaEl) el.pause();
                });
                mediaEl.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                mediaEl.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });

        mediaEl.addEventListener('play', () => {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        });

        mediaEl.addEventListener('pause', () => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });

        const exportBtn = card.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
                btn.disabled = true;

                try {
                    await convertToMp3(btn.dataset.url, btn.dataset.title);
                    btn.innerHTML = '<i class="fas fa-check"></i> Done';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }, 2000);
                } catch (error) {
                    console.error('Conversion failed:', error);
                    btn.innerHTML = '<i class="fas fa-times"></i> Failed';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }, 2000);
                }
            });
        }

        if (prepend) {
            mediaGrid.insertBefore(card, mediaGrid.firstChild);
        } else {
            mediaGrid.appendChild(card);
        }
    }

    async function convertToMp3(videoUrl, title) {
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);

        const left = audioBuffer.getChannelData(0);
        const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

        const sampleBlockSize = 1152;
        const mp3Data = [];

        const floatTo16BitPCM = (input, output) => {
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
        };

        const leftInt16 = new Int16Array(left.length);
        floatTo16BitPCM(left, leftInt16);

        let rightInt16;
        if (channels > 1) {
            rightInt16 = new Int16Array(right.length);
            floatTo16BitPCM(right, rightInt16);
        } else {
            rightInt16 = leftInt16;
        }

        for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
            const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
            const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);

            const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const mp3buf = mp3Encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
