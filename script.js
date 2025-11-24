document.addEventListener('DOMContentLoaded', () => {
    const mediaGrid = document.getElementById('media-grid');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');

    // Load initial files
    fetch('files.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(item => createMediaCard(item));
        })
        .catch(error => console.error('Error loading files:', error));

    // Upload functionality
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('video/') ? 'mp4' : 'mp3';
            const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

            // Generate dynamic cover
            const coverUrl = generateCover(title);

            const newItem = {
                title: title,
                artist: 'Local Upload',
                type: type,
                url: url,
                cover: coverUrl
            };

            createMediaCard(newItem, true);
        });
        // Reset input
        fileInput.value = '';
    });

    function generateCover(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        // Spotify-like gradients
        const gradients = [
            ['#1DB954', '#191414'], // Green/Black
            ['#535353', '#121212'], // Gray/Black
            ['#4000F4', '#10003D'], // Blue/Dark Blue
            ['#E91429', '#3D050B'], // Red/Dark Red
            ['#F59B23', '#402809'], // Orange/Brown
            ['#B49BC8', '#2E2833']  // Lavender/Dark
        ];

        // Pick random gradient based on text char code sum to be deterministic
        const charSum = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const gradientColors = gradients[charSum % gradients.length];

        const gradient = ctx.createLinearGradient(0, 0, 300, 300);
        gradient.addColorStop(0, gradientColors[0]);
        gradient.addColorStop(1, gradientColors[1]);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 300);

        // Draw text (First Letter)
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
            mediaElement = `<video controls src="${item.url}"></video>`;
        } else {
            mediaElement = `<audio controls src="${item.url}"></audio>`;
        }

        // Use generated cover if item.cover is missing or empty
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
                <a href="${item.url}" download="${item.title}" class="download-btn">
                    <i class="fas fa-download"></i> Download
                </a>
                ${isVideo ? `<button class="download-btn export-btn" data-url="${item.url}" data-title="${item.title}">
                    <i class="fas fa-file-audio"></i> Export MP3
                </button>` : ''}
            </div>
        `;

        // Play functionality for the overlay button
        const playBtn = card.querySelector('.play-overlay');
        const mediaEl = card.querySelector(isVideo ? 'video' : 'audio');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            if (mediaEl.paused) {
                // Pause all other media
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

        // Export functionality
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
        // Fetch the video file
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Decode audio data
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Prepare for encoding
        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128kbps

        // Get PCM data
        const left = audioBuffer.getChannelData(0);
        const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

        // Convert Float32 to Int16
        const sampleBlockSize = 1152; // Multiple of 576
        const mp3Data = [];

        // Helper to convert float to 16-bit PCM
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

        // Encode
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

        // Create Blob and Download
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
