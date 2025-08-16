const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());
app.use(session({
    secret: "outside-secret-key",
    resave: false,
    saveUninitialized: true
}));

// Paths to data files
const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const gangFile = path.join(dataDir, "gangapplications.json");
const factionFile = path.join(dataDir, "factionapplications.json");
const whitelistFile = path.join(dataDir, "whitelistapplications.json");
const adminFile = path.join(dataDir, "adminapplications.json");
const patchFile = path.join(dataDir, "patchnotes.json");
const announceFile = path.join(dataDir, "announcements.json");

// Create data files if missing
function ensureFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}
ensureFile(usersFile, []);
ensureFile(gangFile, []);
ensureFile(factionFile, []);
ensureFile(whitelistFile, []);
ensureFile(adminFile, []);
ensureFile(patchFile, []);
ensureFile(announceFile, []);

// Helper: Read JSON
function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Helper: Write JSON
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ===== AUTH =====

// Check username availability
app.post("/check-username", (req, res) => {
    const { username } = req.body;
    const users = readJSON(usersFile);
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    res.json({ exists });
});

// Signup
app.post("/signup", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    let users = readJSON(usersFile);
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ message: "Username already taken" });
    }
    users.push({ username, password, role: role || "whitelistmode" });
    writeJSON(usersFile, users);
    res.json({ message: "Account created successfully" });
});

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    let users = readJSON(usersFile);
    let user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    req.session.user = user;
    res.json({ message: "Login successful", role: user.role });
});

// Middleware for auth
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }
    next();
}

// Middleware for role
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
}

// ===== APPLICATIONS =====
app.post("/applications/:type", requireLogin, (req, res) => {
    const { type } = req.params;
    const { content } = req.body;

    const files = {
        gang: gangFile,
        faction: factionFile,
        whitelist: whitelistFile,
        admin: adminFile
    };

    if (!files[type]) {
        return res.status(400).json({ message: "Invalid application type" });
    }

    let apps = readJSON(files[type]);
    apps.push({ user: req.session.user.username, content, date: new Date() });
    writeJSON(files[type], apps);

    res.json({ message: "Application submitted" });
});

app.get("/applications/:type", requireLogin, (req, res) => {
    const { type } = req.params;

    const files = {
        gang: { file: gangFile, roles: ["gangmode", "developer", "founder"] },
        faction: { file: factionFile, roles: ["factionmode", "developer", "founder"] },
        whitelist: { file: whitelistFile, roles: ["whitelistmode", "developer", "founder"] },
        admin: { file: adminFile, roles: ["adminpersonel", "developer", "founder"] }
    };

    if (!files[type]) {
        return res.status(400).json({ message: "Invalid application type" });
    }

    if (!files[type].roles.includes(req.session.user.role)) {
        return res.status(403).json({ message: "Access denied" });
    }

    res.json(readJSON(files[type].file));
});

// ===== PATCH NOTES & ANNOUNCEMENTS =====
app.get("/patchnotes", (req, res) => {
    res.json(readJSON(patchFile));
});

app.post("/patchnotes", requireRole(["developer", "founder"]), (req, res) => {
    const notes = readJSON(patchFile);
    notes.push({ note: req.body.note, date: new Date() });
    writeJSON(patchFile, notes);
    res.json({ message: "Patch note added" });
});

app.get("/announcements", (req, res) => {
    res.json(readJSON(announceFile));
});

app.post("/announcements", requireRole(["developer", "founder"]), (req, res) => {
    const announcements = readJSON(announceFile);
    announcements.push({ announcement: req.body.announcement, date: new Date() });
    writeJSON(announceFile, announcements);
    res.json({ message: "Announcement added" });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 OutSide Server running on http://localhost:${PORT}`);
});