// ╔══════════════════════════════════════════════════════════════════╗
// ║         ROBOT DE QA — EDUAGENDA — VERSIÓN ULTRA ROBUSTA         ║
// ║  Maneja: modales, alertas, dialogs, navegación segura, retries  ║
// ╚══════════════════════════════════════════════════════════════════╝
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════
//  LOGGER CON COLOR
// ═══════════════════════════════════════════════════
const C = {
    reset:   '\x1b[0m',
    verde:   '\x1b[32m',
    rojo:    '\x1b[31m',
    amarillo:'\x1b[33m',
    azul:    '\x1b[34m',
    cyan:    '\x1b[36m',
    blanco:  '\x1b[37m',
    negrita: '\x1b[1m'
};
const log = {
    titulo: (m) => console.log(`\n${C.cyan}${C.negrita}${'='.repeat(65)}\n  ${m}\n${'='.repeat(65)}${C.reset}`),
    fase:   (m) => console.log(`\n${C.azul}${C.negrita}${'-'.repeat(55)}\n  ${m}\n${'-'.repeat(55)}${C.reset}`),
    ok:     (m) => console.log(`${C.verde}   OK  ${m}${C.reset}`),
    info:   (m) => console.log(`${C.blanco}   >>  ${m}${C.reset}`),
    warn:   (m) => console.log(`${C.amarillo}   !!  ${m}${C.reset}`),
    error:  (m) => console.log(`${C.rojo}   XX  ${m}${C.reset}`),
    paso:   (m) => console.log(`\n${C.cyan}[+] ${m}${C.reset}`),
    cap:    (m) => console.log(`${C.azul}   CAP ${m}${C.reset}`),
    wait:   (m) => console.log(`${C.amarillo}   ... ${m}${C.reset}`)
};

// ═══════════════════════════════════════════════════
//  ROBOT PRINCIPAL
// ═══════════════════════════════════════════════════
class EduAgendaRobot {

    constructor() {
        this.browser        = null;
        this.page           = null;
        this.serverProcess  = null;
        this.baseUrl        = 'http://localhost:3000';
        this.capturaIdx     = 0;
        this.results        = { acciones: [], errores: [], capturas: [] };

        const ts = Date.now();
        this.D = {
            profesor: {
                nombre:   `Prof Robot ${ts}`,
                email:    `prof_${ts}@test.com`,
                password: '123456',
                tipo:     'profesor',
                doc:      '11223344',
                tel:      '3001111111'
            },
            estudiante: {
                nombre:   `Est Robot ${ts}`,
                email:    `est_${ts}@test.com`,
                password: '123456',
                tipo:     'estudiante',
                doc:      '55667788',
                tel:      '3002222222'
            },
            admin: {
                email:    'admin@eduagenda.com',
                password: 'Admin1234',
                tipo:     'admin'
            },
            horario: {
                materia: 'Fisica',
                fecha:   '2026-12-25',
                hora:    '16:00'
            },
            nequi: { celular: '3001234567' },
            tarea: {
                texto:   'Cual es el pais mas grande del mundo?',
                fecha:   '2026-12-30',
                entrega: 'Rusia'
            },
            calificacion: {
                nota:       '5.0',
                comentario: 'Excelente respuesta correcta!'
            }
        };
    }

    // ======================================================
    //  A. INFRAESTRUCTURA
    // ======================================================

    async iniciarServidor() {
        log.paso('Iniciando servidor EduAgenda...');
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['server.js'], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            this.serverProcess.stdout.on('data', data => {
                const msg = data.toString();
                if (msg.includes('corriendo') || msg.includes('lista') || msg.includes('running')) {
                    log.ok('Servidor listo');
                    resolve();
                }
            });
            this.serverProcess.stderr.on('data', d => {
                const t = d.toString().trim();
                if (t && !t.includes('DeprecationWarning')) log.warn('Servidor: ' + t);
            });
            setTimeout(() => reject(new Error('Timeout 20s iniciando servidor')), 20000);
        });
    }

    // MODIFICACIÓN 1: slowMo reducido de 30 a 15
    async iniciarNavegador() {
        log.paso('Abriendo navegador...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            slowMo: 15,  // ← Cambiado de 30 a 15 (más rápido pero visible)
            args: ['--start-maximized', '--disable-infobars', '--no-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setDefaultTimeout(20000);
        await this.page.setDefaultNavigationTimeout(20000);

        // Interceptar TODOS los dialogs nativos del browser
        this.page.on('dialog', async dialog => {
            log.info('Dialog [' + dialog.type() + ']: "' + dialog.message() + '" -> aceptando');
            try { await dialog.accept(); } catch (_) {}
        });

        this.page.on('close', () => log.warn('Pagina cerrada inesperadamente'));

        const dir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        log.ok('Navegador listo');
    }

    // ======================================================
    //  B. HELPERS
    // ======================================================

    // MODIFICACIÓN 7: Tiempos reducidos un 20%
    async esperar(ms, msg) {
        if (msg) log.wait(msg);
        var tiempoReal = Math.floor(ms * 0.8);
        if (tiempoReal < 150) tiempoReal = 150;
        await new Promise(r => setTimeout(r, tiempoReal));
    }

    async cap(nombre) {
        try {
            this.capturaIdx++;
            const num  = String(this.capturaIdx).padStart(2, '0');
            const safe = nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const file = num + '_' + safe + '.png';
            const ruta = path.join(__dirname, 'screenshots', file);
            await this.page.screenshot({ path: ruta, fullPage: true });
            this.results.capturas.push(ruta);
            log.cap(file);
        } catch (e) {
            log.warn('No se pudo capturar "' + nombre + '": ' + e.message);
        }
    }

    async verSelector(selector, ms) {
        ms = ms || 8000;
        try {
            await this.page.waitForSelector(selector, { visible: true, timeout: ms });
            return true;
        } catch { return false; }
    }

    async esperarOculto(selector, ms) {
        ms = ms || 5000;
        try {
            await this.page.waitForSelector(selector, { hidden: true, timeout: ms });
        } catch (_) {}
    }

    async escribir(selector, texto, delay) {
        delay = delay || 70;
        const ok = await this.verSelector(selector, 8000);
        if (!ok) { log.warn('Campo no visible: ' + selector); return false; }
        await this.page.evaluate(function(sel) {
            var el = document.querySelector(sel);
            if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
        }, selector);
        await this.esperar(150);
        await this.page.type(selector, texto, { delay: delay });
        await this.esperar(200);
        return true;
    }

    async click(selector, ms) {
        ms = ms || 8000;
        const ok = await this.verSelector(selector, ms);
        if (!ok) { log.warn('Boton no visible: ' + selector); return false; }
        await this.page.click(selector);
        await this.esperar(300);
        return true;
    }

    // Click al primero que exista de una lista de selectores
    async clickPrimero() {
        var selectores = Array.from(arguments);
        for (var i = 0; i < selectores.length; i++) {
            var sel = selectores[i];
            try {
                var el = await this.page.$(sel);
                if (!el) continue;
                var visible = await this.page.evaluate(function(s) {
                    var e = document.querySelector(s);
                    if (!e) return false;
                    var r = e.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                }, sel);
                if (visible) {
                    await this.page.click(sel);
                    await this.esperar(400);
                    return sel;
                }
            } catch (_) {}
        }
        log.warn('Ninguno encontrado de: ' + selectores.slice(0, 3).join(' | '));
        return null;
    }

    // Escribir en el primer selector que exista
    async escribirEn(texto, delay) {
        var selectores = Array.from(arguments).slice(2);
        for (var i = 0; i < selectores.length; i++) {
            if (await this.verSelector(selectores[i], 3000)) {
                await this.escribir(selectores[i], texto, delay);
                return selectores[i];
            }
        }
        return null;
    }

    reg(accion, extra) {
        extra = extra || {};
        this.results.acciones.push(Object.assign({ accion: accion, ok: true }, extra));
    }

    // ======================================================
    //  C. MANEJO DE MODALES / ALERTAS
    // ======================================================

    async cerrarModal(intentos) {
        intentos = intentos || 3;
        for (var i = 0; i < intentos; i++) {
            await this.esperar(700);

            // SweetAlert2
            var swal2 = await this.clickPrimero(
                '.swal2-confirm',
                'button.swal2-confirm',
                '.swal2-popup .swal2-confirm',
                '.swal2-ok'
            );
            if (swal2) { log.info('Modal SweetAlert2 cerrado'); await this.esperar(600); continue; }

            // SweetAlert1
            var swal1 = await this.clickPrimero('.sweet-alert button');
            if (swal1) { log.info('Modal SweetAlert1 cerrado'); await this.esperar(600); continue; }

            // Bootstrap Modal
            var bsBtn = await this.clickPrimero(
                '.modal.show .btn-primary',
                '.modal.show .btn-success',
                '.modal.show button[data-bs-dismiss="modal"]',
                '.modal.show .btn-close',
                '.modal.show .close',
                '.modal-footer .btn-primary',
                '.modal-footer .btn-success',
                '#btnAceptar',
                '#btnOk',
                '#btnCerrar',
                '#btnClose'
            );
            if (bsBtn) { log.info('Modal Bootstrap cerrado'); await this.esperar(800); continue; }

            // Genérico
            var gen = await this.clickPrimero(
                'button[class*="ok"]',
                'button[class*="accept"]',
                'button[class*="confirm"]'
            );
            if (gen) { log.info('Modal generico cerrado'); await this.esperar(600); continue; }

            // Escape como último recurso
            var overlay = await this.page.$('.modal-backdrop, .swal2-backdrop-show, .overlay');
            if (overlay) {
                await this.page.keyboard.press('Escape');
                log.info('Overlay cerrado con Escape');
                await this.esperar(600);
                continue;
            }

            break;
        }

        await this.esperarOculto('.modal.show', 4000);
        await this.esperarOculto('.swal2-container', 3000);
        await this.esperar(400);
    }

    async navegarSeguro(url, etiqueta) {
        var urlCompleta = url.startsWith('http') ? url : this.baseUrl + '/' + url;
        if (etiqueta) log.paso('Navegando a: ' + etiqueta);

        await this.cerrarModal(2);

        await this.page.goto(urlCompleta, { waitUntil: 'networkidle2', timeout: 20000 });
        await this.esperar(1500);

        var actual = this.page.url();
        if (actual.includes('sesion') && !urlCompleta.includes('sesion')) {
            log.warn('Redirigido a login al intentar ir a ' + etiqueta);
            return false;
        }
        return true;
    }

    // ======================================================
    //  D. ACCIONES DE LA APP
    // ======================================================

    // ── 0. Pagina de inicio ─────────────────────────────
    async irInicio() {
        log.paso('Navegando a pagina principal...');
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        await this.esperar(2000);
        await this.cap('inicio');
        log.ok('Pagina principal cargada');
    }

    // ── 1. REGISTRO ─────────────────────────────────────
    async registrarUsuario(u) {
        log.fase('REGISTRO - ' + u.tipo.toUpperCase() + ': ' + u.nombre);

        await this.page.goto(this.baseUrl + '/registrate.html', { waitUntil: 'networkidle2' });
        await this.esperar(2000, 'Cargando formulario de registro...');
        await this.cap('reg_' + u.tipo + '_form_vacio');

        var formOk = await this.verSelector('input[name="nombre"]', 12000);
        if (!formOk) {
            throw new Error('Formulario de registro no disponible para ' + u.tipo);
        }

        log.info('Nombre: ' + u.nombre);
        await this.escribir('input[name="nombre"]', u.nombre);

        log.info('Documento: ' + u.doc);
        await this.escribir('input[name="documento"]', u.doc);

        log.info('Email: ' + u.email);
        await this.escribir('input[name="email"]', u.email);

        log.info('Telefono: ' + u.tel);
        await this.escribir('input[name="telefono"]', u.tel);

        log.info('Password: ******');
        await this.escribir('input[name="password"]', u.password);

        log.info('Confirmar password: ******');
        await this.escribir('input[name="confirm_password"]', u.password);

        log.info('Tipo: ' + u.tipo);
        var tipoOk = await this.clickPrimero(
            'input[value="' + u.tipo + '"]',
            'input[name="tipo"][value="' + u.tipo + '"]',
            'input[name="rol"][value="' + u.tipo + '"]',
            '#' + u.tipo
        );

        if (!tipoOk) {
            var labOk = await this.page.evaluate(function(tipo) {
                var labels = document.querySelectorAll('label');
                for (var j = 0; j < labels.length; j++) {
                    if (labels[j].textContent.toLowerCase().indexOf(tipo) >= 0) {
                        labels[j].click();
                        return true;
                    }
                }
                return false;
            }, u.tipo);
            if (labOk) log.info('Tipo seleccionado via label');
            else log.warn('No se encontro radio para tipo "' + u.tipo + '"');
        }

        await this.esperar(500);
        await this.cap('reg_' + u.tipo + '_lleno');

        log.info('Enviando formulario...');
        await this.clickPrimero(
            'button[type="submit"]',
            'input[type="submit"]',
            '#btnRegistrar',
            '#btnRegistro',
            '.btn-registro',
            'form button'
        );

        log.info('Esperando confirmacion...');
        await this.esperar(1500);

        var fin = Date.now() + 6000;
        while (Date.now() < fin) {
            var haySwal2 = await this.page.$('.swal2-popup');
            var hasBs    = await this.page.$('.modal.show');
            var url      = this.page.url();

            if (haySwal2) {
                await this.cap('reg_' + u.tipo + '_modal_ok');
                log.info('Modal de exito (SweetAlert2) detectado -> cerrando...');
                await this.cerrarModal(4);
                break;
            }
            if (hasBs) {
                await this.cap('reg_' + u.tipo + '_modal_ok');
                log.info('Modal Bootstrap detectado -> cerrando...');
                await this.cerrarModal(4);
                break;
            }
            if (!url.includes('registrate')) {
                log.info('Registro exitoso, redirigido automaticamente');
                break;
            }
            await this.esperar(400);
        }

        await this.esperar(1500);
        await this.cap('reg_' + u.tipo + '_resultado');
        log.ok(u.tipo.toUpperCase() + ' registrado: ' + u.nombre);
        this.reg('registro', { nombre: u.nombre, tipo: u.tipo });

        await this.esperar(2000, 'Pausa entre registros...');
    }

    // ── 2. LOGIN ─────────────────────────────────────────
    async login(u) {
        log.fase('LOGIN - ' + u.tipo.toUpperCase() + ': ' + u.email);

        await this.page.goto(this.baseUrl + '/sesion.html', { waitUntil: 'networkidle2' });
        await this.esperar(1500, 'Cargando login...');
        await this.cap('login_' + u.tipo + '_form');

        var emailOk = await this.verSelector('#email', 10000);
        if (!emailOk) throw new Error('Formulario de login no disponible');

        log.info('Email: ' + u.email);
        await this.escribir('#email', u.email);

        log.info('Password: ******');
        await this.escribir('#password', u.password);

        await this.cap('login_' + u.tipo + '_lleno');

        log.info('Presionando Iniciar Sesion...');
        await this.clickPrimero('#btnLogin', 'button[type="submit"]', '.btn-login', 'form button');

        await this.esperar(4000, 'Verificando credenciales...');
        await this.cerrarModal(2);

        var urlActual = this.page.url();
        log.info('URL post-login: ' + urlActual);

        var exito = urlActual.includes(u.tipo + '.html')
                 || urlActual.includes('admin.html')
                 || urlActual.includes('dashboard')
                 || (!urlActual.includes('sesion') && !urlActual.includes('login'));

        if (exito) {
            log.ok('Sesion iniciada como ' + u.tipo.toUpperCase());
            await this.cap('login_' + u.tipo + '_dashboard');
            this.reg('login', { tipo: u.tipo });
            return true;
        }

        log.warn('Login puede haber fallado. URL: ' + urlActual);
        await this.cap('login_' + u.tipo + '_fallo');
        return false;
    }

    // ── 3. LOGOUT ────────────────────────────────────────
    async logout(tipo) {
        tipo = tipo || '';
        log.paso('Cerrando sesion' + (tipo ? ' (' + tipo + ')' : '') + '...');

        var logoutBtn = await this.clickPrimero(
            '#logoutBtn',
            '.logout-btn',
            '.btn-logout',
            'a[href*="logout"]',
            'a[onclick*="logout"]',
            'button[onclick*="logout"]',
            '[data-action="logout"]',
            '#cerrarSesion',
            '.cerrar-sesion'
        );

        if (logoutBtn) {
            await this.esperar(2500, 'Cerrando sesion...');
            await this.cerrarModal(2);
            await this.cap('logout_' + (tipo || 'ok'));
            log.ok('Sesion cerrada');
            this.reg('logout', { tipo: tipo });
            return true;
        }

        log.warn('Boton logout no encontrado -> navegando a sesion.html');
        await this.page.goto(this.baseUrl + '/sesion.html', { waitUntil: 'networkidle2' });
        await this.esperar(1500);
        await this.cap('logout_' + (tipo || 'forzado'));
        log.ok('Sesion cerrada (forzado)');
        this.reg('logout', { tipo: tipo, modo: 'forzado' });
        return true;
    }

    // ── 4. AGREGAR HORARIO ───────────────────────────────
    // MODIFICACIÓN 2: Materias y horas aleatorias
    async agregarHorario() {
        // Arrays de materias y horas disponibles
        const materiasDisponibles = [
            'Fisica', 'Quimica', 'Matematicas', 'Biologia',
            'Historia', 'Ingles', 'Programacion', 'Arte'
        ];
        const horasDisponibles = ['14:00', '15:00', '16:00', '17:00', '18:00'];

        // Seleccionar materia y hora aleatoria
        const materiaAleatoria = materiasDisponibles[Math.floor(Math.random() * materiasDisponibles.length)];
        const horaAleatoria    = horasDisponibles[Math.floor(Math.random() * horasDisponibles.length)];

        this.D.horario.materia = materiaAleatoria;
        this.D.horario.hora    = horaAleatoria;

        var materia = this.D.horario.materia;
        var fecha   = this.D.horario.fecha;
        var hora    = this.D.horario.hora;
        log.fase('AGREGAR HORARIO - ' + materia + ' - ' + fecha + ' - ' + hora);

        await this.navegarSeguro('profesor.html', 'Dashboard Profesor');
        await this.esperar(2000);
        await this.cap('horario_dashboard_profesor');

        log.info('Buscando boton para agregar horario...');
        var btnModal = await this.clickPrimero(
            '#abrirModal',
            '#btnNuevoHorario',
            '#btnAgregarHorario',
            '.btn-nuevo-horario',
            '.btn-agregar',
            '[data-modal="horario"]',
            'button[onclick*="horario"]',
            'button[onclick*="modal"]'
        );

        if (btnModal) {
            log.info('Modal de horario abierto');
            await this.esperar(1500);
            await this.cap('horario_modal_abierto');
        }

        log.info('Materia: ' + materia);
        var campM = await this.escribirEn(materia, 70,
            '#materia',
            'input[name="materia"]',
            'input[placeholder*="materia"]'
        );
        if (!campM) log.warn('Campo materia no encontrado');

        await this.esperar(400);

        log.info('Fecha: ' + fecha);
        var campF = await this.escribirEn(fecha, 70,
            '#fecha',
            'input[name="fecha"]',
            'input[type="date"]'
        );
        if (campF) {
            await this.page.evaluate(function(sel, v) {
                var el = document.querySelector(sel);
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input',  { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, campF, fecha);
        }

        await this.esperar(400);

        log.info('Hora: ' + hora);
        var campH = await this.escribirEn(hora, 70,
            '#hora_inicio',
            'input[name="hora_inicio"]',
            'input[name="hora"]',
            'input[type="time"]',
            '#hora'
        );
        if (campH) {
            await this.page.evaluate(function(sel, v) {
                var el = document.querySelector(sel);
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input',  { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, campH, hora);
        }

        await this.esperar(500);
        await this.cap('horario_formulario_lleno');

        log.info('Guardando horario...');
        await this.clickPrimero(
            '#formHorario button[type="submit"]',
            '#btnGuardarHorario',
            '.btn-guardar',
            'button[type="submit"]',
            '.modal.show button[type="submit"]',
            'form button'
        );

        await this.esperar(2000, 'Guardando...');
        await this.cerrarModal(3);
        await this.esperar(1000);
        await this.cap('horario_guardado');
        log.ok('Horario guardado: ' + materia + ' ' + hora);
        this.reg('agregar_horario', { materia: materia, fecha: fecha, hora: hora });
    }

    // ── 5. RESERVAR CLASE CON NEQUI ──────────────────────
    async reservarClase() {
        log.fase('RESERVAR CLASE - Metodo: Nequi');

        await this.navegarSeguro('estudiante.html', 'Agenda Estudiante');
        await this.esperar(3000, 'Cargando horarios disponibles...');
        await this.cap('reserva_agenda');

        log.info('Buscando slots disponibles...');
        var slotSels = [
            '.slot.disponible',
            '.horario-disponible',
            '.slot-disponible',
            '.clase-disponible',
            '[data-estado="disponible"]',
            '.available'
        ];

        var slotOk = false;
        for (var i = 0; i < slotSels.length; i++) {
            var slots = await this.page.$$(slotSels[i]);
            if (slots.length > 0) {
                log.info(slots.length + ' slot(s) disponible(s) - seleccionando primero...');
                await slots[0].click();
                await this.esperar(1500);
                slotOk = true;
                break;
            }
        }

        if (!slotOk) {
            log.warn('Sin slots disponibles');
            await this.cap('reserva_sin_slots');
            return false;
        }

        await this.cap('reserva_slot_seleccionado');

        log.info('Presionando boton Reservar...');
        await this.clickPrimero(
            '#btnReservar',
            '.btn-reservar',
            'button[onclick*="reservar"]',
            '[data-action="reservar"]'
        );
        await this.esperar(2000);
        await this.cap('reserva_pago_modal');

        log.info('Seleccionando Nequi...');
        var nequiOk = await this.clickPrimero(
            '[data-metodo="nequi"]',
            '[data-pago="nequi"]',
            '.metodo-nequi',
            '#nequi',
            'input[value="nequi"]'
        );

        if (!nequiOk) {
            nequiOk = await this.page.evaluate(function() {
                var all = document.querySelectorAll('button, label, .metodo-btn, .metodo-pago, .option, .card');
                for (var k = 0; k < all.length; k++) {
                    if (all[k].textContent.toLowerCase().indexOf('nequi') >= 0) {
                        all[k].click();
                        return true;
                    }
                }
                return false;
            });
            if (nequiOk) log.info('Nequi seleccionado por texto');
        }

        await this.esperar(1000);
        await this.cap('reserva_nequi_seleccionado');

        log.info('Celular Nequi: ' + this.D.nequi.celular);
        await this.escribirEn(this.D.nequi.celular, 80,
            '#celularNequi',
            '#numeroCelular',
            '#celular',
            'input[name="celular"]',
            'input[name="telefono"]',
            'input[placeholder*="celular"]',
            'input[placeholder*="Nequi"]',
            'input[placeholder*="numero"]',
            'input[type="tel"]'
        );

        await this.esperar(800);
        await this.cap('reserva_celular_ingresado');

        log.info('Confirmando pago...');
        await this.clickPrimero(
            '#btnConfirmarPago',
            '.btn-confirmar-pago',
            '#btnPagar',
            '.btn-pagar',
            'button[onclick*="pagar"]',
            'button[onclick*="confirmar"]',
            '.modal.show button[type="submit"]',
            'button[type="submit"]'
        );

        await this.esperar(4000, 'Procesando pago Nequi...');
        await this.cerrarModal(3);
        await this.esperar(1500);
        await this.cap('reserva_confirmada');
        log.ok('Reserva realizada con Nequi');
        this.reg('reservar_clase', { metodo: 'Nequi', celular: this.D.nequi.celular });
        return true;
    }

    // ── 6. VER MATERIAS ──────────────────────────────────
    async verMaterias(rol) {
        log.paso('Viendo Materias como ' + rol + '...');
        await this.navegarSeguro('materias.html', 'Mis Materias');
        await this.esperar(2500, 'Cargando materias...');
        await this.cap('materias_' + rol);
        log.ok('Materias cargadas (' + rol + ')');
        this.reg('ver_materias', { rol: rol });
    }

    // ── 7. ASIGNAR TAREA ─────────────────────────────────
    async asignarTarea() {
        var texto = this.D.tarea.texto;
        var fecha = this.D.tarea.fecha;
        log.fase('ASIGNAR TAREA: "' + texto + '"');

        await this.navegarSeguro('materias.html', 'Materias del Profesor');
        await this.esperar(2500);
        await this.cap('tarea_materias_profesor');

        log.info('Buscando boton para asignar tarea...');
        var btnT = await this.clickPrimero(
            '.task',
            '.btn-tarea',
            '#btnTarea',
            '[data-action="tarea"]',
            '[data-modal="tarea"]',
            '.icon-task',
            'button[onclick*="tarea"]'
        );

        if (btnT) {
            log.info('Formulario de tarea abierto');
            await this.esperar(1500);
            await this.cap('tarea_modal_abierto');
        }

        log.info('Pregunta: ' + texto);
        await this.escribirEn(texto, 60,
            '#desc',
            '#descripcion',
            '#pregunta',
            'textarea[name="descripcion"]',
            'textarea[name="desc"]',
            'textarea'
        );

        await this.esperar(400);

        log.info('Fecha entrega: ' + fecha);
        var campFe = await this.escribirEn(fecha, 60,
            '#fechaEntrega',
            'input[name="fechaEntrega"]',
            'input[name="fecha_entrega"]',
            'input[type="date"]'
        );
        if (campFe) {
            await this.page.evaluate(function(sel, v) {
                var el = document.querySelector(sel);
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, campFe, fecha);
        }

        await this.esperar(500);
        await this.cap('tarea_formulario_lleno');

        log.info('Guardando tarea...');
        await this.clickPrimero(
            '#btnEnviar',
            '.btn-send',
            '#btnGuardar',
            '.btn-guardar',
            '.modal.show button[type="submit"]',
            'button[type="submit"]',
            'form button'
        );

        await this.esperar(2500, 'Guardando tarea...');
        await this.cerrarModal(3);
        await this.esperar(1000);
        await this.cap('tarea_asignada');
        log.ok('Tarea asignada');
        this.reg('asignar_tarea', { texto: texto, fecha: fecha });
    }

    // ── 8. VER TAREAS PENDIENTES ─────────────────────────
    async verTareasPendientes() {
        log.paso('Viendo Tareas Pendientes...');
        var rutas = ['tareas.html', 'tareas-pendientes.html', 'mis-tareas.html'];
        var cargado = false;
        for (var i = 0; i < rutas.length; i++) {
            try {
                await this.page.goto(this.baseUrl + '/' + rutas[i], { waitUntil: 'networkidle2', timeout: 8000 });
                await this.esperar(2000);
                var url = this.page.url();
                if (!url.includes('sesion')) { log.info('Tareas en: ' + rutas[i]); cargado = true; break; }
            } catch (_) {}
        }
        if (!cargado) {
            log.warn('Pagina de tareas no encontrada');
            await this.navegarSeguro('estudiante.html', 'Estudiante');
            await this.esperar(2000);
        }
        await this.cap('tareas_pendientes_lista');
        log.ok('Tareas pendientes cargadas');
        this.reg('ver_tareas_pendientes');
    }

    // ── 9. ENTREGAR TAREA ────────────────────────────────
    // MODIFICACIÓN 6: espera adicional antes de buscar el botón
    async entregarTarea() {
        var entrega = this.D.tarea.entrega;
        log.fase('ENTREGAR TAREA - Respuesta: "' + entrega + '"');

        // Esperar a que la página de tareas esté completamente cargada
        await this.esperar(2000, 'Asegurando que las tareas esten visibles...');

        log.info('Buscando boton para entregar/realizar tarea...');
        var btnE = await this.clickPrimero(
            '.btn-entregar',
            '.btn-realizar',
            '#btnEntregar',
            '#btnRealizarTarea',
            '[data-action="entregar"]',
            'button[onclick*="entregar"]',
            'button[onclick*="realizar"]'
        );

        if (!btnE) {
            var porTexto = await this.page.evaluate(function() {
                var btns = document.querySelectorAll('button, a, .btn');
                for (var k = 0; k < btns.length; k++) {
                    var t = btns[k].textContent.toLowerCase();
                    if (t.indexOf('entregar') >= 0 || t.indexOf('realizar') >= 0 || t.indexOf('responder') >= 0) {
                        btns[k].click();
                        return btns[k].textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) log.info('Boton encontrado por texto: "' + porTexto + '"');
        }

        await this.esperar(1500);
        await this.cap('entrega_modal_abierto');

        log.info('Respuesta: "' + entrega + '"');
        await this.escribirEn(entrega, 70,
            '#entregaDesc',
            '#respuesta',
            '#descripcion',
            'textarea[name="entrega"]',
            'textarea[name="respuesta"]',
            'textarea[name="descripcion"]',
            'textarea'
        );

        await this.esperar(500);
        await this.cap('entrega_respuesta_escrita');

        log.info('Guardando entrega...');
        await this.clickPrimero(
            '#btnSubmit',
            '.btn-submit',
            '#btnEnviarEntrega',
            '.modal.show button[type="submit"]',
            'button[type="submit"]'
        );

        await this.esperar(2500, 'Guardando entrega...');
        await this.cerrarModal(3);
        await this.esperar(1000);
        await this.cap('entrega_guardada');
        log.ok('Tarea entregada: "' + entrega + '"');
        this.reg('entregar_tarea', { respuesta: entrega });
    }

    // ── 10. CALIFICAR TAREA ──────────────────────────────
    async calificarTarea() {
        var nota       = this.D.calificacion.nota;
        var comentario = this.D.calificacion.comentario;
        log.fase('CALIFICAR TAREA - Nota: ' + nota);

        var rutas = ['calificaciones.html', 'calificar.html', 'notas.html', 'misestudiantes.html'];
        var pagOk = false;
        for (var i = 0; i < rutas.length; i++) {
            try {
                await this.page.goto(this.baseUrl + '/' + rutas[i], { waitUntil: 'networkidle2', timeout: 8000 });
                await this.esperar(2000);
                var url = this.page.url();
                if (!url.includes('sesion') && !url.includes('login')) {
                    log.info('Pagina calificaciones: ' + rutas[i]);
                    pagOk = true;
                    break;
                }
            } catch (_) {}
        }

        if (!pagOk) {
            await this.navegarSeguro('materias.html', 'Materias Profesor');
            await this.esperar(2000);
        }

        await this.cap('calificacion_pagina');

        var notaSels = ['.nota-input', 'input[name="nota"]', '#nota', 'input[type="number"]', '.calificacion-input'];
        var notaEl = null;
        for (var j = 0; j < notaSels.length; j++) {
            var el = await this.page.$(notaSels[j]);
            if (el) { notaEl = notaSels[j]; break; }
        }

        if (notaEl) {
            log.info('Campo nota encontrado: ' + notaEl);
            await this.page.click(notaEl, { clickCount: 3 });
            await this.esperar(200);
            await this.page.type(notaEl, nota, { delay: 80 });
            await this.esperar(400);

            log.info('Comentario: "' + comentario + '"');
            await this.escribirEn(comentario, 60,
                '.obs-input',
                'textarea[name="observacion"]',
                '#observacion',
                '#comentario',
                'textarea[name="comentario"]'
            );

            await this.esperar(500);
            await this.cap('calificacion_llena');

            log.info('Guardando nota...');
            await this.clickPrimero('.btn-save', '#btnGuardar', '#btnSave', '.btn-calificar', 'button[type="submit"]');
            await this.esperar(2500, 'Guardando nota...');
            await this.cerrarModal(3);
            await this.cap('calificacion_guardada');
            log.ok('Nota ' + nota + ' guardada');
            this.reg('calificar_tarea', { nota: nota, comentario: comentario });
        } else {
            log.warn('Campo de nota no encontrado - puede requerir ajuste de selectores');
            await this.cap('calificacion_sin_campo');
            this.reg('calificar_tarea', { nota: nota, estado: 'campo_no_encontrado' });
        }
    }

    // ── 11. VER CALIFICACIONES (estudiante) ──────────────
    async verCalificacionesEstudiante() {
        log.paso('Viendo Mis Calificaciones...');
        var rutas = ['nota.html', 'notas.html', 'mis-notas.html', 'calificaciones.html'];
        for (var i = 0; i < rutas.length; i++) {
            try {
                await this.page.goto(this.baseUrl + '/' + rutas[i], { waitUntil: 'networkidle2', timeout: 8000 });
                await this.esperar(2000);
                var url = this.page.url();
                if (!url.includes('sesion')) { log.info('Mis notas en: ' + rutas[i]); break; }
            } catch (_) {}
        }
        await this.cap('estudiante_mis_notas');
        log.ok('Calificaciones cargadas');
        this.reg('ver_calificaciones', { rol: 'estudiante' });
    }

    // ── 12. PANELES ADMIN ────────────────────────────────
    async verPanelesAdmin() {
        log.fase('PANELES DE ADMINISTRADOR');
        var paneles = [
            { url: 'admin.html',        nombre: 'Dashboard Principal' },
            { url: 'usuarios.html',     nombre: 'Gestion de Usuarios' },
            { url: 'reportes.html',     nombre: 'Reportes' },
            { url: 'configuracion.html',nombre: 'Configuracion' },
            { url: 'seguridad.html',    nombre: 'Seguridad' }
        ];

        for (var i = 0; i < paneles.length; i++) {
            var panel = paneles[i];
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(this.baseUrl + '/' + panel.url, { waitUntil: 'networkidle2', timeout: 12000 });
                await this.esperar(3000, 'Revisando ' + panel.nombre + '...');
                var url = this.page.url();
                if (url.includes('sesion') || url.includes('login')) {
                    log.warn(panel.nombre + ': requiere autenticacion');
                } else {
                    var nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap('admin_' + nomC);
                    log.ok('Panel "' + panel.nombre + '" revisado');
                }
            } catch (e) {
                log.warn('Panel "' + panel.nombre + '" no disponible: ' + e.message);
            }
        }
        this.reg('ver_paneles_admin');
    }

    // ── 13. PANELES DEL PROFESOR (TODOS) ─────────────────
    // MODIFICACIÓN 3: Nuevos paneles del profesor
    async verPanelesProfesor() {
        log.fase('PANELES DEL PROFESOR - Explorando todas las secciones');

        var panelesProfesor = [
            { url: 'profesor.html',       nombre: 'Dashboard Principal' },
            { url: 'agenda.html',         nombre: 'Mi Agenda' },
            { url: 'materias.html',       nombre: 'Mis Materias' },
            { url: 'misestudiantes.html', nombre: 'Mis Estudiantes' },
            { url: 'calificaciones.html', nombre: 'Calificaciones' },
            { url: 'ingresos.html',       nombre: 'Ingresos' },
            { url: 'configuracion2.html', nombre: 'Configuracion' },
            { url: 'perfil.html',         nombre: 'Mi Perfil' }
        ];

        for (var i = 0; i < panelesProfesor.length; i++) {
            var panel = panelesProfesor[i];
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(this.baseUrl + '/' + panel.url, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(2000, 'Cargando ' + panel.nombre + '...');

                var url = this.page.url();
                if (url.includes('sesion') || url.includes('login')) {
                    log.warn(panel.nombre + ': requiere autenticacion');
                } else {
                    var nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap('profesor_' + nomC);
                    log.ok('Panel "' + panel.nombre + '" revisado');
                }
            } catch (e) {
                log.warn('Panel "' + panel.nombre + '" no disponible: ' + e.message);
            }
            await this.esperar(800, 'Siguiente panel...');
        }
        this.reg('ver_paneles_profesor');
    }

    // ── 14. PANELES DEL ESTUDIANTE ────────────────────────
    // MODIFICACIÓN 4: Nuevos paneles del estudiante
    async verPanelesEstudiante() {
        log.fase('PANELES DEL ESTUDIANTE - Explorando todas las secciones');

        var panelesEstudiante = [
            { url: 'estudiante.html', nombre: 'Dashboard Principal' },
            { url: 'misclases.html',  nombre: 'Mis Clases' },
            { url: 'tareas.html',     nombre: 'Mis Tareas' },
            { url: 'nota.html',       nombre: 'Mis Calificaciones' },
            { url: 'perfil.html',     nombre: 'Mi Perfil' }
        ];

        for (var i = 0; i < panelesEstudiante.length; i++) {
            var panel = panelesEstudiante[i];
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(this.baseUrl + '/' + panel.url, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(2000, 'Cargando ' + panel.nombre + '...');

                var url = this.page.url();
                if (!url.includes('sesion') && !url.includes('login')) {
                    var nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap('estudiante_' + nomC);
                    log.ok('Panel "' + panel.nombre + '" revisado');
                }
            } catch (e) {
                log.warn('Panel "' + panel.nombre + '" no disponible: ' + e.message);
            }
            await this.esperar(800);
        }
        this.reg('ver_paneles_estudiante');
    }

    // ======================================================
    //  REPORTE HTML
    // ======================================================
    generarReporte() {
        var exitosas = this.results.acciones.filter(function(a) { return a.ok; });
        var capturas = this.results.capturas;

        var filas = exitosas.map(function(a) {
            return '<tr><td>OK</td><td><strong>' + a.accion + '</strong></td><td>' +
                (a.tipo || a.rol || a.metodo || '-') + '</td><td>' +
                (a.nombre || a.nota || a.texto || a.respuesta || '-') + '</td></tr>';
        }).join('');

        var galeria = capturas.map(function(c) {
            return '<div class="thumb"><img src="' + c + '" alt="' + path.basename(c) + '" loading="lazy"/><span>' + path.basename(c) + '</span></div>';
        }).join('');

        var html = '<!DOCTYPE html>\n<html lang="es">\n<head>\n' +
            '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
            '<title>Reporte QA EduAgenda</title>\n' +
            '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@400;600;800&display=swap" rel="stylesheet">\n' +
            '<style>\n' +
            ':root{--bg:#060a12;--s1:#0d1322;--borde:#1a2540;--acento:#00d4ff;--verde:#00e5a0;--amarillo:#ffd700;--text:#dde4f0;--muted:#4a5568;--font:"Sora",sans-serif;--mono:"IBM Plex Mono",monospace;}\n' +
            '*{margin:0;padding:0;box-sizing:border-box}\n' +
            'body{background:var(--bg);color:var(--text);font-family:var(--font);padding:40px 20px}\n' +
            '.wrap{max-width:1100px;margin:0 auto}\n' +
            '.hero{text-align:center;padding:70px 20px 50px;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,212,255,.08),transparent);border:1px solid var(--borde);border-radius:20px;margin-bottom:24px}\n' +
            '.hero h1{font-size:clamp(2rem,5vw,3rem);font-weight:800;margin-bottom:12px}\n' +
            '.hero h1 em{color:var(--acento);font-style:normal}\n' +
            '.hero p{color:var(--muted);font-family:var(--mono);font-size:.9rem}\n' +
            '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}\n' +
            '.stat{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:20px;text-align:center}\n' +
            '.stat .n{font-size:2.6rem;font-weight:800;color:var(--acento);font-family:var(--mono)}\n' +
            '.stat .l{color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.07em;margin-top:6px}\n' +
            '.bloque{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:26px;margin-bottom:20px;overflow:auto}\n' +
            '.bloque-titulo{font-family:var(--mono);font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}\n' +
            'table{width:100%;border-collapse:collapse;min-width:460px}\n' +
            'th{text-align:left;font-family:var(--mono);font-size:.7rem;color:var(--muted);text-transform:uppercase;padding:8px 12px;border-bottom:1px solid var(--borde)}\n' +
            'td{padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.5);font-size:.87rem}\n' +
            'tr:last-child td{border:none}\n' +
            'tr:hover td{background:rgba(0,212,255,.03)}\n' +
            '.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:4px}\n' +
            '.thumb{background:var(--bg);border:1px solid var(--borde);border-radius:10px;overflow:hidden}\n' +
            '.thumb img{width:100%;height:95px;object-fit:cover;opacity:.75}\n' +
            '.thumb span{display:block;font-family:var(--mono);font-size:.65rem;color:var(--muted);padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n' +
            '.pie{text-align:center;padding:40px;color:var(--muted);font-family:var(--mono);font-size:.8rem}\n' +
            '.pie strong{color:var(--acento)}\n' +
            '</style>\n</head>\n<body>\n<div class="wrap">\n' +
            '<div class="hero"><h1>Reporte <em>EduAgenda</em></h1><p>' + new Date().toLocaleString('es-CO') + '</p></div>\n' +
            '<div class="stats">' +
            '<div class="stat"><div class="n">' + exitosas.length + '</div><div class="l">Acciones OK</div></div>' +
            '<div class="stat"><div class="n">' + capturas.length + '</div><div class="l">Capturas</div></div>' +
            '<div class="stat"><div class="n">9</div><div class="l">Fases</div></div>' +
            '<div class="stat"><div class="n">3</div><div class="l">Roles</div></div>' +
            '</div>\n' +
            '<div class="bloque"><div class="bloque-titulo">Acciones realizadas</div>' +
            '<table><thead><tr><th></th><th>Accion</th><th>Rol/Metodo</th><th>Detalle</th></tr></thead>' +
            '<tbody>' + (filas || '<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:20px">Sin acciones</td></tr>') + '</tbody></table></div>\n' +
            '<div class="bloque"><div class="bloque-titulo">Capturas (' + capturas.length + ')</div>' +
            '<div class="gallery">' + (galeria || '<p style="color:var(--muted)">Sin capturas</p>') + '</div></div>\n' +
            '<div class="pie"><p>Generado por <strong>EduAgenda QA Robot</strong></p></div>\n' +
            '</div></body></html>';

        var ruta = path.join(__dirname, 'reporte-qa.html');
        fs.writeFileSync(ruta, html, 'utf8');
        log.ok('Reporte generado -> ' + ruta);
    }

    // ======================================================
    //  FLUJO COMPLETO — MODIFICACIÓN 5: flujo actualizado
    // ======================================================
    async ejecutar() {
        log.titulo('ROBOT DE QA - EDUAGENDA - FLUJO COMPLETO');

        try {
            await this.iniciarServidor();
            await this.iniciarNavegador();

            // 0. INICIO
            log.fase('INICIO - Pagina principal');
            await this.irInicio();

            // 1. REGISTRO PROFESOR
            log.fase('FASE 1 - Registro de Profesor');
            await this.registrarUsuario(this.D.profesor);

            // 2. REGISTRO ESTUDIANTE
            log.fase('FASE 2 - Registro de Estudiante');
            await this.irInicio();
            await this.esperar(1000);
            await this.registrarUsuario(this.D.estudiante);

            // 3. PROFESOR -> HORARIO + PANELES PROFESOR
            log.fase('FASE 3 - Profesor: Agregar Horario');
            await this.login(this.D.profesor);
            await this.agregarHorario();
            await this.verPanelesProfesor();  // ← NUEVO: explorar todos los paneles del profesor
            await this.logout('profesor');

            // 4. ESTUDIANTE -> RESERVAR NEQUI + PANELES ESTUDIANTE
            log.fase('FASE 4 - Estudiante: Reservar Clase con Nequi');
            await this.login(this.D.estudiante);
            await this.reservarClase();
            await this.verMaterias('estudiante');
            await this.verPanelesEstudiante();  // ← NUEVO: explorar todos los paneles del estudiante
            await this.logout('estudiante');

            // 5. PROFESOR -> TAREA
            log.fase('FASE 5 - Profesor: Asignar Tarea');
            await this.login(this.D.profesor);
            await this.verMaterias('profesor');
            await this.asignarTarea();
            await this.logout('profesor');

            // 6. ESTUDIANTE -> ENTREGAR TAREA
            log.fase('FASE 6 - Estudiante: Entregar Tarea');
            await this.login(this.D.estudiante);
            await this.verTareasPendientes();
            await this.entregarTarea();
            await this.logout('estudiante');

            // 7. PROFESOR -> CALIFICAR
            log.fase('FASE 7 - Profesor: Calificar Tarea');
            await this.login(this.D.profesor);
            await this.calificarTarea();
            await this.logout('profesor');

            // 8. ESTUDIANTE -> VER NOTA
            log.fase('FASE 8 - Estudiante: Ver Calificaciones');
            await this.login(this.D.estudiante);
            await this.verCalificacionesEstudiante();
            await this.logout('estudiante');

            // 9. ADMIN -> TODOS LOS PANELES
            log.fase('FASE 9 - Admin: Explorar Todos los Paneles');
            await this.login(this.D.admin);
            await this.verPanelesAdmin();
            await this.logout('admin');

            // FIN -> INICIO
            log.fase('FIN - Regresando a Pagina Principal');
            await this.irInicio();
            await this.esperar(2500, 'Mostrando inicio final...');
            await this.cap('fin_inicio');

            // RESUMEN
            log.titulo('RESUMEN FINAL');
            var ex = this.results.acciones.filter(function(a) { return a.ok; }).length;
            log.ok('Acciones completadas: ' + ex);
            log.ok('Capturas tomadas:     ' + this.results.capturas.length);
            log.ok('Errores registrados:  ' + this.results.errores.length);

            this.generarReporte();
            log.titulo('FLUJO COMPLETADO EXITOSAMENTE!');

        } catch (err) {
            log.error('Error critico: ' + err.message);
            console.error(err.stack);
            this.results.errores.push(err.message);
            try { await this.cap('ERROR_critico'); } catch (_) {}
            this.generarReporte();
        }
    }

    async cerrar() {
        try { if (this.browser) await this.browser.close(); } catch (_) {}
        try { if (this.serverProcess) this.serverProcess.kill(); } catch (_) {}
        log.ok('Robot detenido');
    }
}

// ======================================================
//  ENTRY POINT
// ======================================================
var robot = new EduAgendaRobot();

process.on('SIGINT', async function() {
    log.warn('Interrumpido - cerrando...');
    await robot.cerrar();
    process.exit(0);
});

robot.ejecutar().finally(function() { return robot.cerrar(); });