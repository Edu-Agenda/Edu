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

const JWT_SECRET =
  'clave_secreta_eduagenda_2024';

const ADMIN_EMAIL =
  'admin@eduagenda.com';

const ADMIN_PASSWORD =
  'Admin1234';

db.exec(`

  CREATE TABLE IF NOT EXISTS usuarios (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nombre TEXT NOT NULL,

    documento TEXT,

    email TEXT UNIQUE NOT NULL,

    telefono TEXT,

    password TEXT NOT NULL,

    tipo TEXT NOT NULL CHECK(
      tipo IN (
        'estudiante',
        'profesor',
        'admin'
      )
    ),

    creado_en TEXT DEFAULT (
      datetime('now','localtime')
    )

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

  -- NUEVAS TABLAS PARA MATERIAS Y TAREAS --
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
    FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE
  );

`);

console.log(
  '✅ Base de datos EduAgenda lista.'
);

// ==========================================
// MIDDLEWARE TOKEN
// ==========================================

function verificarToken(req, res, next) {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        error: 'Token requerido'
      });

    }

    const token =
      authHeader.split(' ')[1];

    try {

        req.usuario =
          jwt.verify(token, JWT_SECRET);

        next();

    } catch (err) {

        return res.status(401).json({
          error: 'Sesión expirada'
        });

    }
}

// ==========================================
// REGISTRO
// ==========================================

app.post('/registro', async (req, res) => {

    const {
      nombre,
      documento,
      email,
      telefono,
      password,
      tipo
    } = req.body;

    if (
      !nombre ||
      !email ||
      !password ||
      !tipo
    ) {

      return res.status(400).json({
        error:
          'Faltan campos obligatorios'
      });

    }

    if (email === ADMIN_EMAIL) {

      return res.status(400).json({
        error:
          'Este correo no está disponible'
      });

    }

    if (
      !['estudiante', 'profesor']
      .includes(tipo)
    ) {

      return res.status(400).json({
        error:
          'Tipo de usuario inválido'
      });

    }

    try {

        const hash =
          await bcrypt.hash(password, 10);

        db.prepare(`
          INSERT INTO usuarios (
            nombre,
            documento,
            email,
            telefono,
            password,
            tipo
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          nombre,
          documento,
          email,
          telefono,
          hash,
          tipo
        );

        res.status(201).json({

          ok: true,

          mensaje:
            'Usuario registrado exitosamente'

        });

    } catch (err) {

        if (
          err.message.includes('UNIQUE')
        ) {

          return res.status(400).json({
            error:
              'El correo ya está registrado'
          });

        }

        res.status(500).json({
          error:
            'Error interno del servidor'
        });

    }

});

// ==========================================
// LOGIN
// ==========================================

app.post('/login', async (req, res) => {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        error:
          'Correo y contraseña requeridos'
      });

    }

    // ======================================
    // ADMIN
    // ======================================

    if (email === ADMIN_EMAIL) {

        if (password !== ADMIN_PASSWORD) {

          return res.status(401).json({
            error:
              'Credenciales incorrectas'
          });

        }

        const token = jwt.sign(

            {
              id: 0,
              email: ADMIN_EMAIL,
              nombre: 'Administrador',
              tipo: 'admin'
            },

            JWT_SECRET,

            {
              expiresIn: '8h'
            }

        );

        return res.json({

          token,

          tipo: 'admin',

          nombre: 'Administrador',

          email: ADMIN_EMAIL,

          id: 0

        });

    }

    // ======================================
    // USUARIO NORMAL
    // ======================================

    try {

        const usuario =
          db.prepare(`
            SELECT *
            FROM usuarios
            WHERE email = ?
          `).get(email);

        if (
          !usuario ||
          !(await bcrypt.compare(
            password,
            usuario.password
          ))
        ) {

          return res.status(401).json({
            error:
              'Credenciales incorrectas'
          });

        }

        const token = jwt.sign(

            {
              id: usuario.id,
              email: usuario.email,
              tipo: usuario.tipo,
              nombre: usuario.nombre
            },

            JWT_SECRET,

            {
              expiresIn: '8h'
            }

        );

        res.json({

          token,

          tipo: usuario.tipo,

          nombre: usuario.nombre,

          email: usuario.email,

          id: usuario.id

        });

    } catch (error) {

        res.status(500).json({
          error:
            'Error en el servidor'
        });

    }

});

// ==========================================
// VERIFICAR TOKEN
// ==========================================

app.get(
  '/verificar',
  verificarToken,
  (req, res) => {

    res.json({

      ok: true,

      usuario: req.usuario

    });

});

// ==========================================
// LISTAR USUARIOS
// ==========================================

app.get(
  '/usuarios',
  verificarToken,
  (req, res) => {

    const rows = db.prepare(`
      SELECT
        id,
        nombre,
        email,
        documento,
        telefono,
        tipo,
        creado_en
      FROM usuarios
    `).all();

    res.json(rows);

});

// ==========================================
// OBTENER HORARIOS (GET)
// ==========================================
app.get('/api/horarios', (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM horarios`).all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
});

// ==========================================
// GUARDAR HORARIO (POST) - RUTA CORREGIDA
// ==========================================
app.post('/api/horarios', verificarToken, (req, res) => {
    const {
        profesor_nombre,
        materia,
        fecha,
        hora_inicio
    } = req.body;

    // Validación de campos
    if (!profesor_nombre || !materia || !fecha || !hora_inicio) {
        return res.status(400).json({
            error: 'Faltan datos obligatorios: profesor, materia, fecha y hora.'
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO horarios (
                profesor_nombre,
                materia,
                fecha,
                hora_inicio,
                estado
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            profesor_nombre,
            materia,
            fecha,
            hora_inicio,
            'disponible'
        );

        res.json({
            ok: true,
            mensaje: 'Horario guardado correctamente',
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('❌ Error guardando horario:', error);
        res.status(500).json({ error: 'Error interno al guardar en la base de datos' });
    }
});

// ==========================================
// ELIMINAR HORARIO (DELETE)
// ==========================================
app.delete('/api/horarios/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    try {
        const result = db.prepare('DELETE FROM horarios WHERE id = ?').run(id);
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
// CONFIRMAR PAGO
// ==========================================

app.post(
  '/confirmar-pago',
  verificarToken,
  (req, res) => {

    const {
      estudiante,
      fecha,
      hora,
      materia,
      profesor
    } = req.body;

    if (
      !estudiante ||
      !fecha ||
      !hora ||
      !materia ||
      !profesor
    ) {

      return res.status(400).json({
        error:
          'Faltan datos de la reserva'
      });

    }

    const horaLimpia =
      hora.split('-')[0].trim();

    const fechaLimpia =
      fecha.trim();

    const profesorLimpio =
      profesor.trim();

    console.log(`

--- PAGO RECIBIDO ---

Estudiante: ${estudiante}

${materia}
con ${profesorLimpio}

${fechaLimpia}
${horaLimpia}

`);

    try {

        const result = db.prepare(`
            UPDATE horarios

            SET
              estado = 'reservado',
              estudiante_nombre = ?

            WHERE
              fecha = ?
              AND hora_inicio = ?
              AND profesor_nombre = ?
        `).run(

            estudiante,

            fechaLimpia,

            horaLimpia,

            profesorLimpio

        );

        if (result.changes === 0) {

            db.prepare(`
                INSERT INTO horarios (
                  profesor_nombre,
                  materia,
                  fecha,
                  hora_inicio,
                  estado,
                  estudiante_nombre
                )
                VALUES (?, ?, ?, ?, 'reservado', ?)
            `).run(

                profesorLimpio,

                materia,

                fechaLimpia,

                horaLimpia,

                estudiante

            );

        }

        // AGREGAR AUTOMÁTICAMENTE A LA TABLA MATERIAS AL RESERVAR
        const existeMateria = db.prepare('SELECT id FROM materias WHERE nombre = ? AND estudiante_nombre = ?').get(materia, estudiante);
        if(!existeMateria) {
            db.prepare(`
                INSERT INTO materias (nombre, estudiante_nombre, profesor_nombre, horario)
                VALUES (?, ?, ?, ?)
            `).run(materia, estudiante, profesorLimpio, `${fechaLimpia} ${horaLimpia}`);
        }

        console.log(
          '✅ Reserva guardada'
        );

        res.json({

          ok: true,

          mensaje:
            'Reserva confirmada exitosamente'

        });

    } catch (error) {

        console.error(
          '❌ Error DB:',
          error
        );

        res.status(500).json({
          error:
            'Error al guardar la reserva'
        });

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
            // Cancelar por ID (más preciso)
            result = db.prepare(`
                UPDATE horarios
                SET estado = 'disponible', estudiante_nombre = NULL
                WHERE id = ? AND estado = 'reservado'
            `).run(id);
        } else {
            // Fallback: cancelar por profesor + fecha + hora
            result = db.prepare(`
                UPDATE horarios
                SET estado = 'disponible', estudiante_nombre = NULL
                WHERE profesor_nombre = ? AND fecha = ? AND hora_inicio = ? AND estado = 'reservado'
            `).run(profesor.trim(), fecha.trim(), hora.trim());
        }

        if (result.changes === 0)
            return res.status(404).json({ error: 'No se encontró la reserva o ya fue cancelada' });

        console.log(`✅ Clase cancelada — id:${id}`);
        res.json({ ok: true, mensaje: 'Clase cancelada exitosamente' });

    } catch (error) {
        console.error('❌ Error al cancelar:', error);
        res.status(500).json({ error: 'Error interno al cancelar la clase' });
    }
});
// ==========================================
// OBTENER ESTADÍSTICAS DE INGRESOS
// ==========================================
app.get('/api/ingresos-stats', verificarToken, (req, res) => {
    try {
        const profesorNombre = req.usuario.nombre;
        const PRECIO_CLASE = 50000; // Valor de ejemplo por reserva

        // 1. Obtener todas las reservas del profesor
        const reservas = db.prepare(`
            SELECT estado, COUNT(*) as cantidad 
            FROM horarios 
            WHERE profesor_nombre = ? AND estado = 'reservado'
        `).get(profesorNombre);

        // 2. Obtener lista detallada para la tabla
        const detalle = db.prepare(`
            SELECT estudiante_nombre, materia, fecha, hora_inicio
            FROM horarios 
            WHERE profesor_nombre = ? AND estado = 'reservado'
            ORDER BY fecha DESC
        `).all(profesorNombre);

        const totalIngresos = (reservas.cantidad || 0) * PRECIO_CLASE;

        res.json({
            totalIngresos,
            cantidadReservas: reservas.cantidad || 0,
            detalle: detalle.map(d => ({
                ...d,
                monto: PRECIO_CLASE,
                estadoPago: 'Pagado' // Por defecto si está reservado
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular ingresos' });
    }
});
// ==========================================
// OBTENER MIS ESTUDIANTES (ACTUALIZADO)
// ==========================================
app.get('/api/mis-estudiantes', verificarToken, (req, res) => {
    try {
        const profesorNombre = req.usuario.nombre;

        // Buscamos las clases reservadas y traemos los datos de contacto del alumno
        const estudiantes = db.prepare(`
            SELECT 
                h.id,
                h.estudiante_nombre,
                h.materia,
                h.fecha,
                h.hora_inicio,
                u.email,
                u.telefono
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
// ENDPOINTS PARA MATERIAS Y TAREAS (NUEVO)
// ==========================================

// Listar materias del profesor autenticado
app.get('/api/materias', verificarToken, (req, res) => {
    try {
        const profesor = req.usuario.nombre;
        const rows = db.prepare('SELECT * FROM materias WHERE profesor_nombre = ?').all(profesor);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener materias' });
    }
});

// Eliminar materia
app.delete('/api/materias/:id', verificarToken, (req, res) => {
    try {
        db.prepare('DELETE FROM materias WHERE id = ?').run(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar materia' });
    }
});

// Crear tarea para una materia
app.post('/api/tareas', verificarToken, (req, res) => {
    const { materiaId, descripcion, fecha_entrega } = req.body;
    try {
        db.prepare(`
            INSERT INTO tareas (materia_id, descripcion, fecha_entrega)
            VALUES (?, ?, ?)
        `).run(materiaId, descripcion, fecha_entrega);
        res.json({ ok: true, mensaje: 'Tarea creada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear tarea' });
    }
});

// ✅ AGREGADO — Listar tareas de una materia (necesario para materias.html)
app.get('/api/tareas/:materiaId', verificarToken, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT id, descripcion, fecha_entrega
            FROM tareas
            WHERE materia_id = ?
            ORDER BY fecha_entrega ASC
        `).all(req.params.materiaId);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

// ✅ AGREGADO — Eliminar una tarea por ID
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
// Obtener TODAS las tareas pendientes del estudiante (sin importar la materia)
app.get('/api/tareas-todas-estudiante', verificarToken, (req, res) => {
    try {
        const nombreEstudiante = req.usuario.nombre;
        const rows = db.prepare(`
            SELECT t.*, m.nombre as materia_nombre 
            FROM tareas t
            JOIN materias m ON t.materia_id = m.id
            WHERE m.estudiante_nombre = ? AND t.estado = 'pendiente'
        `).all(nombreEstudiante);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
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
// RUTAS HTML
// ==========================================

app.get('/', (req, res) => {

    res.sendFile(
      path.join(__dirname, 'main.html')
    );

});

app.get('/:page.html', (req, res) => {

    res.sendFile(

      path.join(
        __dirname,
        `${req.params.page}.html`
      ),

      (err) => {

        if (err) {

          res.status(404).json({
            error:
              'Página no encontrada'
          });

        }

      }

    );

});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {

    res.status(404).json({

      error:
        `Ruta no encontrada:
        ${req.method}
        ${req.path}`

    });

});

// ==========================================
// SERVIDOR
// ==========================================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(`
🚀 Servidor EduAgenda
http://localhost:${PORT}
`);

    console.log(`
👑 Admin:
${ADMIN_EMAIL}
`);

});