const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'clave_secreta_eduagenda_2024_segura';

// ======================
// MIDDLEWARE
// ======================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ======================
// BASE DE DATOS
// ======================
const db = new sqlite3.Database('./edu.db', (err) => {
    if (err) {
        console.log('❌ DB error:', err.message);
    } else {
        console.log('✅ SQLite conectado');
        crearTablas();
    }
});

// ======================
// TABLAS
// ======================
function crearTablas() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            email TEXT UNIQUE,
            password TEXT,
            documento TEXT,
            telefono TEXT,
            tipo TEXT DEFAULT 'estudiante',
            creado_en TEXT DEFAULT (datetime('now','localtime'))
        )
    `, () => {
        console.log("✅ Tabla users lista");
        crearAdmin();
    });
}

// ======================
// CREAR ADMIN
// ======================
async function crearAdmin() {
    const email = 'admin@edu.com';
    const password = '123456';

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (!row) {
            const hash = await bcrypt.hash(password, 10);

            db.run(
                `INSERT INTO users (nombre, email, password, documento, telefono, tipo)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Administrador', email, hash, '00000000', '3000000000', 'admin']
            );

            console.log("👑 Admin creado: admin@edu.com / 123456");
        }
    });
}

// ======================
// VERIFICAR TOKEN
// ======================
function verificarToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// ======================
// RUTA PRINCIPAL (🔥 IMPORTANTE)
// ======================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "main.html"));
});

// ======================
// VERIFICAR TOKEN (para frontend)
// ======================
app.get('/verificar', verificarToken, (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
});

// ======================
// REGISTRO
// ======================
app.post('/registro', async (req, res) => {
    const { nombre, email, password, documento, telefono, tipo } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (nombre, email, password, documento, telefono, tipo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, email, hash, documento || '', telefono || '', tipo || 'estudiante'],
        function (err) {
            if (err) {
                return res.status(400).json({ error: 'Email ya registrado' });
            }

            res.json({ mensaje: 'Usuario creado', id: this.lastID });
        }
    );
});

// ======================
// LOGIN
// ======================
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

        if (!user) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                tipo: user.tipo
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            nombre: user.nombre,
            tipo: user.tipo
        });
    });
});

// ======================
// USUARIOS (PROTEGIDO)
// ======================
app.get('/usuarios', verificarToken, (req, res) => {
    db.all(
        `SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM users`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Error servidor' });
            }

            res.json(rows);
        }
    );
});

// ======================
// SERVIDOR
// ======================
app.listen(PORT, '0.0.0.0', () => {
    console.log("🚀 Servidor iniciado");
    console.log(`http://localhost:${PORT}`);
});