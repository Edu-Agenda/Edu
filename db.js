<<<<<<< HEAD
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'edu.db'));

// Crear tabla de usuarios si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    documento TEXT,
    telefono TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
=======
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'clave_secreta_eduagenda_2024_segura';

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// CONEXIÓN A BASE DE DATOS
// ==========================================
const db = new sqlite3.Database('./edu.db', (err) => {
  if (err) {
    console.error('❌ Error al conectar DB:', err.message);
  } else {
    console.log('✅ Conectado a SQLite');
    crearTablas();
  }
});

// ==========================================
// CREAR TABLAS
// ==========================================
function crearTablas() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      documento TEXT,
      telefono TEXT,
      tipo TEXT DEFAULT 'estudiante',
      creado_en TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error al crear tabla users:', err.message);
    } else {
      console.log('✅ Tabla users lista');
      crearAdmin(); // Crear admin automáticamente
    }
  });
}

// ==========================================
// CREAR ADMINISTRADOR POR DEFECTO
// ==========================================
async function crearAdmin() {
  const email = 'admin@edu.com';
  const password = '123456';

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
    if (err) {
      console.error('❌ Error al buscar admin:', err.message);
      return;
    }

    if (!row) {
      try {
        // ✅ ENCRIPTAR CONTRASEÑA CON BCRYPT
        const hash = await bcrypt.hash(password, 10);

        db.run(
          `INSERT INTO users (nombre, email, password, documento, telefono, tipo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['Administrador', email, hash, '00000000', '3000000000', 'admin'],
          function (err) {
            if (err) {
              console.error('❌ Error al crear admin:', err.message);
            } else {
              console.log('╔════════════════════════════════════╗');
              console.log('║   👑 ADMIN CREADO EXITOSAMENTE    ║');
              console.log('╠════════════════════════════════════╣');
              console.log('║ 📧 Email: admin@edu.com          ║');
              console.log('║ 🔑 Contraseña: 123456            ║');
              console.log('╚════════════════════════════════════╝');
            }
          }
        );
      } catch (error) {
        console.error('❌ Error al encriptar contraseña:', error.message);
      }
    } else {
      console.log('ℹ️  El admin ya existe en la base de datos');

      // Verificar si la contraseña está encriptada
      if (row.password.length < 20) {
        console.log('⚠️  Contraseña del admin no está encriptada. Actualizando...');
        try {
          const hash = await bcrypt.hash(password, 10);
          db.run("UPDATE users SET password = ? WHERE email = ?", [hash, email]);
          console.log('✅ Contraseña del admin actualizada a bcrypt');
        } catch (error) {
          console.error('❌ Error al actualizar:', error.message);
        }
      }
    }
  });
}

// ==========================================
// RUTA: REGISTRO DE USUARIOS
// ==========================================
app.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, documento, telefono, tipo } = req.body;

    // Validaciones
    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Los campos nombre, email y contraseña son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    db.get("SELECT id FROM users WHERE email = ?", [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error del servidor' });
      }

      if (user) {
        return res.status(400).json({
          error: 'Este correo electrónico ya está registrado'
        });
      }

      // ✅ ENCRIPTAR CONTRASEÑA
      const hash = await bcrypt.hash(password, 10);

      // Insertar usuario
      db.run(
        `INSERT INTO users (nombre, email, password, documento, telefono, tipo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, email, hash, documento || '', telefono || '', tipo || 'estudiante'],
        function (err) {
          if (err) {
            console.error('Error al registrar:', err.message);
            return res.status(500).json({
              error: 'Error al crear el usuario'
            });
          }

          console.log(`✅ Nuevo usuario registrado: ${email} (${tipo || 'estudiante'})`);

          res.status(201).json({
            mensaje: '¡Cuenta creada exitosamente!',
            id: this.lastID
          });
        }
      );
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ==========================================
// RUTA: INICIO DE SESIÓN
// ==========================================
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
      if (err) {
        console.error('Error en login:', err.message);
        return res.status(500).json({ error: 'Error del servidor' });
      }

      if (!user) {
        return res.status(401).json({
          error: 'Usuario no encontrado. Verifica tu email'
        });
      }

      try {
        // ✅ COMPARAR CONTRASEÑA ENCRIPTADA
        const passwordValida = await bcrypt.compare(password, user.password);

        if (!passwordValida) {
          return res.status(401).json({
            error: 'Contraseña incorrecta'
          });
        }

        // ✅ Generar token JWT
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            tipo: user.tipo,
            nombre: user.nombre
          },
          SECRET_KEY,
          { expiresIn: '24h' }
        );

        console.log(`✅ Inicio de sesión exitoso: ${user.email} (${user.tipo})`);

        // Responder con datos del usuario
        res.json({
          token: token,
          tipo: user.tipo,
          nombre: user.nombre,
          email: user.email,
          id: user.id
        });

      } catch (error) {
        console.error('Error al verificar contraseña:', error.message);
        res.status(500).json({
          error: 'Error al verificar la contraseña'
        });
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ==========================================
// RUTA: OBTENER DATOS DEL USUARIO
// ==========================================
app.get('/usuario', verificarToken, (req, res) => {
  db.get(
    "SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM users WHERE id = ?",
    [req.usuario.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error del servidor' });
      }
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(user);
    }
  );
});

// ==========================================
// MIDDLEWARE: VERIFICAR TOKEN JWT
// ==========================================
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════╗');
  console.log('║  🚀 SERVIDOR EDUAGENDA INICIADO   ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  📡 Puerto: http://localhost:${PORT}  ║`);
  console.log('║  📧 Admin: admin@edu.com          ║');
  console.log('║  🔑 Pass: 123456                  ║');
  console.log('╚════════════════════════════════════╝');
});
>>>>>>> backend
