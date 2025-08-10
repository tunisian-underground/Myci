const express = require('express'); const fs = require('fs'); const path = require('path'); const bodyParser = require('body-parser'); const cors = require('cors');

const app = express(); const PORT = process.env.PORT || 3000; const DATA_FILE = path.join(__dirname, 'applications.json');

app.use(cors()); app.use(bodyParser.json()); app.use(express.static(path.join(__dirname, 'public')));

function readData(){ try{ const raw = fs.readFileSync(DATA_FILE, 'utf8'); return JSON.parse(raw || '[]'); } catch(e){ return []; } } function writeData(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); }

app.get('/api/applications', (req,res)=>{ res.json(readData()); });

app.post('/api/applications', (req,res)=>{ const entry = req.body; if(!entry || Object.keys(entry).length===0) return res.status(400).json({error:'Empty entry'}); const data = readData(); entry.id = Date.now(); entry.created_at = new Date().toISOString(); data.push(entry); try{ writeData(data); res.json({success:true, entry}); } catch(e){ res.status(500).json({error:'Failed to write file'}); } });

app.listen(PORT, ()=> console.log(Server running on http://localhost:${PORT}));
