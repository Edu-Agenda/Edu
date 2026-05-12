// ============================================================
// migrar_db.js
// Ejecuta: node migrar_db.js
// Agrega las columnas que faltan en la tabla tareas sin
// borrar datos existentes. Solo corre una vez.
// ============================================================

const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'edu.db'));
db.pragma('foreign_keys = ON');

console.log('🔧 Iniciando migración de base de datos...\n');

// ────────────────────────────────────────────────────────────
// Helper: agrega una columna solo si no existe ya
// ────────────────────────────────────────────────────────────
function addColumnIfMissing(table, column, definition) {
    try {
        // Obtener info de columnas actuales
        const cols = db.pragma(`table_info(${table})`);
        const existe = cols.some(c => c.name === column);

        if (existe) {
            console.log(`  ✅ ${table}.${column} — ya existe, se omite`);
        } else {
            db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
            console.log(`  ➕ ${table}.${column} — agregada`);
        }
    } catch (err) {
        console.error(`  ❌ Error en ${table}.${column}: ${err.message}`);
    }
}

// ────────────────────────────────────────────────────────────
// TABLA: tareas — columnas que pueden faltar
// ────────────────────────────────────────────────────────────
console.log('📋 Tabla: tareas');

addColumnIfMissing('tareas', 'estado',               `TEXT DEFAULT 'pendiente'`);
addColumnIfMissing('tareas', 'creado_en',             `TEXT DEFAULT NULL`);
addColumnIfMissing('tareas', 'completada_en',         `TEXT DEFAULT NULL`);
addColumnIfMissing('tareas', 'calificacion',          `REAL DEFAULT NULL`);
addColumnIfMissing('tareas', 'comentario_prof',       `TEXT DEFAULT NULL`);
addColumnIfMissing('tareas', 'entrega_descripcion',   `TEXT DEFAULT NULL`);
addColumnIfMissing('tareas', 'entrega_fecha',         `TEXT DEFAULT NULL`);

// ────────────────────────────────────────────────────────────
// TABLA: materias — columnas que pueden faltar
// ────────────────────────────────────────────────────────────
console.log('\n📋 Tabla: materias');

addColumnIfMissing('materias', 'modalidad', `TEXT DEFAULT 'Virtual'`);
addColumnIfMissing('materias', 'progreso',  `INTEGER DEFAULT 0`);
addColumnIfMissing('materias', 'estado',    `TEXT DEFAULT 'Activa'`);

// ────────────────────────────────────────────────────────────
// TABLA: horarios — columnas que pueden faltar
// ────────────────────────────────────────────────────────────
console.log('\n📋 Tabla: horarios');

addColumnIfMissing('horarios', 'estudiante_nombre', `TEXT DEFAULT NULL`);

// ────────────────────────────────────────────────────────────
// Rellenar estado 'pendiente' en tareas que tengan NULL
// ────────────────────────────────────────────────────────────
console.log('\n🔄 Normalizando datos...');

try {
    const result = db.prepare(`
        UPDATE tareas SET estado = 'pendiente'
        WHERE estado IS NULL
    `).run();
    console.log(`  ✅ ${result.changes} tarea(s) actualizadas a estado 'pendiente'`);
} catch(e) {
    console.error('  ❌ Error normalizando tareas:', e.message);
}

// ────────────────────────────────────────────────────────────
// Verificación final
// ────────────────────────────────────────────────────────────
console.log('\n📊 Verificación final:');

['tareas', 'materias', 'horarios', 'usuarios'].forEach(tabla => {
    try {
        const cols = db.pragma(`table_info(${tabla})`);
        console.log(`  ${tabla}: ${cols.map(c => c.name).join(', ')}`);
    } catch(e) {
        console.log(`  ${tabla}: tabla no encontrada`);
    }
});

db.close();
console.log('\n✅ Migración completada. Ya puedes reiniciar el servidor.\n');