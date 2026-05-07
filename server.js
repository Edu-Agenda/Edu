const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ CONFIGURACIÓN DE CARPETA FRONT
// Ajustado para usar la carpeta actual donde están tus archivos HTML
const frontPath = __dirname; 
app.use(express.static(frontPath));

// ======================
// BASE DE DATOS
// ======================
const db = new Database('./edu.db');
const JWT_SECRET = 'clave_secreta_eduagenda_2024_segura';

// ── Credenciales fijas del administrador ──────────────────────
const ADMIN_EMAIL = 'admin@eduagenda.com';
const ADMIN_PASSWORD = 'Admin1234';

// ======================
// TABLAS
// ======================
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento TEXT,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    password TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('estudiante', 'profesor', 'admin')),
    creado_en TEXT DEFAULT (datetime('now','localtime'))
  )
`);
console.log('✅ SQLite conectado');
console.log('✅ Tabla usuarios lista');

// ======================
// RUTAS DE NAVEGACIÓN (HTML)
// ======================
app.get('/', (req, res) => {
    res.sendFile(path.join(frontPath, 'main.html'));
});

// Ruta explícita para la sesión
app.get('/sesion', (req, res) => {
    res.sendFile(path.join(frontPath, 'sesion.html'));
});

// Manejador dinámico para cualquier otro HTML en la misma carpeta
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(frontPath, `${req.params.page}.html`));
});

// ======================
// MIDDLEWARE: VERIFICAR TOKEN
// ======================
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// ======================
// API: VERIFICAR ESTADO
// ======================
app.get('/verificar', verificarToken, (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
});

// ======================
// API: REGISTRO
// ======================
app.post('/registro', async (req, res) => {
    const { nombre, documento, email, telefono, password, tipo } = req.body;

    if (!nombre || !email || !password || !tipo) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (email === ADMIN_EMAIL) {
        return res.status(400).json({ error: 'Este correo no está disponible' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const info = db.prepare(`
            INSERT INTO usuarios (nombre, documento, email, telefono, password, tipo)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(nombre, documento, email, telefono, hash, tipo);

        res.status(201).json({ mensaje: 'Usuario registrado exitosamente', id: info.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ======================
// API: LOGIN
// ======================
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });
    }

    if (email === ADMIN_EMAIL) {
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: 0, email: ADMIN_EMAIL, nombre: 'Administrador', tipo: 'admin' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            token,
            tipo: 'admin',
            nombre: 'Administrador',
            email: ADMIN_EMAIL,
            id: 0
        });
    }

    try {
        const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nombre: usuario.nombre, tipo: usuario.tipo },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            tipo: usuario.tipo,
            nombre: usuario.nombre,
            email: usuario.email,
            id: usuario.id
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// ======================
// API: USUARIOS (PROTEGIDO)
// ======================
app.get('/usuarios', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM usuarios`
        ).all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// ======================
// SERVIDOR
// ======================
const PORT = 3000;
app.listen(PORT, () => {
    console.log('🚀 Servidor de EduAgenda iniciado');
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📂 Archivos servidos desde: ${frontPath}`);
});