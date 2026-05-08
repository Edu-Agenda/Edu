const Database = require('better-sqlite3');
const path = require('path');

// Conexión a la base de datos centralizada
const db = new Database(path.join(__dirname, 'edu.db'));

/**
 * Inicialización del Schema
 * Cambiamos 'users' por 'usuarios' para que coincida con server.js
 */
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

console.log('✅ Base de datos (edu.db) inicializada con éxito.');

module.exports = db;