const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const db = require('./db');
const { verifyToken, SECRET } = require('./authMiddleware');

const app = express();
const PORT = 3000;

// Configuración básica
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta raíz del proyecto
app.use(express.static(__dirname));

// RUTA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// NUEVA RUTA: Asegura que usuarios.html cargue correctamente
app.get('/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, 'usuarios.html'));
});

// API: Obtener lista de usuarios para la tabla (Protegida con Token)
app.get('/api/usuarios', verifyToken, (req, res) => {
  try {
    const users = db.prepare('SELECT id, nombre, email, documento FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// REGISTRO
app.post('/registro', async (req, res) => {
  const { nombre, email, password, documento, telefono } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existe) return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (nombre, email, password, documento, telefono) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(nombre, email, hash, documento || null, telefono || null);
    res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '8h' });
    res.json({ token, nombre: user.nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
});