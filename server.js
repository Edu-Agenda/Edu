const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const SECRET_KEY = 'clave_secreta_eduagenda_2024_segura';

// ======================
// MIDDLEWARE
// ======================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ======================
// RUTA PRINCIPAL (MAIN)
// ======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// ======================
// BASE DE DATOS
// ======================
const db = new sqlite3.Database('./edu.db', (err) => {
    if (err) {
        console.log('❌ DB error:', err.message);
    } else {
        console.log('✅ SQLite conectado');
        crearTablas();
    }
});

// ======================
// TABLAS
// ======================
function crearTablas() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            email TEXT UNIQUE,
            password TEXT,
            documento TEXT,
            telefono TEXT,
            tipo TEXT DEFAULT 'estudiante',
            creado_en TEXT DEFAULT (datetime('now','localtime'))
        )
    `, () => {

        console.log("✅ Tabla users lista");

        // ✅ AGREGADO
        crearAdmin();

    });
}

// ======================
// ADMIN AUTOMÁTICO
// ======================
async function crearAdmin() {

    const email = 'admin@edu.com';
    const password = '123456';

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, admin) => {

            if (err) {
                console.log("❌ Error buscando admin");
                return;
            }

            // Si no existe → crearlo
            if (!admin) {

                const hash = await bcrypt.hash(password, 10);

                db.run(
                    `
                    INSERT INTO users
                    (nombre,email,password,documento,telefono,tipo)
                    VALUES (?,?,?,?,?,?)
                    `,
                    [
                        'Administrador',
                        email,
                        hash,
                        '00000000',
                        '3000000000',
                        'admin'
                    ]
                );

                console.log("✅ Admin creado");

            } else {

                // Si existe pero está vacío → actualizarlo
                if (!admin.documento || !admin.telefono) {

                    db.run(
                        `
                        UPDATE users
                        SET documento = ?,
                            telefono = ?
                        WHERE email = ?
                        `,
                        [
                            '00000000',
                            '3000000000',
                            email
                        ]
                    );

                    console.log("✅ Admin actualizado");
                }
            }

        }
    );
}

// ======================
// VERIFICAR TOKEN
// ======================
function verificarToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// ======================
// RUTA VERIFICAR (CLAVE)
// ======================
app.get('/verificar', verificarToken, (req, res) => {
    res.json({
        ok: true,
        usuario: req.usuario
    });
});

// ======================
// LOGIN
// ======================
app.post('/login', (req, res) => {

    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

        if (err) {
            return res.status(500).json({ error: "Error en la base de datos" });
        }

        if (!user) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                nombre: user.nombre,
                tipo: user.tipo
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            nombre: user.nombre,
            tipo: user.tipo
        });

    });

});

// ======================
// USUARIOS (PROTEGIDO)
// ======================
app.get('/usuarios', verificarToken, (req, res) => {

    db.all(
        `SELECT id, nombre, email, documento, telefono, tipo, creado_en FROM users`,
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({ error: 'Error servidor' });
            }

            res.json(rows);
        }
    );

});

// ======================
// SERVIDOR
// ======================
app.listen(PORT, () => {
    console.log("🚀 Servidor iniciado");
    console.log(`http://localhost:${PORT}`);
});
