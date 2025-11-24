const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors({
    origin: true, // Allow any origin
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from root
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session Configuration
app.use(session({
    secret: 'spotify-clone-secret-key', // In prod, use env var
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Helper: Read/Write Users
function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Auth Middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Routes

// Auth Routes
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    users.push(newUser);
    saveUsers(users);

    req.session.user = { username };
    res.json({ message: 'Registered successfully', user: req.session.user });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = { username: user.username };
    res.json({ message: 'Logged in successfully', user: req.session.user });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

app.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ user: null });
    }
});

// Get all files (Protected)
app.get('/files', isAuthenticated, (req, res) => {
    let library = [];
    const filesJsonPath = path.join(__dirname, 'files.json');

    // 1. Read static files.json
    if (fs.existsSync(filesJsonPath)) {
        try {
            library = JSON.parse(fs.readFileSync(filesJsonPath, 'utf8'));
        } catch (err) {
            console.error('Error reading files.json:', err);
        }
    }

    // 2. Scan uploads folder dynamically
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const extensions = ['.mp3', '.mp4', '.m4a', '.wav', '.ogg', '.webm'];

        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (extensions.includes(ext)) {
                const relativePath = `uploads/${file}`;
                const exists = library.some(item => item.url === relativePath || item.url.endsWith(file));

                if (!exists) {
                    const title = path.basename(file, ext);
                    const type = ext === '.mp4' || ext === '.webm' ? 'mp4' : 'mp3';

                    library.push({
                        title: title,
                        artist: 'Local Library',
                        type: type,
                        url: relativePath,
                        cover: ''
                    });
                }
            }
        });
    }

    res.json(library);
});

// Upload endpoint (Protected)
app.post('/upload', isAuthenticated, upload.single('mediaFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const type = req.file.mimetype.startsWith('video/') ? 'mp4' : 'mp3';
    const relativePath = `uploads/${req.file.filename}`;

    const newFile = {
        title: title,
        artist: req.session.user.username, // Use uploader name
        type: type,
        url: relativePath,
        cover: ''
    };

    // Save to files.json for persistence
    const library = getUsers().length > 0 ? (fs.existsSync(path.join(__dirname, 'files.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'files.json'), 'utf8')) : []) : [];

    // Check if files.json exists, read it, append, save
    let currentLibrary = [];
    const filesJsonPath = path.join(__dirname, 'files.json');
    if (fs.existsSync(filesJsonPath)) {
        try {
            currentLibrary = JSON.parse(fs.readFileSync(filesJsonPath, 'utf8'));
        } catch (err) {
            console.error('Error reading files.json:', err);
        }
    }

    currentLibrary.push(newFile);
    fs.writeFileSync(filesJsonPath, JSON.stringify(currentLibrary, null, 2));

    res.json({
        message: 'File uploaded successfully',
        file: newFile
    });
});

// Delete endpoint (Protected)
app.delete('/delete/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    const filesJsonPath = path.join(__dirname, 'files.json');

    // 1. Delete from disk
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error('Error deleting file from disk:', err);
            return res.status(500).json({ error: 'Failed to delete file from disk' });
        }
    } else {
        // If file doesn't exist on disk, we still proceed to remove from JSON
        console.warn(`File not found on disk: ${filename}`);
    }

    // 2. Remove from files.json
    if (fs.existsSync(filesJsonPath)) {
        try {
            let library = JSON.parse(fs.readFileSync(filesJsonPath, 'utf8'));
            const initialLength = library.length;
            library = library.filter(item => !item.url.endsWith(filename));

            if (library.length < initialLength) {
                fs.writeFileSync(filesJsonPath, JSON.stringify(library, null, 2));
            }
        } catch (err) {
            console.error('Error updating files.json:', err);
            return res.status(500).json({ error: 'Failed to update library' });
        }
    }

    res.json({ message: 'File deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
