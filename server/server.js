const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir); } catch (err) { console.error(err); }
}

// Root route: Serve login.html by default (MUST be before express.static)
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.use(express.static(path.join(__dirname, '..')));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/changex';
const JWT_SECRET = process.env.JWT_SECRET || 'changex-secret-key-2024';

// Schemas
const lineSchema = new mongoose.Schema({
    lineNumber: { type: Number, required: true, unique: true },
    current: { 
        style: { type: String, default: 'No Data' }, 
        progress: { type: Number, default: 0 }, 
        time: { type: String, default: '00:00' }, 
        machineAvail: { type: String, default: '0%' }, 
        workaidsAvail: { type: String, default: '0%' }, 
        delay: { type: String, default: 'None' },
        smv: { type: Number, default: 0 },
        obFilePath: { type: String, default: null }
    },
    upcoming: { 
        style: { type: String, default: 'No Data' }, 
        prep: { type: Number, default: 0 }, 
        time: { type: String, default: '00:00' }, 
        nextStep: { type: String, default: 'N/A' }, 
        manpower: { type: String, default: '0' },
        smv: { type: Number, default: 0 },
        obFilePath: { type: String, default: null }
    },
    machineUtilization: {
        cutting: { type: Number, default: 0 },
        sewing: { type: Number, default: 0 },
        embroidery: { type: Number, default: 0 },
        finishing: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now }
});

const Line = mongoose.models.Line || mongoose.model('Line', lineSchema);

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    employeeID: { type: Number, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Parse OB files and calculate total SMV
function parseOBFiles() {
    const obDir = path.join(__dirname, '..', 'OB');
    const obDataList = [];
    if (!fs.existsSync(obDir)) return obDataList;

    try {
        const files = fs.readdirSync(obDir).filter(f => f.endsWith('.xlsx'));
        files.forEach(file => {
            try {
                const fullPath = path.join(obDir, file);
                const workbook = xlsx.readFile(fullPath);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

                let styleRef = '', manpower = 0;
                for (let r = 0; r < 10; r++) {
                    const row = rows[r];
                    if (!row) continue;
                    row.forEach((cell, idx) => {
                        const cStr = String(cell || '').toUpperCase();
                        if (cStr.includes('STYLE REF') || cStr.includes('710B')) {
                            styleRef = String(row[idx + 1] || cell).trim().split('\r')[0].split('\n')[0];
                        }
                        if (cStr.includes('MANPOWER')) manpower = parseInt(row[idx + 1]) || 0;
                    });
                }
                
                let tableHeaderRow = -1;
                // Search entire sheet for header row
                for (let r = 0; r < rows.length; r++) {
                    if (rows[r] && rows[r].includes('Machine')) { tableHeaderRow = r; break; }
                }

                if (tableHeaderRow !== -1) {
                    const header = rows[tableHeaderRow];
                    const smvIdx = header.indexOf('SMV');
                    const toolIdx = header.indexOf('Tool / Folder');
                    const tools = new Set();
                    let totalSMV = 0;

                    if (smvIdx === -1) {
                        console.warn(`⚠️ SMV column not found in ${file}`);
                    } else {
                        for (let r = tableHeaderRow + 1; r < rows.length; r++) {
                            const row = rows[r];
                            if (!row || !row[0]) continue;
                            if (toolIdx !== -1 && row[toolIdx] && String(row[toolIdx]).trim() !== 'N/A') tools.add(String(row[toolIdx]).trim());
                            const val = parseFloat(row[smvIdx]);
                            if (!isNaN(val) && val > 0) totalSMV += val;
                        }
                    }

                    // Only include files that have valid SMV data
                    if (totalSMV > 0) {
                        obDataList.push({ 
                            styleName: file.replace('.xlsx', ''), 
                            manpower, 
                            smv: parseFloat(totalSMV.toFixed(2)), 
                            tools: Array.from(tools), 
                            filePath: fullPath 
                        });
                    } else {
                        console.warn(`⚠️ Skipping ${file}: no valid SMV data found`);
                    }
                } else {
                    console.warn(`⚠️ Skipping ${file}: no OB table header found`);
                }
            } catch (e) { console.error(`Error parsing ${file}:`, e); }
        });
    } catch (e) { console.error(e); }
    return obDataList;
}

async function syncDataFromLocalFile() {
    const obDataList = parseOBFiles();
    if (obDataList.length === 0) return console.log('⚠️ No OB files found to sync.');

    try {
        for (let i = 1; i <= 11; i++) {
            // Pick two different random indices from our OB list
            const idx1 = Math.floor(Math.random() * obDataList.length);
            let idx2 = Math.floor(Math.random() * obDataList.length);
            if (obDataList.length > 1) {
                while (idx2 === idx1) {
                    idx2 = Math.floor(Math.random() * obDataList.length);
                }
            }

            const rOB = obDataList[idx1];
            const uOB = obDataList[idx2];

            await Line.findOneAndUpdate({ lineNumber: i }, {
                $set: {
                    'current.style': rOB.styleName,
                    'current.progress': Math.floor(Math.random() * 40) + 40,
                    'current.time': '12:45',
                    'current.machineAvail': '95%',
                    'current.workaidsAvail': '98%',
                    'current.smv': rOB.smv,
                    'current.obFilePath': rOB.filePath,
                    'upcoming.style': uOB.styleName,
                    'upcoming.prep': 30,
                    'upcoming.time': '45 min',
                    'upcoming.nextStep': uOB.tools.length > 0 ? uOB.tools.slice(0, 2).join(', ') : 'Standard Setup',
                    'upcoming.manpower': uOB.manpower + ' Operators',
                    'upcoming.smv': uOB.smv,
                    'upcoming.obFilePath': uOB.filePath,
                    lastUpdated: new Date()
                }
            }, { upsert: true });
        }
        console.log('✅ Global Data Sync Complete (11 lines mapped to real OB files)');
    } catch (e) { console.error('Sync error:', e); }
}

// Routes
app.get('/api/lines', async (req, res) => {
    try {
        const lines = await Line.find().sort({ lineNumber: 1 });
        res.json(lines);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/open-ob', async (req, res) => {
    try {
        const { style, type, line } = req.query;
        const lineData = await Line.findOne({ lineNumber: parseInt(line) });
        if (!lineData) return res.status(404).send('Line not found');
        
        const filePath = type === 'current' ? lineData.current.obFilePath : lineData.upcoming.obFilePath;
        
        if (filePath && fs.existsSync(filePath)) {
            return res.download(filePath);
        }
        res.status(404).send(`File not found for style: ${style}`);
    } catch (e) { res.status(500).send('Error'); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { employeeID, password } = req.body;
        const user = await User.findOne({ employeeID });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Fail' });
        res.json({ token: jwt.sign({ id: user._id }, JWT_SECRET), user: { name: user.name, employeeID: user.employeeID } });
    } catch (err) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { name, employeeID, password } = req.body;
        const hash = await bcrypt.hash(password, 12);
        await User.create({ name, employeeID, password: hash });
        res.status(201).json({ message: 'OK' });
    } catch (err) { res.status(500).json({ message: 'Error' }); }
});

process.on('uncaughtException', (err) => console.error('Global Error:', err));

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        syncDataFromLocalFile();
    })
    .catch(err => console.error('❌ Connection error:', err));

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Running on http://localhost:${PORT}`));
