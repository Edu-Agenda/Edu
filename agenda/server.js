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
app.use(express.static(path.join(__dirname)));

// RUTA PRINCIPAL: Hace que al entrar a http://localhost:3000 se vea main.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// REGISTRO: Guarda usuarios en la base de datos
app.post('/registro', async (req, res) => {
  const { nombre, email, password, documento, telefono } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }

  try {
    const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existe) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (nombre, email, password, documento, telefono) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(nombre, email, hash, documento || null, telefono || null);

    res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// LOGIN: Verifica credenciales y entrega un Token (JWT)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '8h' });
    res.json({ token, nombre: user.nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

// PERFIL: Ruta protegida para obtener datos del usuario logueado
app.get('/perfil', verifyToken, (req, res) => {
  const user = db.prepare('SELECT nombre, email FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
});