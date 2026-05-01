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