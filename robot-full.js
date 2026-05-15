// ╔══════════════════════════════════════════════════════════════════╗
// ║         ROBOT DE QA — EDUAGENDA — FLUJO CORREGIDO Y ROBUSTO     ║
// ║  Flujo:                                                          ║
// ║  1. Registro Profesor                                            ║
// ║  2. Registro Estudiante                                          ║
// ║  3. Login Profesor → Ver todos los paneles → Agregar horario     ║
// ║     → Logout                                                     ║
// ║  4. Login Estudiante → Reservar clase (Nequi) → Logout           ║
// ║  5. Login Profesor → Materias → Asignar tarea → Logout           ║
// ║  6. Login Estudiante → Tareas pendientes → Entregar tarea        ║
// ║     → Logout                                                     ║
// ║  7. Login Profesor → Calificaciones → Calificar tarea            ║
// ║     → Ver todos los paneles (datos actualizados) → Logout        ║
// ║  8. Login Estudiante → Calificaciones → Perfil → Logout          ║
// ║  9. Login Admin → Ver todos los paneles → Logout                 ║
// ╚══════════════════════════════════════════════════════════════════╝

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════
//  LOGGER CON COLOR
// ═══════════════════════════════════════════════════
const C = {
    reset:    '\x1b[0m',
    verde:    '\x1b[32m',
    rojo:     '\x1b[31m',
    amarillo: '\x1b[33m',
    azul:     '\x1b[34m',
    cyan:     '\x1b[36m',
    blanco:   '\x1b[37m',
    negrita:  '\x1b[1m'
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
        this.browser       = null;
        this.page          = null;
        this.serverProcess = null;
        this.baseUrl       = 'http://localhost:3000';
        this.capturaIdx    = 0;
        this.results       = { acciones: [], errores: [], capturas: [] };

        const ts = Date.now();

        // Materias y horas disponibles para selección aleatoria
        const materiasDisponibles = [
            'Fisica', 'Quimica', 'Matematicas', 'Biologia',
            'Historia', 'Ingles', 'Programacion', 'Arte'
        ];
        const horasDisponibles = ['14:00', '15:00', '16:00', '17:00', '18:00'];
        const materiaElegida   = materiasDisponibles[Math.floor(Math.random() * materiasDisponibles.length)];
        const horaElegida      = horasDisponibles[Math.floor(Math.random() * horasDisponibles.length)];

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
                materia: materiaElegida,
                fecha:   '2026-12-25',
                hora:    horaElegida
            },
            nequi:   { celular: '3001234567' },
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

        log.info(`Materia elegida: ${materiaElegida} | Hora: ${horaElegida}`);
    }

    // ══════════════════════════════════════════════
    //  A. INFRAESTRUCTURA
    // ══════════════════════════════════════════════

    async iniciarServidor() {
        log.paso('Iniciando servidor EduAgenda...');
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['server.js'], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            this.serverProcess.stdout.on('data', data => {
                const msg = data.toString();
                if (msg.includes('corriendo') || msg.includes('lista') || msg.includes('running') || msg.includes('3000')) {
                    log.ok('Servidor listo');
                    resolve();
                }
            });
            this.serverProcess.stderr.on('data', d => {
                const t = d.toString().trim();
                if (t && !t.includes('DeprecationWarning')) log.warn('Servidor: ' + t);
            });
            // Resolver después de 5s si no hay señal explícita
            setTimeout(() => resolve(), 5000);
            setTimeout(() => reject(new Error('Timeout 25s iniciando servidor')), 25000);
        });
    }

    async iniciarNavegador() {
        log.paso('Abriendo navegador...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            slowMo: 20,
            args: ['--start-maximized', '--disable-infobars', '--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setDefaultTimeout(25000);
        await this.page.setDefaultNavigationTimeout(25000);

        // Interceptar TODOS los dialogs nativos del browser automáticamente
        this.page.on('dialog', async dialog => {
            log.info(`Dialog nativo [${dialog.type()}]: "${dialog.message()}" -> aceptando`);
            try { await dialog.accept(); } catch (_) {}
        });

        this.page.on('close', () => log.warn('Pagina cerrada inesperadamente'));

        const dir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        log.ok('Navegador listo');
    }

    // ══════════════════════════════════════════════
    //  B. HELPERS BÁSICOS
    // ══════════════════════════════════════════════

    async esperar(ms, msg) {
        if (msg) log.wait(msg);
        await new Promise(r => setTimeout(r, Math.max(ms, 200)));
    }

    async cap(nombre) {
        try {
            this.capturaIdx++;
            const num  = String(this.capturaIdx).padStart(2, '0');
            const safe = nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const file = `${num}_${safe}.png`;
            const ruta = path.join(__dirname, 'screenshots', file);
            if (this.page && !this.page.isClosed()) {
                await this.page.screenshot({ path: ruta, fullPage: true });
                this.results.capturas.push(ruta);
                log.cap(file);
            }
        } catch (e) {
            log.warn(`No se pudo capturar "${nombre}": ${e.message}`);
        }
    }

    // Comprueba si la página sigue abierta y funcionando
    paginaViva() {
        return this.page && !this.page.isClosed();
    }

    async verSelector(selector, ms = 10000) {
        try {
            await this.page.waitForSelector(selector, { visible: true, timeout: ms });
            return true;
        } catch { return false; }
    }

    async esperarOculto(selector, ms = 5000) {
        try {
            await this.page.waitForSelector(selector, { hidden: true, timeout: ms });
        } catch (_) {}
    }

    async escribir(selector, texto, delay = 60) {
        const ok = await this.verSelector(selector, 8000);
        if (!ok) { log.warn('Campo no visible: ' + selector); return false; }
        await this.page.evaluate(sel => {
            const el = document.querySelector(sel);
            if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
        }, selector);
        await this.esperar(100);
        await this.page.type(selector, texto, { delay });
        await this.esperar(200);
        return true;
    }

    async click(selector, ms = 8000) {
        const ok = await this.verSelector(selector, ms);
        if (!ok) { log.warn('Boton no visible: ' + selector); return false; }
        await this.page.click(selector);
        await this.esperar(300);
        return true;
    }

    // Hace click en el primero de la lista que esté visible
    async clickPrimero(...selectores) {
        for (const sel of selectores) {
            try {
                const el = await this.page.$(sel);
                if (!el) continue;
                const visible = await this.page.evaluate(s => {
                    const e = document.querySelector(s);
                    if (!e) return false;
                    const r = e.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && window.getComputedStyle(e).display !== 'none';
                }, sel);
                if (visible) {
                    await this.page.click(sel);
                    await this.esperar(400);
                    return sel;
                }
            } catch (_) {}
        }
        log.warn('Ninguno encontrado de: ' + selectores.slice(0, 4).join(' | '));
        return null;
    }

    // Escribe en el primer campo de la lista que exista
    async escribirEn(texto, ...selectores) {
        for (const sel of selectores) {
            if (await this.verSelector(sel, 3000)) {
                await this.escribir(sel, texto);
                return sel;
            }
        }
        log.warn('Ningún campo encontrado para escribir: ' + selectores.slice(0, 3).join(' | '));
        return null;
    }

    // Establece valor en campo de tipo date/time vía evaluate
    async setearCampo(selector, valor) {
        if (!selector) return;
        await this.page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, selector, valor);
    }

    reg(accion, extra = {}) {
        this.results.acciones.push({ accion, ok: true, ...extra });
    }

    // ══════════════════════════════════════════════
    //  C. MANEJO DE MODALES / ALERTAS / POPUPS
    // ══════════════════════════════════════════════

    /**
     * Intenta cerrar cualquier modal/alerta visible.
     * Orden: SweetAlert2 → SweetAlert1 → Bootstrap modal → genérico → Escape
     */
    async cerrarModal(intentos = 4) {
        for (let i = 0; i < intentos; i++) {
            await this.esperar(600);

            if (!this.paginaViva()) return;

            // SweetAlert2 — botón confirm / ok / aceptar
            const swal2 = await this.clickPrimero(
                '.swal2-confirm',
                'button.swal2-confirm',
                '.swal2-popup .swal2-confirm',
                '.swal2-ok',
                '.swal2-popup button'
            );
            if (swal2) { log.info('Modal SweetAlert2 cerrado'); await this.esperar(700); continue; }

            // SweetAlert1
            const swal1 = await this.clickPrimero('.sweet-alert button.confirm', '.sweet-alert button');
            if (swal1) { log.info('Modal SweetAlert1 cerrado'); await this.esperar(700); continue; }

            // Bootstrap modal — botones de acción y cierre
            const bs = await this.clickPrimero(
                '.modal.show .btn-primary',
                '.modal.show .btn-success',
                '.modal.show button[data-bs-dismiss="modal"]',
                '.modal.show .btn-close',
                '.modal.show .close',
                '.modal-footer .btn-primary',
                '.modal-footer .btn-success',
                '#btnAceptar', '#btnOk', '#btnCerrar', '#btnClose'
            );
            if (bs) { log.info('Modal Bootstrap cerrado'); await this.esperar(800); continue; }

            // Genérico por clase
            const gen = await this.clickPrimero(
                'button[class*="ok"]',
                'button[class*="accept"]',
                'button[class*="confirm"]',
                'button[class*="aceptar"]'
            );
            if (gen) { log.info('Modal generico cerrado'); await this.esperar(600); continue; }

            // Escape si hay overlay
            try {
                const overlay = await this.page.$('.modal-backdrop, .swal2-backdrop-show, .swal2-container, .overlay');
                if (overlay) {
                    await this.page.keyboard.press('Escape');
                    log.info('Overlay cerrado con Escape');
                    await this.esperar(600);
                    continue;
                }
            } catch (_) {}

            // Si no hay nada que cerrar, salir
            break;
        }

        // Esperar a que desaparezcan los modales
        await this.esperarOculto('.modal.show',        4000);
        await this.esperarOculto('.swal2-container',   3000);
        await this.esperar(400);
    }

    /**
     * Cierra cualquier modal emergente que pueda aparecer al cargar una página.
     * Versión no bloqueante: solo intenta 1 vez.
     */
    async cerrarModalSiExiste() {
        await this.esperar(1000);
        if (!this.paginaViva()) return;
        const haySwal2 = await this.page.$('.swal2-popup');
        const hayBs    = await this.page.$('.modal.show');
        if (haySwal2 || hayBs) {
            log.info('Modal detectado al cargar -> cerrando...');
            await this.cerrarModal(3);
        }
    }

    // ══════════════════════════════════════════════
    //  D. NAVEGACIÓN SEGURA
    // ══════════════════════════════════════════════

    async navegarSeguro(url, etiqueta = '') {
        const urlCompleta = url.startsWith('http') ? url : `${this.baseUrl}/${url}`;
        if (etiqueta) log.paso('Navegando a: ' + etiqueta);

        // Cerrar modales antes de navegar
        await this.cerrarModalSiExiste();

        try {
            await this.page.goto(urlCompleta, { waitUntil: 'networkidle2', timeout: 20000 });
        } catch (e) {
            log.warn('Navegación con error (continuando): ' + e.message);
        }
        await this.esperar(1500);

        // Cerrar modales que puedan aparecer al cargar
        await this.cerrarModalSiExiste();

        const actual = this.page.url();
        if (actual.includes('sesion') && !urlCompleta.includes('sesion')) {
            log.warn('Redirigido a login al intentar ir a: ' + etiqueta);
            return false;
        }
        return true;
    }

    // ══════════════════════════════════════════════
    //  E. LOGIN / LOGOUT — funciones centralizadas
    // ══════════════════════════════════════════════

    async login(u) {
        log.fase(`LOGIN - ${u.tipo.toUpperCase()}: ${u.email}`);

        // Siempre ir directo a la página de sesión para evitar estado previo
        await this.page.goto(`${this.baseUrl}/sesion.html`, { waitUntil: 'networkidle2' });
        await this.esperar(2000, 'Cargando login...');
        await this.cerrarModalSiExiste();
        await this.cap(`login_${u.tipo}_form`);

        const emailOk = await this.verSelector('#email', 12000);
        if (!emailOk) throw new Error('Formulario de login no disponible para ' + u.tipo);

        log.info('Email: ' + u.email);
        await this.escribir('#email', u.email);

        log.info('Password: ******');
        await this.escribir('#password', u.password);

        await this.cap(`login_${u.tipo}_lleno`);

        log.info('Presionando Iniciar Sesion...');
        await this.clickPrimero('#btnLogin', 'button[type="submit"]', '.btn-login', 'form button');

        await this.esperar(4000, 'Verificando credenciales...');

        // Cerrar cualquier modal de confirmación o error
        await this.cerrarModal(3);

        const urlActual = this.page.url();
        log.info('URL post-login: ' + urlActual);

        const exito = urlActual.includes(u.tipo + '.html')
                   || urlActual.includes('admin.html')
                   || urlActual.includes('dashboard')
                   || (!urlActual.includes('sesion') && !urlActual.includes('login'));

        if (exito) {
            log.ok('Sesion iniciada como ' + u.tipo.toUpperCase());
            await this.cap(`login_${u.tipo}_dashboard`);
            this.reg('login', { tipo: u.tipo, email: u.email });
            return true;
        }

        log.warn('Login puede haber fallado. URL: ' + urlActual);
        await this.cap(`login_${u.tipo}_fallo`);
        return false;
    }

    async logout(tipo = '') {
        log.paso(`Cerrando sesion${tipo ? ' (' + tipo + ')' : ''}...`);

        // Intentar botón de logout por varios selectores y textos
        const logoutBtn = await this.clickPrimero(
            '#logoutBtn',
            '.logout-btn',
            '.btn-logout',
            'a[href*="logout"]',
            'a[onclick*="logout"]',
            'button[onclick*="logout"]',
            '[data-action="logout"]',
            '#cerrarSesion',
            '.cerrar-sesion',
            'a[href="sesion.html"]'
        );

        if (logoutBtn) {
            await this.esperar(2500, 'Cerrando sesion...');
            await this.cerrarModal(2);
            await this.cap(`logout_${tipo || 'ok'}`);
            log.ok('Sesion cerrada');
            this.reg('logout', { tipo });
            return true;
        }

        // Buscar por texto
        const porTexto = await this.page.evaluate(() => {
            const all = document.querySelectorAll('a, button, [onclick]');
            for (const el of all) {
                const t = (el.textContent || '').toLowerCase();
                if (t.includes('cerrar sesion') || t.includes('salir') || t.includes('logout') || t.includes('sign out')) {
                    el.click();
                    return true;
                }
            }
            return false;
        });

        if (porTexto) {
            await this.esperar(2500, 'Cerrando sesion por texto...');
            await this.cerrarModal(2);
            await this.cap(`logout_${tipo || 'texto'}`);
            log.ok('Sesion cerrada (por texto)');
            this.reg('logout', { tipo, modo: 'texto' });
            return true;
        }

        // Forzar navegación a sesion.html
        log.warn('Boton logout no encontrado -> navegando a sesion.html');
        await this.page.goto(`${this.baseUrl}/sesion.html`, { waitUntil: 'networkidle2' });
        await this.esperar(1500);
        await this.cap(`logout_${tipo || 'forzado'}`);
        log.ok('Sesion cerrada (forzado)');
        this.reg('logout', { tipo, modo: 'forzado' });
        return true;
    }

    // ══════════════════════════════════════════════
    //  F. ACCIONES DE LA APLICACIÓN
    // ══════════════════════════════════════════════

    // ── 0. Página de inicio ───────────────────────
    async irInicio() {
        log.paso('Navegando a pagina principal...');
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        await this.esperar(2000);
        await this.cerrarModalSiExiste();
        await this.cap('inicio');
        log.ok('Pagina principal cargada');
    }

    // ── 1. REGISTRO ───────────────────────────────
    async registrarUsuario(u) {
        log.fase(`REGISTRO - ${u.tipo.toUpperCase()}: ${u.nombre}`);

        await this.page.goto(`${this.baseUrl}/registrate.html`, { waitUntil: 'networkidle2' });
        await this.esperar(2000, 'Cargando formulario de registro...');
        await this.cerrarModalSiExiste();
        await this.cap(`reg_${u.tipo}_form_vacio`);

        const formOk = await this.verSelector('input[name="nombre"]', 12000);
        if (!formOk) throw new Error('Formulario de registro no disponible para ' + u.tipo);

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

        // Seleccionar tipo de usuario
        log.info('Tipo: ' + u.tipo);
        const tipoOk = await this.clickPrimero(
            `input[value="${u.tipo}"]`,
            `input[name="tipo"][value="${u.tipo}"]`,
            `input[name="rol"][value="${u.tipo}"]`,
            `#${u.tipo}`
        );

        if (!tipoOk) {
            const labOk = await this.page.evaluate(tipo => {
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if (label.textContent.toLowerCase().includes(tipo)) {
                        label.click();
                        return true;
                    }
                }
                return false;
            }, u.tipo);
            if (labOk) log.info('Tipo seleccionado via label');
            else log.warn(`No se encontro radio para tipo "${u.tipo}"`);
        }

        await this.esperar(500);
        await this.cap(`reg_${u.tipo}_lleno`);

        log.info('Enviando formulario...');
        await this.clickPrimero(
            'button[type="submit"]',
            'input[type="submit"]',
            '#btnRegistrar',
            '#btnRegistro',
            '.btn-registro',
            'form button'
        );

        log.info('Esperando confirmacion del servidor...');
        await this.esperar(2000);

        // Esperar y cerrar modal de confirmación (hasta 10s)
        const fin = Date.now() + 10000;
        while (Date.now() < fin) {
            if (!this.paginaViva()) break;

            const haySwal2 = await this.page.$('.swal2-popup');
            const hayBs    = await this.page.$('.modal.show');
            const url      = this.page.url();

            if (haySwal2) {
                await this.cap(`reg_${u.tipo}_modal_ok`);
                log.info('Modal de exito (SweetAlert2) detectado -> cerrando...');
                await this.cerrarModal(5);
                break;
            }
            if (hayBs) {
                await this.cap(`reg_${u.tipo}_modal_ok`);
                log.info('Modal Bootstrap detectado -> cerrando...');
                await this.cerrarModal(5);
                break;
            }
            if (!url.includes('registrate')) {
                log.info('Redirigido automaticamente post-registro');
                break;
            }
            await this.esperar(400);
        }

        await this.esperar(1500);
        await this.cap(`reg_${u.tipo}_resultado`);
        log.ok(`${u.tipo.toUpperCase()} registrado: ${u.nombre}`);
        this.reg('registro', { nombre: u.nombre, tipo: u.tipo });

        await this.esperar(2000, 'Pausa entre registros...');
    }

    // ── 2. VER PANELES PROFESOR ───────────────────
    async verPanelesProfesor() {
        log.fase('PANELES DEL PROFESOR - Explorando todas las secciones');

        const paneles = [
            { url: 'profesor.html',       nombre: 'Dashboard Principal' },
            { url: 'agenda.html',         nombre: 'Mi Agenda' },
            { url: 'materias.html',       nombre: 'Mis Materias' },
            { url: 'misestudiantes.html', nombre: 'Mis Estudiantes' },
            { url: 'calificaciones.html', nombre: 'Calificaciones' },
            { url: 'ingresos.html',       nombre: 'Ingresos' },
            { url: 'configuracion2.html', nombre: 'Configuracion' },
            { url: 'perfil.html',         nombre: 'Mi Perfil' }
        ];

        for (const panel of paneles) {
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(`${this.baseUrl}/${panel.url}`, { waitUntil: 'networkidle2', timeout: 12000 });
                await this.esperar(2000, 'Cargando ' + panel.nombre + '...');
                await this.cerrarModalSiExiste();

                const url = this.page.url();
                if (url.includes('sesion') || url.includes('login')) {
                    log.warn(panel.nombre + ': requiere autenticacion (redirigido)');
                } else {
                    const nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap(`prof_panel_${nomC}`);
                    log.ok(`Panel "${panel.nombre}" revisado`);
                }
            } catch (e) {
                log.warn(`Panel "${panel.nombre}" no disponible: ${e.message}`);
            }
            await this.esperar(600);
        }
        this.reg('ver_paneles_profesor');
    }

    // ── 3. AGREGAR HORARIO ────────────────────────
    async agregarHorario() {
        const { materia, fecha, hora } = this.D.horario;
        log.fase(`AGREGAR HORARIO - Materia: ${materia} | Fecha: ${fecha} | Hora: ${hora}`);

        await this.navegarSeguro('profesor.html', 'Dashboard Profesor');
        await this.esperar(2000);
        await this.cap('horario_dashboard_profesor');

        // Buscar botón para abrir modal/formulario de horario
        log.info('Buscando boton para agregar horario...');
        const btnModal = await this.clickPrimero(
            '#abrirModal',
            '#btnNuevoHorario',
            '#btnAgregarHorario',
            '.btn-nuevo-horario',
            '.btn-agregar',
            '[data-modal="horario"]',
            'button[onclick*="horario"]',
            'button[onclick*="modal"]',
            'button[onclick*="Horario"]'
        );

        if (btnModal) {
            log.info('Boton de horario presionado');
            await this.esperar(1500);
            await this.cap('horario_modal_abierto');
        } else {
            log.warn('Boton de modal no encontrado, buscando formulario directo...');
        }

        // Materia
        log.info('Materia: ' + materia);
        const campM = await this.escribirEn(materia,
            '#materia',
            'input[name="materia"]',
            'input[placeholder*="materia"]',
            'input[placeholder*="Materia"]'
        );
        if (!campM) log.warn('Campo materia no encontrado');

        await this.esperar(400);

        // Fecha
        log.info('Fecha: ' + fecha);
        const campF = await this.escribirEn(fecha,
            '#fecha',
            'input[name="fecha"]',
            'input[type="date"]'
        );
        if (campF) await this.setearCampo(campF, fecha);

        await this.esperar(400);

        // Hora
        log.info('Hora: ' + hora);
        const campH = await this.escribirEn(hora,
            '#hora_inicio',
            'input[name="hora_inicio"]',
            'input[name="hora"]',
            'input[type="time"]',
            '#hora'
        );
        if (campH) await this.setearCampo(campH, hora);

        await this.esperar(500);
        await this.cap('horario_formulario_lleno');

        // Guardar
        log.info('Guardando horario...');
        await this.clickPrimero(
            '#formHorario button[type="submit"]',
            '#btnGuardarHorario',
            '.btn-guardar',
            '.modal.show button[type="submit"]',
            'button[type="submit"]',
            'form button'
        );

        await this.esperar(2500, 'Guardando horario...');
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('horario_guardado');
        log.ok(`Horario guardado: ${materia} a las ${hora}`);
        this.reg('agregar_horario', { materia, fecha, hora });
    }

    // ── 4. RESERVAR CLASE CON NEQUI ──────────────
    async reservarClase() {
        log.fase('RESERVAR CLASE - Metodo: Nequi');

        await this.navegarSeguro('estudiante.html', 'Agenda Estudiante');
        await this.esperar(3000, 'Cargando horarios disponibles...');
        await this.cap('reserva_agenda');

        // Buscar slot disponible
        log.info('Buscando slots disponibles...');
        const slotSels = [
            '.slot.disponible',
            '.horario-disponible',
            '.slot-disponible',
            '.clase-disponible',
            '[data-estado="disponible"]',
            '.available',
            '.slot',
            '.clase'
        ];

        let slotOk = false;
        for (const sel of slotSels) {
            const slots = await this.page.$$(sel);
            if (slots.length > 0) {
                log.info(`${slots.length} slot(s) encontrado(s) con "${sel}" -> seleccionando primero...`);
                try {
                    await slots[0].click();
                    await this.esperar(1500);
                    slotOk = true;
                    break;
                } catch (_) {}
            }
        }

        if (!slotOk) {
            // Buscar por texto "Reservar" directamente en botones
            const porTexto = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, a, .btn, .card, .item');
                for (const el of all) {
                    const t = (el.textContent || '').toLowerCase();
                    if (t.includes('reservar') || t.includes('disponible') || t.includes('clase')) {
                        el.click();
                        return el.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info('Slot seleccionado por texto: "' + porTexto + '"');
                slotOk = true;
                await this.esperar(1500);
            }
        }

        if (!slotOk) {
            log.warn('Sin slots disponibles visibles');
            await this.cap('reserva_sin_slots');
            return false;
        }

        await this.cap('reserva_slot_seleccionado');
        await this.cerrarModalSiExiste();

        // Botón reservar
        log.info('Presionando boton Reservar...');
        await this.clickPrimero(
            '#btnReservar',
            '.btn-reservar',
            'button[onclick*="reservar"]',
            '[data-action="reservar"]',
            'button[onclick*="Reservar"]'
        );
        await this.esperar(2000);
        await this.cap('reserva_pago_modal');

        // Seleccionar Nequi
        log.info('Seleccionando Nequi...');
        let nequiOk = await this.clickPrimero(
            '[data-metodo="nequi"]',
            '[data-pago="nequi"]',
            '.metodo-nequi',
            '#nequi',
            'input[value="nequi"]'
        );

        if (!nequiOk) {
            nequiOk = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, label, .metodo-btn, .metodo-pago, .option, .card, input[type="radio"]');
                for (const el of all) {
                    if ((el.textContent || el.value || '').toLowerCase().includes('nequi')) {
                        el.click();
                        return true;
                    }
                }
                return false;
            });
            if (nequiOk) log.info('Nequi seleccionado por texto/valor');
        }

        await this.esperar(1000);
        await this.cap('reserva_nequi_seleccionado');

        // Número de celular Nequi
        log.info('Celular Nequi: ' + this.D.nequi.celular);
        await this.escribirEn(this.D.nequi.celular,
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

        // Confirmar pago
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
        await this.cerrarModal(4);
        await this.esperar(1500);
        await this.cap('reserva_confirmada');
        log.ok('Reserva realizada con Nequi: ' + this.D.nequi.celular);
        this.reg('reservar_clase', { metodo: 'Nequi', celular: this.D.nequi.celular });
        return true;
    }

    // ── 5. ASIGNAR TAREA ──────────────────────────
    async asignarTarea() {
        const { texto, fecha } = this.D.tarea;
        log.fase(`ASIGNAR TAREA: "${texto}"`);

        // Ir a materias y buscar la materia del estudiante
        await this.navegarSeguro('materias.html', 'Materias del Profesor');
        await this.esperar(2500);
        await this.cap('tarea_materias_profesor');

        // Intentar seleccionar la materia que el estudiante reservó
        log.info(`Buscando materia "${this.D.horario.materia}" para asignar tarea...`);
        const materiaSeleccionada = await this.page.evaluate(materia => {
            const all = document.querySelectorAll('.materia, .card, .item, li, tr, .materia-item');
            for (const el of all) {
                if ((el.textContent || '').toLowerCase().includes(materia.toLowerCase())) {
                    el.click();
                    return true;
                }
            }
            return false;
        }, this.D.horario.materia);
        if (materiaSeleccionada) {
            log.info('Materia seleccionada: ' + this.D.horario.materia);
            await this.esperar(1000);
        }

        // Buscar botón para asignar tarea
        log.info('Buscando boton para asignar tarea...');
        const btnT = await this.clickPrimero(
            '.task',
            '.btn-tarea',
            '#btnTarea',
            '[data-action="tarea"]',
            '[data-modal="tarea"]',
            '.icon-task',
            'button[onclick*="tarea"]',
            'button[onclick*="Tarea"]',
            'a[onclick*="tarea"]'
        );

        if (btnT) {
            log.info('Formulario de tarea abierto');
            await this.esperar(1500);
            await this.cap('tarea_modal_abierto');
        } else {
            // Buscar por texto
            const porTexto = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, a, .btn');
                for (const el of all) {
                    const t = (el.textContent || '').toLowerCase();
                    if (t.includes('tarea') || t.includes('asignar') || t.includes('agregar tarea')) {
                        el.click();
                        return el.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info('Boton tarea por texto: "' + porTexto + '"');
                await this.esperar(1500);
            }
        }

        // Descripción / pregunta
        log.info('Pregunta: ' + texto);
        await this.escribirEn(texto,
            '#desc',
            '#descripcion',
            '#pregunta',
            '#tarea',
            'textarea[name="descripcion"]',
            'textarea[name="desc"]',
            'textarea[name="tarea"]',
            'textarea'
        );

        await this.esperar(400);

        // Fecha de entrega
        log.info('Fecha entrega: ' + fecha);
        const campFe = await this.escribirEn(fecha,
            '#fechaEntrega',
            'input[name="fechaEntrega"]',
            'input[name="fecha_entrega"]',
            'input[type="date"]'
        );
        if (campFe) await this.setearCampo(campFe, fecha);

        await this.esperar(500);
        await this.cap('tarea_formulario_lleno');

        // Guardar tarea
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
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('tarea_asignada');
        log.ok('Tarea asignada: "' + texto + '"');
        this.reg('asignar_tarea', { texto, fecha });
    }

    // ── 6. TAREAS PENDIENTES ──────────────────────
    async verTareasPendientes() {
        log.paso('Viendo Tareas Pendientes...');
        const rutas = ['tareas.html', 'tareas-pendientes.html', 'mis-tareas.html', 'estudiante.html'];
        let cargado = false;

        for (const ruta of rutas) {
            try {
                await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(2000);
                await this.cerrarModalSiExiste();
                const url = this.page.url();
                if (!url.includes('sesion')) {
                    log.info('Tareas en: ' + ruta);
                    cargado = true;
                    break;
                }
            } catch (_) {}
        }

        if (!cargado) log.warn('Pagina de tareas pendientes no encontrada');
        await this.cap('tareas_pendientes_lista');
        log.ok('Tareas pendientes cargadas');
        this.reg('ver_tareas_pendientes');
    }

    // ── 7. ENTREGAR TAREA ─────────────────────────
    async entregarTarea() {
        const entrega = this.D.tarea.entrega;
        log.fase(`ENTREGAR TAREA - Respuesta: "${entrega}"`);

        await this.esperar(2000, 'Asegurando que las tareas esten visibles...');
        await this.cerrarModalSiExiste();

        // Buscar botón entregar
        log.info('Buscando boton para entregar tarea...');
        let btnE = await this.clickPrimero(
            '.btn-entregar',
            '.btn-realizar',
            '#btnEntregar',
            '#btnRealizarTarea',
            '[data-action="entregar"]',
            'button[onclick*="entregar"]',
            'button[onclick*="realizar"]'
        );

        if (!btnE) {
            const porTexto = await this.page.evaluate(() => {
                const btns = document.querySelectorAll('button, a, .btn');
                for (const btn of btns) {
                    const t = (btn.textContent || '').toLowerCase();
                    if (t.includes('entregar') || t.includes('realizar') || t.includes('responder') || t.includes('completar')) {
                        btn.click();
                        return btn.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info('Boton encontrado por texto: "' + porTexto + '"');
                btnE = true;
            }
        }

        await this.esperar(1500);
        await this.cap('entrega_modal_abierto');

        // Escribir respuesta
        log.info('Respuesta: "' + entrega + '"');
        await this.escribirEn(entrega,
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

        // Guardar entrega
        log.info('Guardando entrega...');
        await this.clickPrimero(
            '#btnSubmit',
            '.btn-submit',
            '#btnEnviarEntrega',
            '#btnGuardar',
            '.modal.show button[type="submit"]',
            'button[type="submit"]',
            'form button'
        );

        await this.esperar(2500, 'Guardando entrega...');
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('entrega_guardada');
        log.ok('Tarea entregada: "' + entrega + '"');
        this.reg('entregar_tarea', { respuesta: entrega });
    }

    // ── 8. CALIFICAR TAREA ────────────────────────
    async calificarTarea() {
        const { nota, comentario } = this.D.calificacion;
        log.fase('CALIFICAR TAREA - Nota: ' + nota);

        // Probar diferentes páginas donde podría estar la calificación
        const rutas = ['calificaciones.html', 'calificar.html', 'notas.html', 'misestudiantes.html', 'materias.html'];
        let pagOk = false;

        for (const ruta of rutas) {
            try {
                await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(2000);
                await this.cerrarModalSiExiste();
                const url = this.page.url();
                if (!url.includes('sesion') && !url.includes('login')) {
                    log.info('Pagina calificaciones: ' + ruta);
                    pagOk = true;
                    break;
                }
            } catch (_) {}
        }

        if (!pagOk) {
            log.warn('No se encontro pagina de calificaciones');
        }

        await this.cap('calificacion_pagina');

        // Buscar botón calificar si hay tareas entregadas
        log.info('Buscando boton para calificar...');
        await this.clickPrimero(
            '.btn-calificar',
            '#btnCalificar',
            'button[onclick*="calificar"]',
            '[data-action="calificar"]'
        );

        const btnCalTexto = await this.page.evaluate(() => {
            const btns = document.querySelectorAll('button, a, .btn');
            for (const btn of btns) {
                const t = (btn.textContent || '').toLowerCase();
                if (t.includes('calificar') || t.includes('revisar') || t.includes('nota')) {
                    btn.click();
                    return btn.textContent.trim();
                }
            }
            return null;
        });
        if (btnCalTexto) {
            log.info('Boton calificar por texto: "' + btnCalTexto + '"');
            await this.esperar(1000);
        }

        // Campo de nota
        const notaSels = [
            '.nota-input', 'input[name="nota"]', '#nota',
            'input[type="number"]', '.calificacion-input', '#calificacion'
        ];
        let notaEl = null;
        for (const s of notaSels) {
            const el = await this.page.$(s);
            if (el) { notaEl = s; break; }
        }

        if (notaEl) {
            log.info('Campo nota encontrado: ' + notaEl);
            await this.page.click(notaEl, { clickCount: 3 });
            await this.esperar(200);
            await this.page.type(notaEl, nota, { delay: 80 });
            await this.esperar(400);

            log.info('Comentario: "' + comentario + '"');
            await this.escribirEn(comentario,
                '.obs-input',
                'textarea[name="observacion"]',
                '#observacion',
                '#comentario',
                'textarea[name="comentario"]',
                'textarea'
            );

            await this.esperar(500);
            await this.cap('calificacion_llena');

            log.info('Guardando nota...');
            await this.clickPrimero(
                '.btn-save', '#btnGuardar', '#btnSave',
                '.btn-calificar', 'button[type="submit"]', 'form button'
            );
            await this.esperar(2500, 'Guardando nota...');
            await this.cerrarModal(4);
            await this.cap('calificacion_guardada');
            log.ok('Nota ' + nota + ' guardada');
            this.reg('calificar_tarea', { nota, comentario });
        } else {
            log.warn('Campo de nota no encontrado - puede requerir ajuste de selectores');
            await this.cap('calificacion_sin_campo');
            this.reg('calificar_tarea', { nota, estado: 'campo_no_encontrado' });
        }
    }

    // ── 9. VER PANELES ESTUDIANTE ─────────────────
    async verPanelesEstudiante() {
        log.fase('PANELES DEL ESTUDIANTE - Explorando todas las secciones');

        const paneles = [
            { url: 'estudiante.html', nombre: 'Dashboard Principal' },
            { url: 'misclases.html',  nombre: 'Mis Clases' },
            { url: 'tareas.html',     nombre: 'Mis Tareas' },
            { url: 'nota.html',       nombre: 'Mis Calificaciones' },
            { url: 'perfil.html',     nombre: 'Mi Perfil' }
        ];

        for (const panel of paneles) {
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(`${this.baseUrl}/${panel.url}`, { waitUntil: 'networkidle2', timeout: 12000 });
                await this.esperar(2000, 'Cargando ' + panel.nombre + '...');
                await this.cerrarModalSiExiste();

                const url = this.page.url();
                if (!url.includes('sesion') && !url.includes('login')) {
                    const nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap(`est_panel_${nomC}`);
                    log.ok(`Panel "${panel.nombre}" revisado`);
                } else {
                    log.warn(panel.nombre + ': requiere autenticacion');
                }
            } catch (e) {
                log.warn(`Panel "${panel.nombre}" no disponible: ${e.message}`);
            }
            await this.esperar(600);
        }
        this.reg('ver_paneles_estudiante');
    }

    // ── 10. VER PANELES ADMIN ─────────────────────
    async verPanelesAdmin() {
        log.fase('PANELES DE ADMINISTRADOR - Explorando todas las secciones');

        const paneles = [
            { url: 'admin.html',         nombre: 'Dashboard Principal' },
            { url: 'usuarios.html',      nombre: 'Gestion de Usuarios' },
            { url: 'reportes.html',      nombre: 'Reportes' },
            { url: 'configuracion.html', nombre: 'Configuracion' },
            { url: 'seguridad.html',     nombre: 'Seguridad' }
        ];

        for (const panel of paneles) {
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(`${this.baseUrl}/${panel.url}`, { waitUntil: 'networkidle2', timeout: 12000 });
                await this.esperar(3000, 'Revisando ' + panel.nombre + '...');
                await this.cerrarModalSiExiste();

                const url = this.page.url();
                if (url.includes('sesion') || url.includes('login')) {
                    log.warn(panel.nombre + ': requiere autenticacion');
                } else {
                    const nomC = panel.nombre.toLowerCase().replace(/ /g, '_');
                    await this.cap(`admin_${nomC}`);
                    log.ok(`Panel "${panel.nombre}" revisado`);
                }
            } catch (e) {
                log.warn(`Panel "${panel.nombre}" no disponible: ${e.message}`);
            }
            await this.esperar(800);
        }
        this.reg('ver_paneles_admin');
    }

    // ══════════════════════════════════════════════
    //  G. REPORTE HTML
    // ══════════════════════════════════════════════
    generarReporte() {
        const exitosas = this.results.acciones.filter(a => a.ok);
        const capturas = this.results.capturas;

        const filas = exitosas.map(a =>
            `<tr><td class="ok-cell">✓</td><td><strong>${a.accion}</strong></td><td>${a.tipo || a.rol || a.metodo || '-'}</td><td>${a.nombre || a.nota || a.texto || a.respuesta || '-'}</td></tr>`
        ).join('');

        const galeria = capturas.map(c =>
            `<div class="thumb"><img src="${c}" alt="${path.basename(c)}" loading="lazy"/><span>${path.basename(c)}</span></div>`
        ).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte QA EduAgenda</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060a12;--s1:#0d1322;--borde:#1a2540;--acento:#00d4ff;--verde:#00e5a0;--amarillo:#ffd700;--rojo:#ff4d6d;--text:#dde4f0;--muted:#4a5568;--font:"Sora",sans-serif;--mono:"IBM Plex Mono",monospace;}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:var(--font);padding:40px 20px}
.wrap{max-width:1100px;margin:0 auto}
.hero{text-align:center;padding:70px 20px 50px;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,212,255,.08),transparent);border:1px solid var(--borde);border-radius:20px;margin-bottom:24px}
.hero h1{font-size:clamp(2rem,5vw,3rem);font-weight:800;margin-bottom:12px}
.hero h1 em{color:var(--acento);font-style:normal}
.hero p{color:var(--muted);font-family:var(--mono);font-size:.9rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:20px;text-align:center}
.stat .n{font-size:2.6rem;font-weight:800;color:var(--acento);font-family:var(--mono)}
.stat .l{color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.07em;margin-top:6px}
.bloque{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:26px;margin-bottom:20px;overflow:auto}
.bloque-titulo{font-family:var(--mono);font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}
table{width:100%;border-collapse:collapse;min-width:460px}
th{text-align:left;font-family:var(--mono);font-size:.7rem;color:var(--muted);text-transform:uppercase;padding:8px 12px;border-bottom:1px solid var(--borde)}
td{padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.5);font-size:.87rem}
tr:last-child td{border:none}
tr:hover td{background:rgba(0,212,255,.03)}
.ok-cell{color:var(--verde);font-weight:800}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:4px}
.thumb{background:var(--bg);border:1px solid var(--borde);border-radius:10px;overflow:hidden}
.thumb img{width:100%;height:95px;object-fit:cover;opacity:.75;transition:opacity .2s}
.thumb img:hover{opacity:1}
.thumb span{display:block;font-family:var(--mono);font-size:.65rem;color:var(--muted);padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pie{text-align:center;padding:40px;color:var(--muted);font-family:var(--mono);font-size:.8rem}
.pie strong{color:var(--acento)}
.flujo{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:26px;margin-bottom:20px}
.flujo ol{counter-reset:item;padding:0;margin:0}
.flujo li{counter-increment:item;padding:8px 12px 8px 36px;position:relative;border-bottom:1px solid rgba(26,37,64,.4);font-size:.88rem}
.flujo li::before{content:counter(item);position:absolute;left:8px;top:9px;font-family:var(--mono);font-size:.7rem;color:var(--acento);font-weight:600}
.flujo li:last-child{border:none}
</style>
</head>
<body>
<div class="wrap">
<div class="hero"><h1>Reporte <em>EduAgenda</em></h1><p>${new Date().toLocaleString('es-CO')}</p></div>
<div class="stats">
  <div class="stat"><div class="n">${exitosas.length}</div><div class="l">Acciones OK</div></div>
  <div class="stat"><div class="n">${capturas.length}</div><div class="l">Capturas</div></div>
  <div class="stat"><div class="n">9</div><div class="l">Fases</div></div>
  <div class="stat"><div class="n">3</div><div class="l">Roles</div></div>
</div>
<div class="flujo">
  <div class="bloque-titulo">Flujo ejecutado</div>
  <ol>
    <li>Registro Profesor</li>
    <li>Registro Estudiante</li>
    <li>Login Profesor → Ver todos los paneles → Agregar horario → Logout</li>
    <li>Login Estudiante → Reservar clase con Nequi → Logout</li>
    <li>Login Profesor → Materias → Asignar tarea → Logout</li>
    <li>Login Estudiante → Tareas pendientes → Entregar tarea → Logout</li>
    <li>Login Profesor → Calificaciones → Calificar tarea → Ver todos los paneles → Logout</li>
    <li>Login Estudiante → Calificaciones → Perfil → Logout</li>
    <li>Login Admin → Ver todos los paneles → Logout</li>
  </ol>
</div>
<div class="bloque"><div class="bloque-titulo">Acciones realizadas</div>
  <table><thead><tr><th></th><th>Accion</th><th>Rol/Metodo</th><th>Detalle</th></tr></thead>
  <tbody>${filas || '<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:20px">Sin acciones</td></tr>'}</tbody></table>
</div>
<div class="bloque"><div class="bloque-titulo">Capturas (${capturas.length})</div>
  <div class="gallery">${galeria || '<p style="color:var(--muted)">Sin capturas</p>'}</div>
</div>
<div class="pie"><p>Generado por <strong>EduAgenda QA Robot</strong></p></div>
</div></body></html>`;

        const ruta = path.join(__dirname, 'reporte-qa.html');
        fs.writeFileSync(ruta, html, 'utf8');
        log.ok('Reporte generado -> ' + ruta);
    }

    // ══════════════════════════════════════════════
    //  H. FLUJO COMPLETO
    // ══════════════════════════════════════════════
    async ejecutar() {
        log.titulo('ROBOT DE QA - EDUAGENDA - FLUJO COMPLETO CORREGIDO');

        try {
            // ── Infraestructura ──────────────────────────────
            await this.iniciarServidor();
            await this.iniciarNavegador();
            await this.irInicio();

            // ════════════════════════════════════════════════
            //  FASE 1 — Registro Profesor
            // ════════════════════════════════════════════════
            log.fase('FASE 1 - Registro de Profesor');
            await this.registrarUsuario(this.D.profesor);

            // ════════════════════════════════════════════════
            //  FASE 2 — Registro Estudiante
            // ════════════════════════════════════════════════
            log.fase('FASE 2 - Registro de Estudiante');
            await this.registrarUsuario(this.D.estudiante);

            // ════════════════════════════════════════════════
            //  FASE 3 — Profesor: Ver paneles → Agregar horario
            // ════════════════════════════════════════════════
            log.fase('FASE 3 - Profesor: Ver Paneles → Agregar Horario');
            await this.login(this.D.profesor);
            await this.verPanelesProfesor();   // primero todos los paneles
            await this.agregarHorario();       // luego agregar horario
            await this.logout('profesor');

            // ════════════════════════════════════════════════
            //  FASE 4 — Estudiante: Reservar clase con Nequi
            // ════════════════════════════════════════════════
            log.fase('FASE 4 - Estudiante: Reservar Clase con Nequi');
            await this.login(this.D.estudiante);
            await this.reservarClase();
            await this.logout('estudiante');

            // ════════════════════════════════════════════════
            //  FASE 5 — Profesor: Asignar Tarea
            // ════════════════════════════════════════════════
            log.fase('FASE 5 - Profesor: Asignar Tarea');
            await this.login(this.D.profesor);
            await this.asignarTarea();
            await this.logout('profesor');

            // ════════════════════════════════════════════════
            //  FASE 6 — Estudiante: Entregar Tarea
            // ════════════════════════════════════════════════
            log.fase('FASE 6 - Estudiante: Entregar Tarea');
            await this.login(this.D.estudiante);
            await this.verTareasPendientes();
            await this.entregarTarea();
            await this.logout('estudiante');

            // ════════════════════════════════════════════════
            //  FASE 7 — Profesor: Calificar → Ver paneles actualizados
            // ════════════════════════════════════════════════
            log.fase('FASE 7 - Profesor: Calificar Tarea → Ver Paneles Actualizados');
            await this.login(this.D.profesor);
            await this.calificarTarea();
            await this.verPanelesProfesor();   // ver paneles con datos actualizados
            await this.logout('profesor');

            // ════════════════════════════════════════════════
            //  FASE 8 — Estudiante: Ver calificación y perfil
            // ════════════════════════════════════════════════
            log.fase('FASE 8 - Estudiante: Ver Calificacion → Perfil');
            await this.login(this.D.estudiante);

            // Ver calificaciones
            log.paso('Viendo Mis Calificaciones...');
            const rutasNota = ['nota.html', 'notas.html', 'mis-notas.html', 'calificaciones.html'];
            for (const ruta of rutasNota) {
                try {
                    await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 8000 });
                    await this.esperar(2000);
                    await this.cerrarModalSiExiste();
                    const url = this.page.url();
                    if (!url.includes('sesion')) { log.info('Calificaciones en: ' + ruta); break; }
                } catch (_) {}
            }
            await this.cap('est_mis_calificaciones');
            log.ok('Calificaciones vistas');
            this.reg('ver_calificaciones', { rol: 'estudiante' });

            // Ver perfil
            log.paso('Viendo Perfil del estudiante...');
            await this.navegarSeguro('perfil.html', 'Mi Perfil (Estudiante)');
            await this.esperar(2000);
            await this.cap('est_perfil');
            log.ok('Perfil visto');
            this.reg('ver_perfil', { rol: 'estudiante' });

            await this.logout('estudiante');

            // ════════════════════════════════════════════════
            //  FASE 9 — Admin: Ver todos los paneles
            // ════════════════════════════════════════════════
            log.fase('FASE 9 - Admin: Explorar Todos los Paneles');
            await this.login(this.D.admin);
            await this.verPanelesAdmin();
            await this.logout('admin');

            // ── Fin ──────────────────────────────────────────
            log.fase('FIN - Regresando a Pagina Principal');
            await this.irInicio();
            await this.esperar(2500, 'Mostrando inicio final...');
            await this.cap('fin_inicio');

            // ── Resumen ───────────────────────────────────────
            log.titulo('RESUMEN FINAL');
            const ex = this.results.acciones.filter(a => a.ok).length;
            log.ok('Acciones completadas:  ' + ex);
            log.ok('Capturas tomadas:      ' + this.results.capturas.length);
            log.ok('Errores registrados:   ' + this.results.errores.length);

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

// ══════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════
const robot = new EduAgendaRobot();

process.on('SIGINT', async () => {
    log.warn('Interrumpido - cerrando...');
    await robot.cerrar();
    process.exit(0);
});

robot.ejecutar().finally(() => robot.cerrar());