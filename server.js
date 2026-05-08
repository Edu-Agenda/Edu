const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// ==========================================
// BASE DE DATOS
// ==========================================
const db = new Database('./edu.db');
const JWT_SECRET = 'clave_secreta_eduagenda_2024';
const ADMIN_EMAIL = 'admin@eduagenda.com';
const ADMIN_PASSWORD = 'Admin1234';

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
  );

  CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesor_nombre TEXT NOT NULL,
    materia TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    estado TEXT DEFAULT 'disponible',
    estudiante_nombre TEXT DEFAULT NULL
  );
`);

console.log('✅ Base de datos EduAgenda lista.');

// ==========================================
// MIDDLEWARE TOKEN
// ==========================================
function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
    const token = authHeader.split(' ')[1];
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sesión expirada' });
    }
}

// ==========================================
// RUTAS API (ANTES de las rutas HTML)
// ==========================================

app.post('/registro', async (req, res) => {
    const { nombre, documento, email, telefono, password, tipo } = req.body;
    if (!nombre || !email || !password || !tipo)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    if (email === ADMIN_EMAIL)
        return res.status(400).json({ error: 'Este correo no está disponible' });
    if (!['estudiante', 'profesor'].includes(tipo))
        return res.status(400).json({ error: 'Tipo de usuario inválido' });
    try {
        const hash = await bcrypt.hash(password, 10);
        db.prepare(`INSERT INTO usuarios (nombre, documento, email, telefono, password, tipo) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(nombre, documento, email, telefono, hash, tipo);
        res.status(201).json({ ok: true, mensaje: 'Usuario registrado exitosamente' });
    } catch (err) {
        if (err.message.includes('UNIQUE'))
            return res.status(400).json({ error: 'El correo ya está registrado' });
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    // Admin fijo
    if (email === ADMIN_EMAIL) {
        if (password !== ADMIN_PASSWORD)
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        const token = jwt.sign(
            { id: 0, email: ADMIN_EMAIL, nombre: 'Administrador', tipo: 'admin' },
            JWT_SECRET, { expiresIn: '8h' }
        );
        return res.json({ token, tipo: 'admin', nombre: 'Administrador', email: ADMIN_EMAIL, id: 0 });
    }

    try {
        const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
        if (!usuario || !(await bcrypt.compare(password, usuario.password)))
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, tipo: usuario.tipo, nombre: usuario.nombre },
            JWT_SECRET, { expiresIn: '8h' }
        );
        res.json({ token, tipo: usuario.tipo, nombre: usuario.nombre, email: usuario.email, id: usuario.id });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/verificar', verificarToken, (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
});

app.get('/usuarios', verificarToken, (req, res) => {
    const rows = db.prepare(`SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM usuarios`).all();
    res.json(rows);
});

app.get('/api/horarios', (req, res) => {
    const rows = db.prepare('SELECT * FROM horarios').all();
    res.json(rows);
});

app.post('/confirmar-pago', verificarToken, (req, res) => {
    const { estudiante, fecha, hora, materia, profesor } = req.body;
    if (!estudiante || !fecha || !hora || !materia || !profesor)
        return res.status(400).json({ error: 'Faltan datos de la reserva' });

    const horaLimpia     = hora.split('-')[0].trim();
    const fechaLimpia    = fecha.trim();
    const profesorLimpio = profesor.trim();

    console.log(`\n--- PAGO RECIBIDO ---`);
    console.log(`Estudiante: ${estudiante} | ${materia} con ${profesorLimpio} | ${fechaLimpia} ${horaLimpia}`);

    try {
        const result = db.prepare(`
            UPDATE horarios SET estado = 'reservado', estudiante_nombre = ?
            WHERE fecha = ? AND hora_inicio = ? AND profesor_nombre = ?
        `).run(estudiante, fechaLimpia, horaLimpia, profesorLimpio);

        if (result.changes === 0) {
            db.prepare(`
                INSERT INTO horarios (profesor_nombre, materia, fecha, hora_inicio, estado, estudiante_nombre)
                VALUES (?, ?, ?, ?, 'reservado', ?)
            `).run(profesorLimpio, materia, fechaLimpia, horaLimpia, estudiante);
        }

        console.log('✅ Reserva guardada');
        res.json({ ok: true, mensaje: 'Reserva confirmada exitosamente' });
    } catch (error) {
        console.error('❌ Error DB:', error);
        res.status(500).json({ error: 'Error al guardar la reserva' });
    }
});

// ==========================================
// RUTAS HTML (siempre al final)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, `${req.params.page}.html`), (err) => {
        if (err) res.status(404).json({ error: 'Página no encontrada' });
    });
});

app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor EduAgenda en http://localhost:${PORT}`);
    console.log(`👑 Admin: ${ADMIN_EMAIL}`);
});