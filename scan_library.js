const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const FILES_JSON = path.join(__dirname, 'files.json');

// Supported extensions
const EXTENSIONS = ['.mp3', '.mp4', '.m4a', '.wav', '.ogg', '.webm'];

function scanLibrary() {
    console.log('Scanning library...');

    // 1. Read existing files.json
    let library = [];
    if (fs.existsSync(FILES_JSON)) {
        try {
            library = JSON.parse(fs.readFileSync(FILES_JSON, 'utf8'));
        } catch (err) {
            console.error('Error reading files.json:', err);
            library = [];
        }
    }

    // 2. Scan uploads directory
    if (!fs.existsSync(UPLOADS_DIR)) {
        console.log('Uploads directory not found. Creating it...');
        fs.mkdirSync(UPLOADS_DIR);
    }

    const files = fs.readdirSync(UPLOADS_DIR);
    let newCount = 0;

    files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (EXTENSIONS.includes(ext)) {
            const relativePath = `uploads/${file}`;

            // Check if already exists in library
            const exists = library.some(item => item.url === relativePath);

            if (!exists) {
                const title = path.basename(file, ext);
                const type = ext === '.mp4' || ext === '.webm' ? 'mp4' : 'mp3';

                const newItem = {
                    title: title,
                    artist: 'Local Library',
                    type: type,
                    url: relativePath,
                    cover: '' // Frontend will generate gradient cover
                };

                library.push(newItem);
                newCount++;
                console.log(`Added: ${file}`);
            }
        }
    });

    // 3. Save updated files.json
    if (newCount > 0) {
        fs.writeFileSync(FILES_JSON, JSON.stringify(library, null, 2));
        console.log(`\nSuccess! Added ${newCount} new files to files.json.`);
    } else {
        console.log('\nNo new files found.');
    }
}

scanLibrary();
