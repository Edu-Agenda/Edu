const Database = require('better-sqlite3');
const path = require('path');

// Conexión a la base de datos centralizada
const db = new Database(path.join(__dirname, 'edu.db'));

// Habilitar llaves foráneas para el ON DELETE CASCADE
db.pragma('foreign_keys = ON');

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

  CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    estudiante_nombre TEXT NOT NULL,
    profesor_nombre TEXT NOT NULL,
    horario TEXT,
    modalidad TEXT DEFAULT 'Virtual',
    progreso INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'Activa'
  );

  
  CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materia_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_entrega TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente', -- ESTA LÍNEA ES OBLIGATORIA
    creado_en TEXT,                   -- ESTA TAMBIÉN
    completada_en TEXT DEFAULT NULL,
    calificacion REAL DEFAULT NULL,
    comentario_prof TEXT DEFAULT NULL,
    entrega_descripcion TEXT DEFAULT NULL,
    entrega_fecha TEXT DEFAULT NULL,
    FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE
  );
`);

console.log('✅ Base de datos (edu.db) inicializada y sincronizada.');

module.exports = db;