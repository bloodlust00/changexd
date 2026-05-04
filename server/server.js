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
        stageName: { type: String, default: 'Setup' },
        time: { type: String, default: '00:00' }, 
        machineAvail: { type: String, default: '0%' }, 
        workaidsAvail: { type: String, default: '0%' }, 
        delay: { type: String, default: 'None' },
        smv: { type: Number, default: 0 },
        excelFilePath: { type: String, default: null },
        pdfFilePath: { type: String, default: null }
    },
    upcoming: { 
        style: { type: String, default: 'No Data' }, 
        prep: { type: Number, default: 0 }, 
        time: { type: String, default: '00:00' }, 
        nextStep: { type: String, default: 'N/A' }, 
        manpower: { type: String, default: '0' },
        smv: { type: Number, default: 0 },
        excelFilePath: { type: String, default: null },
        pdfFilePath: { type: String, default: null }
    },
    upcomingQueue: { type: Array, default: [] },
    pushHistory: { type: Array, default: [] },
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
    const obDir = path.join(__dirname, '..', 'data', 'OB');
    const pdfDir = path.join(__dirname, '..', 'data', 'TECHPACKS');
    const obDataList = [];
    if (!fs.existsSync(obDir)) return obDataList;

    try {
        const pdffiles = fs.existsSync(pdfDir) ? fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith('.pdf')) : [];
        const files = fs.readdirSync(obDir).filter(f => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'));
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

                    const smvRow = rows.find(r => r && r.some && r.some(c => typeof c === 'string' && c.toUpperCase().includes('TOTAL SMV WITH ALLOWANCES')));
                    if (smvRow) {
                        const smvVal = smvRow.find(c => typeof c === 'number');
                        if (smvVal) totalSMV = smvVal;
                    }

                    // Enhanced matcher to find associated PDF
                    let matchedPdf = null;
                    const baseName = file.replace(/\.xlsx$/i, '').replace(/[^a-zA-Z0-9]/g, '');
                    const fallbackNamePrefix = baseName.substring(0, 5); 
                    for (let p of pdffiles) {
                        const pClean = p.replace(/[^a-zA-Z0-9]/g, '');
                        if (pClean.includes(fallbackNamePrefix)) {
                            matchedPdf = path.join(pdfDir, p);
                            break;
                        }
                    }
                    if (!matchedPdf && pdffiles.length > 0) matchedPdf = path.join(pdfDir, pdffiles[0]);

                    if (totalSMV === 0) totalSMV = 10; // Fallback SMV if parsing fails

                    obDataList.push({ 
                        styleName: file.replace('.xlsx', ''), 
                        manpower, 
                        smv: parseFloat(totalSMV.toFixed(2)), 
                        tools: Array.from(tools), 
                        excelFilePath: fullPath,
                        pdfFilePath: matchedPdf
                    });
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
        const stages = [
            { name: 'Fabric Inspection', pct: 5, delays: ['Fabric defects', 'Inspection backlog'] },
            { name: 'Cutting', pct: 10, delays: ['Marker delay', 'Fabric shortage', 'Machine downtime'] },
            { name: 'Bundling', pct: 5, delays: ['Miscount', 'Labeling errors'] },
            { name: 'Front Panel Operations', pct: 10, delays: ['Operator inefficiency', 'Rework'] },
            { name: 'Back Panel Operations', pct: 8, delays: ['Quality issues', 'Machine breakdown'] },
            { name: 'Sleeve Assembly', pct: 10, delays: ['Skill gap', 'Balancing issue'] },
            { name: 'Collar & Cuff Making', pct: 12, delays: ['High precision work', 'Rejection'] },
            { name: 'Main Assembly (Joining)', pct: 15, delays: ['Line imbalance', 'Waiting time'] },
            { name: 'Button Attach', pct: 5, delays: ['Machine stoppage', 'Thread issues'] },
            { name: 'Finishing (Trimming, Ironing)', pct: 10, delays: ['Iron delay', 'Thread trimming backlog'] },
            { name: 'Inspection (QC)', pct: 5, delays: ['High rejection rate'] },
            { name: 'Packing', pct: 5, delays: ['Packing material shortage'] }
        ];

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

            const queue = [];
            for (let k = 0; k < 7; k++) {
                const qIdx = Math.floor(Math.random() * obDataList.length);
                const qOB = obDataList[qIdx];
                queue.push({
                    style: qOB.styleName,
                    prep: Math.floor(Math.random() * 80) + 10,
                    time: (10 + Math.floor(Math.random() * 2)) + ' min',
                    nextStep: qOB.tools.length > 0 ? qOB.tools.slice(0, 2).join(', ') : 'Standard Setup',
                    manpower: (Math.floor(Math.random() * 11) + 85) + ' Operators',
                    smv: qOB.smv,
                    excelFilePath: qOB.excelFilePath,
                    pdfFilePath: qOB.pdfFilePath
                });
            }

            const randomStageIdx = Math.floor(Math.random() * stages.length);
            let totalProgress = 0;
            for (let j = 0; j <= randomStageIdx; j++) {
                totalProgress += stages[j].pct;
            }
            const currentStage = stages[randomStageIdx];
            const randomDelay = currentStage.delays[Math.floor(Math.random() * currentStage.delays.length)];

            await Line.findOneAndUpdate({ lineNumber: i }, {
                $set: {
                    'current.style': rOB.styleName,
                    'current.progress': totalProgress,
                    'current.stageName': currentStage.name,
                    'current.time': '12:45',
                    'current.machineAvail': '95%',
                    'current.workaidsAvail': '98%',
                    'current.delay': randomDelay,
                    'current.smv': rOB.smv,
                    'current.excelFilePath': rOB.excelFilePath,
                    'current.pdfFilePath': rOB.pdfFilePath,
                    'upcoming.style': uOB.styleName,
                    'upcoming.prep': Math.floor(Math.random() * 80) + 10,
                    'upcoming.time': (10 + Math.floor(Math.random() * 2)) + ' min',
                    'upcoming.nextStep': uOB.tools.length > 0 ? uOB.tools.slice(0, 2).join(', ') : 'Standard Setup',
                    'upcoming.manpower': (Math.floor(Math.random() * 11) + 85) + ' Operators',
                    'upcoming.smv': uOB.smv,
                    'upcoming.excelFilePath': uOB.excelFilePath,
                    'upcoming.pdfFilePath': uOB.pdfFilePath,
                    'upcomingQueue': queue,
                    lastUpdated: new Date()
                }
            }, { upsert: true });
        }
        console.log('✅ Global Data Sync Complete (11 lines mapped to files)');
    } catch (e) { console.error('Sync error:', e); }
}

// Routes
// Parse machine details from MACHINES LIST (2).xlsx
function parseMachineDetails() {
    const filePath = path.join(__dirname, '..', 'MACHINES LIST (2).xlsx');
    const result = {};
    if (!fs.existsSync(filePath)) return result;

    try {
        const wb = xlsx.readFile(filePath);
        
        for (let i = 1; i <= 11; i++) {
            const sheetName = 'L' + i;
            const sheet = wb.Sheets[sheetName];
            if (!sheet) continue;
            
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // Detect column positions from header row
            let sectionCol = -1, totalCol = -1;
            for (let rIdx = 0; rIdx < Math.min(15, rows.length); rIdx++) {
                const r = rows[rIdx];
                if (!r) continue;
                const idx = r.findIndex(c => String(c || '').toUpperCase().includes('SECTION'));
                if (idx !== -1) { 
                    sectionCol = idx; 
                    const tIdx = r.findIndex(c => String(c || '').toUpperCase().includes('TOTAL'));
                    if (tIdx !== -1) {
                        totalCol = tIdx;
                    } else {
                        totalCol = idx + 4; 
                    }
                    break; 
                }
            }

            if (sectionCol === -1 || totalCol === -1) continue;

            let currentSection = null;
            const sections = [];
            const seen = new Set();

            rows.forEach(r => {
                if (!r || r.length === 0) return;
                const sec = r[sectionCol] ? String(r[sectionCol]).trim().toUpperCase() : null;
                const tot = r[totalCol];
                if (sec) currentSection = sec;
                if (tot != null && !isNaN(tot) && Number(tot) > 0 && currentSection && !seen.has(currentSection)) {
                    sections.push({ section: currentSection, total: Number(tot) });
                    seen.add(currentSection);
                }
            });

            result[i] = sections;
        }
    } catch (e) {
        console.error('Error parsing machine details:', e);
    }
    return result;
}

// Parse Machine required for next changeover from MACHINES LIST (2).xlsx
function parseMachineRequired() {
    const filePath = path.join(__dirname, '..', 'MACHINES LIST (2).xlsx');
    const result = {};
    if (!fs.existsSync(filePath)) return result;

    function getShortForm(typeStr) {
        if (!typeStr) return '';
        const upper = typeStr.toUpperCase().trim();
        // Clean trailing (2), (4) etc.
        const cleanStr = upper.replace(/\s*\(\d+\)\s*/g, '').trim();
        const map = {
            'SINGLE NEEDLE LOCKSTITCH': 'SNLS',
            'BUTTON HOLE': 'BH',
            'COLLAR BLOCKING MACHINE': 'CBM',
            'COLLAR NOTCH': 'CN',
            'IRON TABLE': 'IT',
            'PATTERN SEWER MACHINE': 'PSM',
            'SINGLE NEEDLE EDGE CUTTING': 'SNEC',
            'BUTTON STITCH': 'BS',
            'CUFF BLOCKING MACHINE': 'CUBM',
            'BACK YOKE STACKER': 'BYS',
            'RIGHT HEM STACKER': 'RHS',
            'OVERLOCK': 'OL',
            'ROTARY FUSING MACHINE': 'RFM',
            'DOUBLE NEEDLE CHAIN STITCH': 'DNCS',
            'GUSSET PRESSING MACHINE': 'GPM',
            'BARCODE SCANNER': 'BCS',
            'FUSING MACHINE': 'FM',
            'END CUTTER MACHINE': 'ECM',
            'FEED OFF ARM': 'FOA'
        };
        if (map[cleanStr]) return map[cleanStr];
        
        // Fallback: take first letter of each word
        return cleanStr.replace(/[^A-Z\s]/g, '').split(/\s+/).map(w => w[0]).join('');
    }

    try {
        const wb = xlsx.readFile(filePath);
        for (let i = 1; i <= 11; i++) {
            const sheetName = 'L' + i;
            const sheet = wb.Sheets[sheetName];
            if (!sheet) continue;
            
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            let tCol = -1, cCol = -1, startRow = -1;
            
            // Find columns
            for (let rIdx = 0; rIdx < Math.min(10, rows.length); rIdx++) {
                const row = rows[rIdx];
                if (!row) continue;
                for (let cIdx = 0; cIdx < row.length; cIdx++) {
                    const v = String(row[cIdx] || '').toUpperCase();
                    if (v.includes('MACHINE TYPE')) tCol = cIdx;
                    if (v.includes('MACHINE COUNT')) cCol = cIdx;
                }
                if (tCol !== -1 && cCol !== -1) {
                    startRow = rIdx + 1;
                    break;
                }
            }
            
            if (tCol === -1 || cCol === -1) continue;
            
            const machineCounts = {};
            for (let rIdx = startRow; rIdx < rows.length; rIdx++) {
                const row = rows[rIdx];
                if (!row) continue;
                
                const typeVal = row[tCol];
                const countVal = parseInt(row[cCol]);
                
                if (typeVal && !isNaN(countVal) && countVal > 0) {
                    const typeStr = String(typeVal).trim();
                    const shortForm = getShortForm(typeStr);
                    if (shortForm) {
                        if (!machineCounts[shortForm]) {
                            machineCounts[shortForm] = { full: typeStr, count: 0 };
                        }
                        machineCounts[shortForm].count += countVal;
                    }
                }
            }
            
            // Format for tooltip
            result[i] = Object.keys(machineCounts).map(k => `${k}: ${machineCounts[k].count}`);
        }
    } catch (e) {
        console.error('Error parsing machine required:', e);
    }
    return result;
}

app.get('/api/machine-details', (req, res) => {
    try {
        const data = parseMachineDetails();
        res.json(data);
    } catch (e) {
        res.status(500).json({});
    }
});

app.get('/api/machine-required', (req, res) => {
    try {
        const data = parseMachineRequired();
        res.json(data);
    } catch (e) {
        res.status(500).json({});
    }
});

app.get('/api/lines', async (req, res) => {
    try {
        const lines = await Line.find().sort({ lineNumber: 1 });
        res.json(lines);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/lines/push/:lineNumber', async (req, res) => {
    try {
        const lineNumber = parseInt(req.params.lineNumber);
        const line = await Line.findOne({ lineNumber });
        if (!line) return res.status(404).json({ message: 'Line not found' });

        const obDataList = parseOBFiles();

        line.current = {
            style: line.upcoming.style,
            progress: 0,
            stageName: 'Setup',
            time: '00:00',
            machineAvail: '100%',
            workaidsAvail: '100%',
            delay: 'None',
            smv: line.upcoming.smv,
            excelFilePath: line.upcoming.excelFilePath,
            pdfFilePath: line.upcoming.pdfFilePath
        };

        if (!line.pushHistory) line.pushHistory = [];
        line.pushHistory.push({
            style: line.upcoming.style,
            date: new Date()
        });

        if (line.upcomingQueue && line.upcomingQueue.length > 0) {
            line.upcoming = line.upcomingQueue.shift();
            
            if (obDataList.length > 0) {
                const qIdx = Math.floor(Math.random() * obDataList.length);
                const qOB = obDataList[qIdx];
                line.upcomingQueue.push({
                    style: qOB.styleName,
                    prep: 0,
                    time: (10 + Math.floor(Math.random() * 2)) + ' min',
                    nextStep: qOB.tools.length > 0 ? qOB.tools.slice(0, 2).join(', ') : 'Standard Setup',
                    manpower: qOB.manpower + ' Operators',
                    smv: qOB.smv,
                    excelFilePath: qOB.excelFilePath,
                    pdfFilePath: qOB.pdfFilePath
                });
            }
        }
        
        line.lastUpdated = new Date();
        await line.save();
        
        res.json({ message: 'Success', line });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error pushing line' });
    }
});

app.get('/api/open-doc', async (req, res) => {
    try {
        const { style, type, line, format } = req.query;
        const lineData = await Line.findOne({ lineNumber: parseInt(line) });
        if (!lineData) return res.status(404).send('Line not found');
        
        const filePath = type === 'current' ? 
            (format === 'pdf' ? lineData.current.pdfFilePath : lineData.current.excelFilePath) : 
            (format === 'pdf' ? lineData.upcoming.pdfFilePath : lineData.upcoming.excelFilePath);
        
        if (filePath && fs.existsSync(filePath)) {
            return res.download(filePath);
        }
        res.status(404).send(`File not found for style: ${style}`);
    } catch (e) { res.status(500).send('Error'); }
});

app.get('/api/download-machine-list/:line/:type', (req, res) => {
    try {
        let line = parseInt(req.params.line);
        const type = req.params.type.toLowerCase();
        
        let folderName = type === 'idle' ? 'IDLE MACHINE LIST' : 'RUNNING MACHINE LIST';
        let dirPath = path.join(__dirname, '..', 'data', 'line wise MACHINE Details', folderName);
        
        if (!fs.existsSync(dirPath)) {
            return res.status(404).send('Directory not found');
        }

        const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith('.xlsx'));
        
        if (files.length === 0) {
            return res.status(404).send('No files found');
        }

        let targetFile = null;
        
        if (line === 10 || line === 11) {
            targetFile = files[Math.floor(Math.random() * files.length)];
        } else {
            const regex = new RegExp(`line\\s*${line}\\b`, 'i');
            targetFile = files.find(f => regex.test(f));
            
            if (!targetFile) {
                targetFile = files[Math.floor(Math.random() * files.length)];
            }
        }
        
        if (targetFile) {
            return res.download(path.join(dirPath, targetFile));
        } else {
            return res.status(404).send('File not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/api/internal-external', (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'SMED STUDY.xlsx');
        if (!fs.existsSync(filePath)) return res.json({ internal: [], external: [] });
        
        const wb = xlsx.readFile(filePath);
        const sheet = wb.Sheets['Internal & External'];
        if (!sheet) return res.json({ internal: [], external: [] });
        
        const rows = xlsx.utils.sheet_to_json(sheet, {header: 1});
        const internal = [];
        const external = [];
        
        rows.forEach(r => {
            if (r.length >= 2 && r[0] && r[1]) {
                const op = String(r[0]).trim();
                const type = String(r[1]).trim().toLowerCase();
                const desc = r.length > 4 && r[4] ? String(r[4]).trim() : '';
                
                if (type.includes('internal')) {
                    internal.push({ op, desc });
                } else if (type.includes('external')) {
                    external.push({ op, desc });
                }
            }
        });
        
        res.json({ internal, external });
    } catch (e) {
        console.error(e);
        res.status(500).json({ internal: [], external: [] });
    }
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
