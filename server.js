require('dotenv').config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_eduagenda_2024';
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
// BASE DE DATOS - MODIFICADA PARA PRUEBAS
// ==========================================

// Función para crear base de datos (en memoria para pruebas)
function createDatabase(dbPath) {
    const db = new Database(dbPath || './edu.db');
    db.pragma('foreign_keys = ON');
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            documento TEXT,
            email TEXT UNIQUE NOT NULL,
            telefono TEXT,
            password TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('estudiante','profesor','admin')),
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
            estado TEXT DEFAULT 'pendiente',
            creado_en TEXT DEFAULT (datetime('now','localtime')),
            completada_en TEXT,
            entrega_descripcion TEXT,
            entrega_fecha TEXT,
            calificacion REAL,
            comentario_prof TEXT,
            FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
        );
    `);
    
    return db;
}

// Usar BD en memoria para pruebas, real para producción
let db;
if (process.env.NODE_ENV === 'test') {
    db = createDatabase(':memory:');
    console.log('🧪 Usando base de datos en memoria para pruebas');
} else {
    db = createDatabase('./edu.db');
    console.log('✅ Base de datos EduAgenda lista.');
}

const ADMIN_EMAIL = 'admin@eduagenda.com';
const ADMIN_PASSWORD = 'Admin1234';

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
// DIAGNÓSTICO PÚBLICO
// ==========================================

app.get('/api/debug', (req, res) => {
    try {
        const materias    = db.prepare('SELECT * FROM materias').all();
        const horarios    = db.prepare("SELECT * FROM horarios WHERE estado = 'reservado'").all();
        const usuarios    = db.prepare("SELECT id, nombre, email, tipo FROM usuarios").all();
        const tareas      = db.prepare('SELECT * FROM tareas').all();

        res.json({
            resumen: {
                total_usuarios:  usuarios.length,
                total_materias:  materias.length,
                horarios_reservados: horarios.length,
                total_tareas:    tareas.length,
            },
            usuarios,
            materias,
            horarios_reservados: horarios,
            tareas,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// REGISTRO
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
        db.prepare(`
            INSERT INTO usuarios (nombre, documento, email, telefono, password, tipo)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(nombre, documento, email, telefono, hash, tipo);

        res.status(201).json({ ok: true, mensaje: 'Usuario registrado exitosamente' });
    } catch (err) {
        if (err.message.includes('UNIQUE'))
            return res.status(400).json({ error: 'El correo ya está registrado' });
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==========================================
// LOGIN
// ==========================================

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    // Admin
    if (email === ADMIN_EMAIL) {
        if (password !== ADMIN_PASSWORD)
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const token = jwt.sign(
            { id: 0, email: ADMIN_EMAIL, nombre: 'Administrador', tipo: 'admin' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        return res.json({ token, tipo: 'admin', nombre: 'Administrador', email: ADMIN_EMAIL, id: 0 });
    }

    // Usuario normal
    try {
        const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

        if (!usuario || !(await bcrypt.compare(password, usuario.password)))
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, tipo: usuario.tipo, nombre: usuario.nombre },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, tipo: usuario.tipo, nombre: usuario.nombre, email: usuario.email, id: usuario.id });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==========================================
// VERIFICAR TOKEN
// ==========================================

app.get('/verificar', verificarToken, (req, res) => {
    res.json({ ok: true, usuario: req.usuario });
});

// ==========================================
// LISTAR / ELIMINAR USUARIOS
// ==========================================

app.get('/usuarios', verificarToken, (req, res) => {
    const rows = db.prepare(`
        SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM usuarios
    `).all();
    res.json(rows);
});

app.delete('/usuarios/:id', verificarToken, (req, res) => {
    if (req.usuario.tipo !== 'admin')
        return res.status(403).json({ error: 'Sin permiso' });
    try {
        const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
        if (result.changes > 0) {
            res.json({ ok: true, mensaje: 'Usuario eliminado' });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// ==========================================
// HORARIOS
// ==========================================

app.get('/api/horarios', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM horarios').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
});

app.post('/api/horarios', verificarToken, (req, res) => {
    const { profesor_nombre, materia, fecha, hora_inicio } = req.body;

    if (!profesor_nombre || !materia || !fecha || !hora_inicio)
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });

    try {
        const result = db.prepare(`
            INSERT INTO horarios (profesor_nombre, materia, fecha, hora_inicio, estado)
            VALUES (?, ?, ?, ?, 'disponible')
        `).run(profesor_nombre, materia, fecha, hora_inicio);

        res.json({ ok: true, mensaje: 'Horario guardado correctamente', id: result.lastInsertRowid });
    } catch (error) {
        console.error('❌ Error guardando horario:', error);
        res.status(500).json({ error: 'Error interno al guardar en la base de datos' });
    }
});

app.delete('/api/horarios/:id', verificarToken, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM horarios WHERE id = ?').run(req.params.id);
        if (result.changes > 0) {
            res.json({ ok: true, mensaje: 'Horario eliminado' });
        } else {
            res.status(404).json({ error: 'Horario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el horario' });
    }
});

// ==========================================
// CONFIRMAR PAGO / RESERVA
// ==========================================

app.post('/confirmar-pago', verificarToken, (req, res) => {
    const { estudiante, fecha, hora, materia, profesor } = req.body;

    if (!estudiante || !fecha || !hora || !materia || !profesor)
        return res.status(400).json({ error: 'Faltan datos de la reserva' });

    const horaLimpia = hora.split('-')[0].trim();
    const fechaLimpia = fecha.trim();
    const profesorLimpio = profesor.trim();

    try {
        const result = db.prepare(`
            UPDATE horarios
            SET estado = 'reservado', estudiante_nombre = ?
            WHERE fecha = ? AND hora_inicio = ? AND profesor_nombre = ?
        `).run(estudiante, fechaLimpia, horaLimpia, profesorLimpio);

        if (result.changes === 0) {
            db.prepare(`
                INSERT INTO horarios (profesor_nombre, materia, fecha, hora_inicio, estado, estudiante_nombre)
                VALUES (?, ?, ?, ?, 'reservado', ?)
            `).run(profesorLimpio, materia, fechaLimpia, horaLimpia, estudiante);
        }

        // Agregar materia automáticamente si no existe
        const existeMateria = db.prepare(
            'SELECT id FROM materias WHERE nombre = ? AND estudiante_nombre = ?'
        ).get(materia, estudiante);

        if (!existeMateria) {
            db.prepare(`
                INSERT INTO materias (nombre, estudiante_nombre, profesor_nombre, horario, modalidad)
                VALUES (?, ?, ?, ?, 'Virtual')
            `).run(materia, estudiante, profesorLimpio, `${fechaLimpia} ${horaLimpia}`);
        }

        res.json({ ok: true, mensaje: 'Reserva confirmada exitosamente' });
    } catch (error) {
        console.error('❌ Error DB:', error);
        res.status(500).json({ error: 'Error al guardar la reserva' });
    }
});

// ==========================================
// CANCELAR CLASE
// ==========================================

app.post('/api/cancelar-clase', verificarToken, (req, res) => {
    const { id, profesor, fecha, hora } = req.body;

    if (!id && (!profesor || !fecha || !hora))
        return res.status(400).json({ error: 'Faltan datos para cancelar la clase' });

    try {
        let result;
        if (id) {
            result = db.prepare(`
                UPDATE horarios SET estado = 'disponible', estudiante_nombre = NULL
                WHERE id = ? AND estado = 'reservado'
            `).run(id);
        } else {
            result = db.prepare(`
                UPDATE horarios SET estado = 'disponible', estudiante_nombre = NULL
                WHERE profesor_nombre = ? AND fecha = ? AND hora_inicio = ? AND estado = 'reservado'
            `).run(profesor.trim(), fecha.trim(), hora.trim());
        }

        if (result.changes === 0)
            return res.status(404).json({ error: 'No se encontró la reserva o ya fue cancelada' });

        res.json({ ok: true, mensaje: 'Clase cancelada exitosamente' });
    } catch (error) {
        console.error('❌ Error al cancelar:', error);
        res.status(500).json({ error: 'Error interno al cancelar la clase' });
    }
});

// ==========================================
// ESTADÍSTICAS DE INGRESOS
// ==========================================

app.get('/api/ingresos-stats', verificarToken, (req, res) => {
    try {
        const profesorNombre = req.usuario.nombre;
        const PRECIO_CLASE = 50000;

        const reservas = db.prepare(`
            SELECT COUNT(*) as cantidad FROM horarios
            WHERE profesor_nombre = ? AND estado = 'reservado'
        `).get(profesorNombre);

        const detalle = db.prepare(`
            SELECT estudiante_nombre, materia, fecha, hora_inicio
            FROM horarios WHERE profesor_nombre = ? AND estado = 'reservado'
            ORDER BY fecha DESC
        `).all(profesorNombre);

        const totalIngresos = (reservas.cantidad || 0) * PRECIO_CLASE;

        res.json({
            totalIngresos,
            cantidadReservas: reservas.cantidad || 0,
            detalle: detalle.map(d => ({ ...d, monto: PRECIO_CLASE, estadoPago: 'Pagado' }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular ingresos' });
    }
});

// ==========================================
// MIS ESTUDIANTES (PROFESOR)
// ==========================================

app.get('/api/mis-estudiantes', verificarToken, (req, res) => {
    try {
        const profesorNombre = req.usuario.nombre;
        const estudiantes = db.prepare(`
            SELECT h.id, h.estudiante_nombre, h.materia, h.fecha, h.hora_inicio,
                   u.email, u.telefono
            FROM horarios h
            LEFT JOIN usuarios u ON h.estudiante_nombre = u.nombre
            WHERE h.profesor_nombre = ? AND h.estado = 'reservado'
            ORDER BY h.fecha ASC
        `).all(profesorNombre);

        res.json(estudiantes);
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Error al cargar la lista de estudiantes' });
    }
});

// ==========================================
// MATERIAS (PROFESOR)
// ==========================================

app.get('/api/materias', verificarToken, (req, res) => {
    try {
        const profesor = req.usuario.nombre;
        const rows = db.prepare('SELECT * FROM materias WHERE profesor_nombre = ?').all(profesor);
        res.json(rows);
    } catch (error) {
        console.error('❌ Error /api/materias:', error);
        res.status(500).json({ error: 'Error al obtener materias' });
    }
});

// CREAR MATERIA (POST)
app.post('/api/materias', verificarToken, (req, res) => {
    const { nombre, estudiante_nombre, profesor_nombre, horario, modalidad } = req.body;
    
    if (!nombre || !estudiante_nombre || !profesor_nombre) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    try {
        const result = db.prepare(`
            INSERT INTO materias (nombre, estudiante_nombre, profesor_nombre, horario, modalidad, progreso, estado)
            VALUES (?, ?, ?, ?, ?, 0, 'Activa')
        `).run(nombre, estudiante_nombre, profesor_nombre, horario || '', modalidad || 'Virtual');
        
        res.status(201).json({ ok: true, mensaje: 'Materia creada', id: result.lastInsertRowid });
    } catch (error) {
        console.error('❌ Error al crear materia:', error);
        res.status(500).json({ error: 'Error al crear materia' });
    }
});

app.delete('/api/materias/:id', verificarToken, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM materias WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar materia' });
    }
});

// ==========================================
// MATERIAS (ESTUDIANTE)
// ==========================================

app.get('/api/materias-estudiante', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT id, nombre, profesor_nombre, horario, modalidad, progreso, estado
            FROM materias
            WHERE estudiante_nombre = ?
            ORDER BY nombre ASC
        `).all(req.usuario.nombre);
        res.json(rows);
    } catch (error) {
        console.error('❌ Error /api/materias-estudiante:', error);
        res.status(500).json({ error: 'Error al obtener materias del estudiante' });
    }
});

// MATERIAS - RUTA POR NOMBRE DE ESTUDIANTE
app.get('/api/materias/estudiante/:nombre', verificarToken, (req, res) => {
    try {
        const { nombre } = req.params;
        const rows = db.prepare(`
            SELECT id, nombre, profesor_nombre, horario, modalidad, progreso, estado
            FROM materias
            WHERE estudiante_nombre = ?
            ORDER BY nombre ASC
        `).all(nombre);
        res.json(rows);
    } catch (error) {
        console.error('❌ Error /api/materias/estudiante/:nombre:', error);
        res.status(500).json({ error: 'Error al obtener materias del estudiante' });
    }
});

// ==========================================
// TAREAS — CRUD BASE
// ==========================================

// Crear tarea (CORREGIDO - con creado_en)
app.post('/api/tareas', verificarToken, (req, res) => {
    const { materiaId, descripcion, fecha_entrega } = req.body;
    
    if (!materiaId || !descripcion || !fecha_entrega) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    try {
        const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const result = db.prepare(`
            INSERT INTO tareas (materia_id, descripcion, fecha_entrega, creado_en, estado)
            VALUES (?, ?, ?, ?, 'pendiente')
        `).run(materiaId, descripcion, fecha_entrega, ahora);
        
        console.log(`✅ Tarea creada: id=${result.lastInsertRowid}`);
        res.status(201).json({ ok: true, mensaje: 'Tarea creada', id: result.lastInsertRowid });
    } catch (error) {
        console.error('❌ Error al crear tarea:', error);
        res.status(500).json({ error: 'Error al crear tarea' });
    }
});

// Listar tareas de una materia
app.get('/api/tareas/:materiaId', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT * FROM tareas
            WHERE materia_id = ?
            ORDER BY fecha_entrega ASC
        `).all(req.params.materiaId);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Tareas por materia (alias)
app.get('/api/tareas/materia/:materiaId', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT * FROM tareas WHERE materia_id = ? ORDER BY fecha_entrega ASC
        `).all(req.params.materiaId);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Eliminar tarea
app.delete('/api/tareas/:id', verificarToken, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM tareas WHERE id = ?').run(req.params.id);
        if (result.changes > 0) {
            res.json({ ok: true, mensaje: 'Tarea eliminada' });
        } else {
            res.status(404).json({ error: 'Tarea no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar tarea' });
    }
});

// ==========================================
// TAREAS — ACCIONES ESTUDIANTE
// ==========================================

// Todas las tareas del estudiante
app.get('/api/tareas-todas-estudiante', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT t.*, m.nombre AS materia_nombre
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE m.estudiante_nombre = ?
            ORDER BY t.fecha_entrega ASC
        `).all(req.usuario.nombre);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Completar / reabrir tarea
app.patch('/api/tareas/:id/completar', verificarToken, (req, res) => {
    const { id } = req.params;
    const { accion } = req.body;

    if (!['completar', 'reabrir'].includes(accion))
        return res.status(400).json({ error: 'Acción inválida' });

    try {
        const tarea = db.prepare(`
            SELECT t.id, m.estudiante_nombre
            FROM tareas t JOIN materias m ON t.materia_id = m.id
            WHERE t.id = ?
        `).get(id);

        if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
        if (tarea.estudiante_nombre !== req.usuario.nombre)
            return res.status(403).json({ error: 'No tienes permiso' });

        const nuevoEstado = accion === 'completar' ? 'completada' : 'pendiente';
        const completada_en = accion === 'completar'
            ? new Date().toISOString().slice(0, 19).replace('T', ' ')
            : null;

        db.prepare(`
            UPDATE tareas SET estado = ?, completada_en = ? WHERE id = ?
        `).run(nuevoEstado, completada_en, id);

        res.json({ ok: true, id: Number(id), estado: nuevoEstado });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

// Entregar tarea
app.patch('/api/tareas/:id/entregar', verificarToken, (req, res) => {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion || !descripcion.trim())
        return res.status(400).json({ error: 'La descripción es obligatoria.' });

    try {
        const tarea = db.prepare(`
            SELECT t.id FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE t.id = ? AND m.estudiante_nombre = ?
        `).get(id, req.usuario.nombre);

        if (!tarea)
            return res.status(404).json({ error: 'Tarea no encontrada' });

        const ahora = new Date().toISOString();

        const resultado = db.prepare(`
            UPDATE tareas
            SET estado = 'completada',
                entrega_descripcion = ?,
                entrega_fecha = ?,
                completada_en = ?
            WHERE id = ?
        `).run(descripcion.trim(), ahora, ahora, id);

        if (resultado.changes > 0) {
            res.json({ ok: true, mensaje: '¡Tarea entregada!' });
        } else {
            res.status(400).json({ error: 'No se pudo actualizar' });
        }
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==========================================
// TAREAS — ACCIONES PROFESOR
// ==========================================

// Todas las tareas del profesor
app.get('/api/tareas-profesor/todas', verificarToken, (req, res) => {
    if (req.usuario.tipo !== 'profesor' && req.usuario.tipo !== 'admin')
        return res.status(403).json({ error: 'Sin permisos' });

    try {
        const rows = db.prepare(`
            SELECT t.*, m.nombre AS materia_nombre, m.estudiante_nombre
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE m.profesor_nombre = ?
            ORDER BY t.fecha_entrega ASC
        `).all(req.usuario.nombre);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Tareas por materia para profesor
app.get('/api/tareas-profesor/:materiaId', verificarToken, (req, res) => {
    if (req.usuario.tipo !== 'profesor' && req.usuario.tipo !== 'admin')
        return res.status(403).json({ error: 'Sin permisos' });

    try {
        const rows = db.prepare(`
            SELECT t.*, m.nombre AS materia_nombre, m.estudiante_nombre
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE t.materia_id = ?
            ORDER BY t.fecha_entrega ASC
        `).all(req.params.materiaId);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// Calificar tarea
app.patch('/api/tareas/:id/calificar', verificarToken, (req, res) => {
    if (req.usuario.tipo !== 'profesor' && req.usuario.tipo !== 'admin')
        return res.status(403).json({ error: 'Sin permisos' });

    const { calificacion, comentario } = req.body;

    if (calificacion === undefined)
        return res.status(400).json({ error: 'La calificación es obligatoria' });

    try {
        const result = db.prepare(`
            UPDATE tareas SET calificacion = ?, comentario_prof = ? WHERE id = ?
        `).run(calificacion, comentario || null, req.params.id);

        if (result.changes === 0)
            return res.status(404).json({ error: 'Tarea no encontrada' });

        res.json({ ok: true, mensaje: 'Calificación guardada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al calificar' });
    }
});

// ==========================================
// MIS CALIFICACIONES (ESTUDIANTE)
// ==========================================

app.get('/api/mis-calificaciones', verificarToken, (req, res) => {
    try {
        const estudiante = req.usuario.nombre;

        const notas = db.prepare(`
            SELECT t.*, m.nombre AS materia_nombre
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE m.estudiante_nombre = ?
            ORDER BY t.fecha_entrega DESC
        `).all(estudiante);

        res.json(notas);
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// ==========================================
// NOTAS (alias de calificaciones)
// ==========================================

app.get('/api/notas/estudiante/:nombre', verificarToken, (req, res) => {
    try {
        const { nombre } = req.params;
        const rows = db.prepare(`
            SELECT t.id, t.descripcion, t.calificacion, t.comentario_prof, t.fecha_entrega,
                   m.nombre as materia_nombre
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE m.estudiante_nombre = ? AND t.calificacion IS NOT NULL
        `).all(nombre);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener notas' });
    }
});

// ==========================================
// PERFIL DE USUARIO
// ==========================================

app.get('/api/perfil', verificarToken, (req, res) => {
    try {
        const usuario = db.prepare(`
            SELECT id, nombre, email, documento, telefono, tipo, creado_en
            FROM usuarios WHERE id = ?
        `).get(req.usuario.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

app.patch('/api/perfil', verificarToken, (req, res) => {
    const { nombre, telefono, especialidad } = req.body;
    if (!nombre || !nombre.trim())
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    try {
        db.prepare(`
            UPDATE usuarios SET nombre = ?, telefono = ?, documento = ? WHERE id = ?
        `).run(nombre.trim(), telefono || null, especialidad || null, req.usuario.id);
        res.json({ ok: true, mensaje: 'Perfil actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

app.patch('/api/perfil/password', verificarToken, async (req, res) => {
    const { actual, nueva, confirmar } = req.body;
    if (!actual || !nueva || !confirmar)
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    if (nueva !== confirmar)
        return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    if (nueva.length < 6)
        return res.status(400).json({ error: 'Mínimo 6 caracteres' });
    try {
        const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        const ok = await bcrypt.compare(actual, usuario.password);
        if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        const hash = await bcrypt.hash(nueva, 10);
        db.prepare('UPDATE usuarios SET password = ? WHERE id = ?').run(hash, req.usuario.id);
        res.json({ ok: true, mensaje: 'Contraseña actualizada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// ==========================================
// RUTAS HTML
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

app.get('/:page.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, `${req.params.page}.html`),
        (err) => {
            if (err) res.status(404).json({ error: 'Página no encontrada' });
        }
    );
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ==========================================
// SERVIDOR
// ==========================================

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor EduAgenda corriendo en http://localhost:${PORT}\n`);
        console.log(`👑 Admin: ${ADMIN_EMAIL}`);
        console.log(`🔍 Debug BD: http://localhost:${PORT}/api/debug\n`);
    });
}

module.exports = app;