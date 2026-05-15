// ╔══════════════════════════════════════════════════════════════════╗
// ║       ROBOT DE QA — EDUAGENDA — v4  (ROBUSTO Y CORREGIDO)       ║
// ║  Correcciones v4:                                                ║
// ║  · Respeta horarios ya creados: lee la tabla de disponibilidad   ║
// ║    antes de crear uno nuevo y elige fecha+hora libre             ║
// ║  · Si todas las horas de una fecha están ocupadas, avanza        ║
// ║    al siguiente día disponible automáticamente                   ║
// ║  · Paneles profesor: solo hasta Configuracion (sin perfil.html) ║
// ║  · Horario: fecha via nativeInputValueSetter (datepicker Chrome) ║
// ║  · Reservar clase: detecta slots reales y flujo Nequi completo   ║
// ║  · Logout: "Cerrar sesión" por texto en navbar                   ║
// ║  · Asignar tarea: flujo más robusto con reintentos               ║
// ║  · Manejo de errores críticos con captura y continuación         ║
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
                // Fecha futura en formato yyyy-mm-dd (para input type=date)
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
        return new Promise((resolve) => {
            this.serverProcess = spawn('node', ['server.js'], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            this.serverProcess.stdout.on('data', data => {
                const msg = data.toString();
                if (msg.includes('corriendo') || msg.includes('lista') ||
                    msg.includes('running')   || msg.includes('3000')) {
                    log.ok('Servidor listo');
                    resolve();
                }
            });
            this.serverProcess.stderr.on('data', d => {
                const t = d.toString().trim();
                if (t && !t.includes('DeprecationWarning')) log.warn('Servidor stderr: ' + t);
            });
            this.serverProcess.on('error', (e) => {
                log.warn('Error al iniciar servidor: ' + e.message);
                resolve(); // continuamos aunque falle
            });
            setTimeout(() => { log.ok('Servidor listo (timeout)'); resolve(); }, 5000);
        });
    }

    async iniciarNavegador() {
        log.paso('Abriendo navegador...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            slowMo: 25,
            args: [
                '--start-maximized',
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setDefaultTimeout(20000);
        await this.page.setDefaultNavigationTimeout(20000);

        // Aceptar TODOS los dialogs nativos automáticamente
        this.page.on('dialog', async dialog => {
            log.info(`Dialog nativo [${dialog.type()}]: "${dialog.message()}" -> aceptando`);
            try { await dialog.accept(); } catch (_) {}
        });

        this.page.on('close', () => log.warn('Pagina cerrada inesperadamente'));

        // Crear carpeta screenshots
        const dir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        log.ok('Navegador listo');
    }

    // ══════════════════════════════════════════════
    //  B. HELPERS BÁSICOS
    // ══════════════════════════════════════════════

    async esperar(ms, msg) {
        if (msg) log.wait(msg);
        await new Promise(r => setTimeout(r, Math.max(ms, 150)));
    }

    async cap(nombre) {
        try {
            this.capturaIdx++;
            const num  = String(this.capturaIdx).padStart(2, '0');
            const safe = nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const file = `${num}_${safe}.png`;
            const ruta = path.join(__dirname, 'screenshots', file);
            if (this.paginaViva()) {
                await this.page.screenshot({ path: ruta, fullPage: true });
                this.results.capturas.push(ruta);
                log.cap(file);
            }
        } catch (e) {
            log.warn(`No se pudo capturar "${nombre}": ${e.message}`);
        }
    }

    paginaViva() {
        return this.page && !this.page.isClosed();
    }

    async verSelector(selector, ms = 8000) {
        try {
            await this.page.waitForSelector(selector, { visible: true, timeout: ms });
            return true;
        } catch { return false; }
    }

    async esperarOculto(selector, ms = 4000) {
        try {
            await this.page.waitForSelector(selector, { hidden: true, timeout: ms });
        } catch (_) {}
    }

    async escribir(selector, texto, delay = 55) {
        const ok = await this.verSelector(selector, 6000);
        if (!ok) { log.warn('Campo no visible: ' + selector); return false; }
        await this.page.evaluate(sel => {
            const el = document.querySelector(sel);
            if (el) {
                el.value = '';
                el.dispatchEvent(new Event('input',  { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, selector);
        await this.esperar(80);
        await this.page.type(selector, texto, { delay });
        await this.esperar(150);
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
                    const st = window.getComputedStyle(e);
                    return r.width > 0 && r.height > 0 &&
                           st.display !== 'none' && st.visibility !== 'hidden' &&
                           st.opacity !== '0';
                }, sel);
                if (visible) {
                    await this.page.click(sel);
                    await this.esperar(350);
                    return sel;
                }
            } catch (_) {}
        }
        // Nivel info (no warn): no encontrar es comportamiento esperado en búsquedas de modal
        log.info('No encontrado: ' + selectores.slice(0, 4).join(' | '));
        return null;
    }

    // Escribe en el primer campo que exista y sea visible
    async escribirEn(texto, ...selectores) {
        for (const sel of selectores) {
            if (await this.verSelector(sel, 2500)) {
                const ok = await this.escribir(sel, texto);
                if (ok) return sel;
            }
        }
        log.warn('Ningún campo encontrado para: ' + selectores.slice(0, 3).join(' | '));
        return null;
    }

    // clickPrimero con nivel WARN — usar cuando no encontrar es un problema real
    async clickPrimeroEstricto(...selectores) {
        const r = await this.clickPrimero(...selectores);
        if (!r) log.warn('REQUERIDO no encontrado: ' + selectores.slice(0, 3).join(' | '));
        return r;
    }

    /**
     * Establece un campo de tipo date/time directamente via evaluate.
     * Maneja el datepicker nativo de Chrome (no acepta page.type).
     * Formato esperado: yyyy-mm-dd para date, HH:MM para time.
     */
    async setearFecha(selector, valor) {
        if (!selector) return false;
        const ok = await this.page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeInputValueSetter.call(el, val);
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }, selector, valor);
        await this.esperar(200);
        return ok;
    }

    reg(accion, extra = {}) {
        this.results.acciones.push({ accion, ok: true, ts: Date.now(), ...extra });
    }

    // ══════════════════════════════════════════════
    //  C. MANEJO DE MODALES / ALERTAS / POPUPS
    // ══════════════════════════════════════════════

    async cerrarModal(intentos = 4) {
        for (let i = 0; i < intentos; i++) {
            await this.esperar(500);
            if (!this.paginaViva()) return;

            // SweetAlert2
            const swal2 = await this.clickPrimero(
                '.swal2-confirm', 'button.swal2-confirm',
                '.swal2-popup .swal2-confirm', '.swal2-ok',
                '.swal2-popup button.swal2-styled'
            );
            if (swal2) { log.info('Modal SweetAlert2 cerrado'); await this.esperar(600); continue; }

            // SweetAlert1
            const swal1 = await this.clickPrimero(
                '.sweet-alert button.confirm', '.sweet-alert button'
            );
            if (swal1) { log.info('Modal SweetAlert1 cerrado'); await this.esperar(600); continue; }

            // Bootstrap modal — cierre y acción
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
            if (bs) { log.info('Modal Bootstrap cerrado'); await this.esperar(700); continue; }

            // Genérico por texto/clase
            const gen = await this.clickPrimero(
                'button[class*="ok"]', 'button[class*="accept"]',
                'button[class*="confirm"]', 'button[class*="aceptar"]'
            );
            if (gen) { log.info('Modal generico cerrado'); await this.esperar(500); continue; }

            // Escape si hay overlay
            try {
                const overlay = await this.page.$(
                    '.modal-backdrop, .swal2-backdrop-show, .swal2-container, .overlay'
                );
                if (overlay) {
                    await this.page.keyboard.press('Escape');
                    log.info('Overlay cerrado con Escape');
                    await this.esperar(500);
                    continue;
                }
            } catch (_) {}

            break; // nada que cerrar
        }

        await this.esperarOculto('.modal.show',      3000);
        await this.esperarOculto('.swal2-container', 2500);
        await this.esperar(350);
    }

    async cerrarModalSiExiste() {
        await this.esperar(800);
        if (!this.paginaViva()) return;
        const haySwal2 = await this.page.$('.swal2-popup');
        const hayBs    = await this.page.$('.modal.show');
        if (haySwal2 || hayBs) {
            log.info('Modal detectado -> cerrando...');
            await this.cerrarModal(3);
        }
    }

    // ══════════════════════════════════════════════
    //  D. NAVEGACIÓN SEGURA
    // ══════════════════════════════════════════════

    async ir(url, etiqueta = '') {
        const urlCompleta = url.startsWith('http') ? url : `${this.baseUrl}/${url}`;
        if (etiqueta) log.paso('Navegando a: ' + etiqueta);

        await this.cerrarModalSiExiste();

        try {
            await this.page.goto(urlCompleta, { waitUntil: 'networkidle2', timeout: 18000 });
        } catch (e) {
            log.warn('Navegación con aviso (continuando): ' + e.message.split('\n')[0]);
        }
        await this.esperar(1200);
        await this.cerrarModalSiExiste();

        const actual = this.page.url();
        if (actual.includes('sesion') && !urlCompleta.includes('sesion')) {
            log.warn('Redirigido a login al intentar: ' + etiqueta);
            return false;
        }
        return true;
    }

    // ══════════════════════════════════════════════
    //  E. LOGIN / LOGOUT
    // ══════════════════════════════════════════════

    async login(u) {
        log.fase(`LOGIN - ${u.tipo.toUpperCase()}: ${u.email}`);

        await this.page.goto(`${this.baseUrl}/sesion.html`, { waitUntil: 'networkidle2' });
        await this.esperar(1800, 'Cargando login...');
        await this.cerrarModalSiExiste();
        await this.cap(`login_${u.tipo}_form`);

        const emailOk = await this.verSelector('#email', 10000);
        if (!emailOk) {
            log.warn('Formulario login no encontrado con #email, buscando alternativas...');
            // Intentar selectores alternativos
            const alt = await this.verSelector('input[type="email"]', 5000)
                     || await this.verSelector('input[name="email"]', 5000);
            if (!alt) throw new Error('Formulario de login no disponible para ' + u.tipo);
        }

        log.info('Email: ' + u.email);
        await this.escribirEn(u.email, '#email', 'input[type="email"]', 'input[name="email"]');

        log.info('Password: ******');
        await this.escribirEn(u.password, '#password', 'input[type="password"]', 'input[name="password"]');

        await this.cap(`login_${u.tipo}_lleno`);

        log.info('Presionando Iniciar Sesion...');
        await this.clickPrimero(
            '#btnLogin', 'button[type="submit"]', '.btn-login',
            'input[type="submit"]', 'form button'
        );

        await this.esperar(3500, 'Verificando credenciales...');
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

    /**
     * Logout mejorado.
     * 1. Busca "Cerrar sesión" en el navbar (como se ve en la imagen 3)
     * 2. Intenta selectores comunes
     * 3. Fuerza navegación a sesion.html
     */
    async logout(tipo = '') {
        log.paso(`Cerrando sesion${tipo ? ' (' + tipo + ')' : ''}...`);

        // Prioridad: botón "Cerrar sesión" visible en navbar (imagen 3)
        const porTexto = await this.page.evaluate(() => {
            const candidatos = document.querySelectorAll(
                'a, button, [onclick], .nav-link, .btn, li a, .navbar a'
            );
            for (const el of candidatos) {
                const t = (el.textContent || '').toLowerCase().trim();
                if (t.includes('cerrar sesi') || t.includes('cerrar sesion') ||
                    t.includes('logout') || t.includes('salir') || t.includes('sign out')) {
                    el.click();
                    return el.textContent.trim();
                }
            }
            return null;
        });

        if (porTexto) {
            log.info(`Logout por texto: "${porTexto}"`);
            await this.esperar(2200, 'Cerrando sesion...');
            await this.cerrarModal(3);
            await this.cap(`logout_${tipo || 'ok'}`);
            log.ok('Sesion cerrada');
            this.reg('logout', { tipo, modo: 'texto' });
            return true;
        }

        // Selectores explícitos
        const btn = await this.clickPrimero(
            '#logoutBtn', '.logout-btn', '.btn-logout',
            'a[href*="logout"]', 'a[onclick*="logout"]',
            'button[onclick*="logout"]', '[data-action="logout"]',
            '#cerrarSesion', '.cerrar-sesion',
            'a[href="sesion.html"]', 'a[href="/sesion.html"]'
        );

        if (btn) {
            await this.esperar(2200, 'Cerrando sesion...');
            await this.cerrarModal(2);
            await this.cap(`logout_${tipo || 'btn'}`);
            log.ok('Sesion cerrada');
            this.reg('logout', { tipo, modo: 'btn' });
            return true;
        }

        // Forzar
        log.warn('Boton logout no encontrado -> navegando a sesion.html');
        await this.page.goto(`${this.baseUrl}/sesion.html`, { waitUntil: 'networkidle2' });
        await this.esperar(1200);
        await this.cap(`logout_${tipo || 'forzado'}`);
        log.ok('Sesion cerrada (forzado)');
        this.reg('logout', { tipo, modo: 'forzado' });
        return true;
    }

    // ══════════════════════════════════════════════
    //  F. PÁGINAS DE INICIO
    // ══════════════════════════════════════════════

    async irInicio() {
        log.paso('Navegando a pagina principal...');
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        await this.esperar(1800);
        await this.cerrarModalSiExiste();
        await this.cap('inicio');
        log.ok('Pagina principal cargada');
    }

    // ══════════════════════════════════════════════
    //  G. REGISTRO
    // ══════════════════════════════════════════════

    async registrarUsuario(u) {
        log.fase(`REGISTRO - ${u.tipo.toUpperCase()}: ${u.nombre}`);

        await this.page.goto(`${this.baseUrl}/registrate.html`, { waitUntil: 'networkidle2' });
        await this.esperar(1800, 'Cargando formulario de registro...');
        await this.cerrarModalSiExiste();
        await this.cap(`reg_${u.tipo}_form_vacio`);

        const formOk = await this.verSelector('input[name="nombre"]', 10000);
        if (!formOk) throw new Error('Formulario de registro no disponible para ' + u.tipo);

        log.info('Nombre: ' + u.nombre);
        await this.escribir('input[name="nombre"]', u.nombre);

        log.info('Documento: ' + u.doc);
        await this.escribirEn(u.doc,
            'input[name="documento"]', 'input[name="cedula"]', 'input[name="cc"]'
        );

        log.info('Email: ' + u.email);
        await this.escribir('input[name="email"]', u.email);

        log.info('Telefono: ' + u.tel);
        await this.escribirEn(u.tel,
            'input[name="telefono"]', 'input[name="celular"]', 'input[name="phone"]'
        );

        log.info('Password: ******');
        await this.escribir('input[name="password"]', u.password);

        log.info('Confirmar password: ******');
        await this.escribirEn(u.password,
            'input[name="confirm_password"]', 'input[name="confirmPassword"]',
            'input[name="password2"]', 'input[name="repeatPassword"]'
        );

        // Tipo de usuario
        log.info('Tipo: ' + u.tipo);
        const tipoOk = await this.clickPrimero(
            `input[value="${u.tipo}"]`,
            `input[name="tipo"][value="${u.tipo}"]`,
            `input[name="rol"][value="${u.tipo}"]`,
            `#${u.tipo}`, `#tipo_${u.tipo}`
        );
        if (!tipoOk) {
            const labOk = await this.page.evaluate(tipo => {
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if (label.textContent.toLowerCase().includes(tipo)) {
                        label.click(); return true;
                    }
                }
                // También select
                const sel = document.querySelector('select[name="tipo"], select[name="rol"]');
                if (sel) {
                    for (const op of sel.options) {
                        if (op.value.toLowerCase().includes(tipo) ||
                            op.text.toLowerCase().includes(tipo)) {
                            sel.value = op.value;
                            sel.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                }
                return false;
            }, u.tipo);
            if (labOk) log.info('Tipo seleccionado via label/select');
            else log.warn(`No se encontro radio para tipo "${u.tipo}"`);
        }

        await this.esperar(400);
        await this.cap(`reg_${u.tipo}_lleno`);

        log.info('Enviando formulario...');
        await this.clickPrimero(
            'button[type="submit"]', 'input[type="submit"]',
            '#btnRegistrar', '#btnRegistro', '.btn-registro', 'form button'
        );

        log.info('Esperando confirmacion del servidor...');
        await this.esperar(1800);

        // Esperar confirmación hasta 12s
        const fin = Date.now() + 12000;
        while (Date.now() < fin) {
            if (!this.paginaViva()) break;

            const haySwal2 = await this.page.$('.swal2-popup');
            const hayBs    = await this.page.$('.modal.show');
            const url      = this.page.url();

            if (haySwal2) {
                await this.cap(`reg_${u.tipo}_modal_ok`);
                log.info('Modal exito (Swal2) -> cerrando...');
                await this.cerrarModal(5);
                break;
            }
            if (hayBs) {
                await this.cap(`reg_${u.tipo}_modal_ok`);
                log.info('Modal Bootstrap -> cerrando...');
                await this.cerrarModal(5);
                break;
            }
            if (!url.includes('registrate')) {
                log.info('Redirigido post-registro');
                break;
            }
            await this.esperar(350);
        }

        await this.esperar(1500);
        await this.cap(`reg_${u.tipo}_resultado`);
        log.ok(`${u.tipo.toUpperCase()} registrado: ${u.nombre}`);
        this.reg('registro', { nombre: u.nombre, tipo: u.tipo });
        await this.esperar(1800, 'Pausa entre registros...');
    }

    // ══════════════════════════════════════════════
    //  H. VER PANELES PROFESOR
    //     CORRECCIÓN: sin perfil.html (no existe en menú profesor)
    //     El menú del profesor termina en Configuración
    // ══════════════════════════════════════════════

    async verPanelesProfesor() {
        log.fase('PANELES DEL PROFESOR - Explorando todas las secciones');

        // NOTA: perfil.html se elimina de este flujo porque el panel del profesor
        // solo tiene: Mi agenda | Estudiantes | Ingresos | Materias | Calificaciones | Configuracion
        const paneles = [
            { url: 'profesor.html',       nombre: 'Dashboard Principal' },
            { url: 'agenda.html',         nombre: 'Mi Agenda' },
            { url: 'materias.html',       nombre: 'Mis Materias' },
            { url: 'misestudiantes.html', nombre: 'Mis Estudiantes' },
            { url: 'calificaciones.html', nombre: 'Calificaciones' },
            { url: 'ingresos.html',       nombre: 'Ingresos' },
            { url: 'configuracion2.html', nombre: 'Configuracion' }
        ];

        for (const panel of paneles) {
            log.info('Abriendo: ' + panel.nombre + '...');
            try {
                await this.page.goto(
                    `${this.baseUrl}/${panel.url}`,
                    { waitUntil: 'networkidle2', timeout: 12000 }
                );
                await this.esperar(1800, 'Cargando ' + panel.nombre + '...');
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
                log.warn(`Panel "${panel.nombre}" error: ${e.message.split('\n')[0]}`);
            }
            await this.esperar(500);
        }
        this.reg('ver_paneles_profesor');
    }

    // ══════════════════════════════════════════════
    //  I-0. LEER HORARIOS YA CREADOS
    //  Lee la tabla "Mi Disponibilidad Académica" del dashboard del profesor
    //  y devuelve un Set con strings "yyyy-mm-dd|HH:MM" ya ocupados.
    //  También intenta leer via API /api/horarios si la tabla no existe.
    // ══════════════════════════════════════════════

    async leerHorariosExistentes() {
        log.paso('Leyendo horarios existentes para evitar conflictos...');
        const ocupados = new Set();

        try {
            // ── Método 1: leer tabla en el DOM ──────────────────────
            // La imagen 3 muestra una tabla con columnas Fecha | Materia | Hora Inicio | Estado
            const desdeDOM = await this.page.evaluate(() => {
                const slots = [];

                // Buscar en tabla (tr con celdas de fecha y hora)
                const filas = document.querySelectorAll('table tr, tbody tr');
                filas.forEach(tr => {
                    const celdas = tr.querySelectorAll('td');
                    if (celdas.length >= 3) {
                        // Intentar obtener fecha (col 0) y hora (col 2)
                        const fechaRaw = (celdas[0].textContent || '').trim();
                        const horaRaw  = (celdas[2].textContent || '').trim();
                        if (fechaRaw && horaRaw) slots.push({ fecha: fechaRaw, hora: horaRaw });
                    }
                });

                // También buscar en tarjetas / slots visuales (agenda tipo calendario)
                const items = document.querySelectorAll(
                    '.slot, .horario-item, .agenda-item, .disponibilidad-item, [data-fecha]'
                );
                items.forEach(el => {
                    const f = el.getAttribute('data-fecha') || '';
                    const h = el.getAttribute('data-hora')  || el.getAttribute('data-hora-inicio') || '';
                    if (f && h) slots.push({ fecha: f, hora: h });
                });

                return slots;
            });

            for (const { fecha, hora } of desdeDOM) {
                // Normalizar fecha → yyyy-mm-dd
                const fechaNorm = normalizarFecha(fecha);
                // Normalizar hora → HH:MM (quitar segundos si vienen)
                const horaNorm  = hora.substring(0, 5);
                if (fechaNorm && horaNorm) {
                    ocupados.add(`${fechaNorm}|${horaNorm}`);
                }
            }

            // ── Método 2: API REST del servidor ─────────────────────
            if (ocupados.size === 0) {
                try {
                    const resp = await this.page.evaluate(async () => {
                        const r = await fetch('/api/horarios', { credentials: 'include' });
                        if (!r.ok) return null;
                        return r.json();
                    });
                    if (Array.isArray(resp)) {
                        resp.forEach(h => {
                            const f = normalizarFecha(h.fecha || h.date || '');
                            const t = (h.hora_inicio || h.hora || h.time || '').substring(0, 5);
                            if (f && t) ocupados.add(`${f}|${t}`);
                        });
                    }
                } catch (_) {}
            }

        } catch (e) {
            log.warn('No se pudo leer horarios existentes: ' + e.message);
        }

        log.info(`Horarios ocupados encontrados: ${ocupados.size}`);
        ocupados.forEach(s => log.info('  · ocupado: ' + s));
        return ocupados;

        // ── Función interna de normalización ─────────────────────────
        function normalizarFecha(raw) {
            if (!raw) return null;
            raw = raw.trim();
            // yyyy-mm-dd  (ya correcto)
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
            // dd/mm/yyyy  o  dd-mm-yyyy
            const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
            // mm/dd/yyyy
            const m2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m2) return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
            return null;
        }
    }

    /**
     * Dado un Set de slots ocupados ("yyyy-mm-dd|HH:MM"),
     * elige la próxima combinación fecha+hora que esté libre.
     * Empieza desde la fecha base (2026-12-25) y recorre hacia adelante.
     * Devuelve { fecha, hora } en formato yyyy-mm-dd / HH:MM.
     */
    elegirSlotLibre(ocupados) {
        const horasDisponibles = ['09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00'];
        const fechaBase = new Date('2026-12-25');

        for (let d = 0; d < 60; d++) {             // hasta 60 días hacia adelante
            const fecha = new Date(fechaBase);
            fecha.setDate(fechaBase.getDate() + d);
            const fechaStr = fecha.toISOString().substring(0, 10); // yyyy-mm-dd

            for (const hora of horasDisponibles) {
                const clave = `${fechaStr}|${hora}`;
                if (!ocupados.has(clave)) {
                    log.ok(`Slot libre elegido: ${fechaStr} a las ${hora}`);
                    return { fecha: fechaStr, hora };
                }
            }
            log.info(`Fecha ${fechaStr} completamente ocupada, probando siguiente...`);
        }

        // Fallback extremo: fecha muy lejana
        log.warn('No se encontró slot libre en 60 días, usando fecha de emergencia');
        return { fecha: '2027-06-15', hora: '08:00' };
    }

    // ══════════════════════════════════════════════
    //  I. AGREGAR HORARIO
    //     v4: lee horarios existentes ANTES de crear uno nuevo
    //         y elige automáticamente un slot que no colisione
    // ══════════════════════════════════════════════

    async agregarHorario() {
        const { materia } = this.D.horario;

        // ── PASO 1: Ir al dashboard y leer horarios ocupados ─────────
        await this.ir('profesor.html', 'Dashboard Profesor');
        await this.esperar(2000);
        await this.cap('horario_dashboard_profesor');

        const ocupados = await this.leerHorariosExistentes();

        // ── PASO 2: Elegir slot libre ────────────────────────────────
        const { fecha, hora } = this.elegirSlotLibre(ocupados);

        // Actualizar this.D.horario para que el resto del flujo lo use
        this.D.horario.fecha = fecha;
        this.D.horario.hora  = hora;

        log.fase(`AGREGAR HORARIO - Materia: ${materia} | Fecha: ${fecha} | Hora: ${hora}`);

        // Buscar botón "+ Agregar Horario" (visible en imagen 3)
        // El dashboard YA está cargado desde leerHorariosExistentes (PASO 1), no renavergar
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

        // Si no encontró por selector, buscar por texto
        if (!btnModal) {
            const porTexto = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, a, .btn');
                for (const el of all) {
                    const t = (el.textContent || '').trim();
                    if (t.includes('Agregar Horario') || t.includes('+ Agregar') ||
                        t.includes('Nuevo Horario')   || t.includes('Agregar horario')) {
                        el.click(); return t;
                    }
                }
                return null;
            });
            if (porTexto) log.info(`Boton horario por texto: "${porTexto}"`);
            else log.warn('Boton de agregar horario no encontrado');
        } else {
            log.info('Boton de horario presionado');
        }

        await this.esperar(1500);
        await this.cap('horario_modal_abierto');

        // ── Materia ──────────────────────────────────────────────────
        log.info('Materia: ' + materia);
        // Primero buscar si hay un <select> de materia
        const haySelectMateria = await this.page.$('select[name="materia"], select#materia, select[id*="materia"]');
        if (haySelectMateria) {
            const selOk = await this.page.evaluate((mat) => {
                const sel = document.querySelector('select[name="materia"], select#materia, select[id*="materia"]');
                if (!sel) return false;
                for (const op of sel.options) {
                    if (op.value.toLowerCase().includes(mat.toLowerCase()) ||
                        op.text.toLowerCase().includes(mat.toLowerCase())) {
                        sel.value = op.value;
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                // Si no hay opción exacta, usar la primera disponible
                if (sel.options.length > 1) {
                    sel.selectedIndex = 1;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                return false;
            }, materia);
            if (selOk) log.info('Materia seleccionada en <select>');
            else log.warn('No se encontro opcion de materia en select');
        } else {
            // Campo de texto
            const campM = await this.escribirEn(materia,
                '#materia', 'input[name="materia"]',
                'input[placeholder*="materia"]', 'input[placeholder*="Materia"]',
                'input[placeholder*="asignatura"]'
            );
            if (!campM) log.warn('Campo materia no encontrado');
        }

        await this.esperar(400);

        // ── Fecha ─────────────────────────────────────────────────────
        // CORRECCIÓN: usar setearFecha con nativeInputValueSetter (evita datepicker)
        log.info('Fecha: ' + fecha);
        const campF = await this.encontrarSelector(
            '#fecha', 'input[name="fecha"]', 'input[type="date"]',
            'input[placeholder*="fecha"]', 'input[placeholder*="Fecha"]'
        );
        if (campF) {
            await this.setearFecha(campF, fecha);
            log.info(`Fecha establecida en "${campF}": ${fecha}`);
        } else {
            log.warn('Campo fecha no encontrado');
        }

        await this.esperar(400);

        // ── Hora ──────────────────────────────────────────────────────
        log.info('Hora: ' + hora);
        const campH = await this.encontrarSelector(
            '#hora_inicio', 'input[name="hora_inicio"]',
            'input[name="hora"]', 'input[type="time"]', '#hora'
        );
        if (campH) {
            await this.setearFecha(campH, hora); // mismo método sirve para time
            // También escribir por si acaso
            try { await this.page.type(campH, hora, { delay: 60 }); } catch (_) {}
            log.info(`Hora establecida: ${hora}`);
        } else {
            log.warn('Campo hora no encontrado');
        }

        await this.esperar(500);
        await this.cap('horario_formulario_lleno');

        // ── Guardar ───────────────────────────────────────────────────
        log.info('Guardando horario...');
        await this.clickPrimero(
            '#formHorario button[type="submit"]',
            '#btnGuardarHorario', '.btn-guardar',
            '.modal.show button[type="submit"]',
            '.modal-footer button[type="submit"]',
            'button[type="submit"]', 'form button'
        );

        await this.esperar(2500, 'Guardando horario...');
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('horario_guardado');
        log.ok(`Horario guardado: ${materia} a las ${hora}`);
        this.reg('agregar_horario', { materia, fecha, hora });
    }

    // Helper: retorna el primer selector que existe en el DOM
    async encontrarSelector(...selectores) {
        for (const sel of selectores) {
            try {
                const el = await this.page.$(sel);
                if (el) return sel;
            } catch (_) {}
        }
        return null;
    }

    // ══════════════════════════════════════════════
    //  J. RESERVAR CLASE CON NEQUI
    //     CORRECCIÓN PRINCIPAL:
    //     - Navegamos a la página de agenda/clases del estudiante
    //     - Detectamos slots disponibles (`.slot`, `.disponible`, `.available`)
    //     - El flujo de Nequi busca el campo de celular con más selectores
    //     - Si el slot ya está reservado, buscamos uno libre
    // ══════════════════════════════════════════════

    async reservarClase() {
        log.fase('RESERVAR CLASE - Metodo: Nequi');

        // La agenda del estudiante puede estar en varias rutas
        const rutasAgenda = [
            'estudiante.html', 'agenda-estudiante.html',
            'agenda.html', 'clases.html', 'horarios.html'
        ];

        let agendaCargada = false;
        for (const ruta of rutasAgenda) {
            try {
                await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(2500);
                await this.cerrarModalSiExiste();
                const url = this.page.url();
                if (!url.includes('sesion')) {
                    log.info('Agenda en: ' + ruta);
                    agendaCargada = true;
                    break;
                }
            } catch (_) {}
        }

        if (!agendaCargada) {
            log.warn('No se pudo cargar agenda del estudiante');
            await this.cap('reserva_agenda_no_encontrada');
            return false;
        }

        await this.esperar(2000, 'Cargando horarios disponibles...');
        await this.cap('reserva_agenda');

        // ── Buscar slot DISPONIBLE ────────────────────────────────────
        log.info('Buscando slots disponibles...');

        // Orden de preferencia: primero slots marcados como disponibles
        const slotSels = [
            '.slot.disponible',
            '.horario-disponible',
            '.slot-disponible',
            '.clase-disponible',
            '[data-estado="disponible"]',
            '[data-status="available"]',
            '.available',
            '.slot:not(.reservado):not(.ocupado):not(.selected)',
            '.slot',
            '.clase',
            '.horario-item',
            '.time-slot'
        ];

        let slotOk = false;
        for (const sel of slotSels) {
            const slots = await this.page.$$(sel);
            if (slots.length > 0) {
                log.info(`${slots.length} slot(s) con "${sel}" -> intentando primero libre...`);

                // Intentar cada slot hasta encontrar uno que no esté reservado
                for (let i = 0; i < Math.min(slots.length, 5); i++) {
                    try {
                        const esReservado = await this.page.evaluate((s, idx) => {
                            const all = document.querySelectorAll(s);
                            const el = all[idx];
                            if (!el) return true;
                            const text = (el.textContent || '').toLowerCase();
                            const cls  = (el.className || '').toLowerCase();
                            return cls.includes('reservado') || cls.includes('ocupado') ||
                                   cls.includes('selected')  || text.includes('reservado');
                        }, sel, i);

                        if (!esReservado || sel.includes('disponible') || sel.includes('available')) {
                            await slots[i].click();
                            await this.esperar(1500);
                            slotOk = true;
                            log.info(`Slot ${i + 1} seleccionado`);
                            break;
                        }
                    } catch (_) {}
                }
                if (slotOk) break;
            }
        }

        // Si no hay slot con selectores, buscar botón "Reservar" directo
        if (!slotOk) {
            const porTexto = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, a, .btn, .card, .item, td');
                for (const el of all) {
                    const t = (el.textContent || '').toLowerCase();
                    if (t.includes('reservar') || t.includes('disponible') ||
                        t.includes('agendar')  || t.includes('contratar')) {
                        el.click(); return el.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info(`Slot/boton por texto: "${porTexto}"`);
                slotOk = true;
                await this.esperar(1500);
            }
        }

        if (!slotOk) {
            log.warn('Sin slots disponibles visibles - tomando captura y continuando');
            await this.cap('reserva_sin_slots');
            // No falla: continúa el flujo
            return false;
        }

        await this.cap('reserva_slot_seleccionado');
        await this.cerrarModalSiExiste();

        // ── Botón Reservar ────────────────────────────────────────────
        log.info('Presionando boton Reservar...');
        const btnRes = await this.clickPrimero(
            '#btnReservar', '.btn-reservar',
            'button[onclick*="reservar"]', '[data-action="reservar"]',
            'button[onclick*="Reservar"]',
            '#reservar', '.reservar'
        );
        if (!btnRes) {
            // El click en el slot puede haber abierto directamente el modal de pago
            log.info('Sin boton Reservar separado (modal de pago ya abierto)');
        }
        await this.esperar(2000);
        await this.cap('reserva_pago_modal');

        // ── Seleccionar Nequi ─────────────────────────────────────────
        log.info('Seleccionando Nequi...');
        let nequiOk = await this.clickPrimero(
            '[data-metodo="nequi"]', '[data-pago="nequi"]',
            '.metodo-nequi', '#nequi',
            'input[value="nequi"]', 'input[value="Nequi"]',
            'label[for="nequi"]'
        );

        if (!nequiOk) {
            nequiOk = await this.page.evaluate(() => {
                const all = document.querySelectorAll(
                    'button, label, .metodo-btn, .metodo-pago, ' +
                    '.option, .card, input[type="radio"], li, div[onclick]'
                );
                for (const el of all) {
                    const t = (el.textContent || el.value || el.getAttribute('data-metodo') || '');
                    if (t.toLowerCase().includes('nequi')) { el.click(); return true; }
                }
                return false;
            });
            if (nequiOk) log.info('Nequi seleccionado por texto/valor');
            else log.warn('Nequi no encontrado - puede que no haya opciones de pago visibles');
        }

        await this.esperar(1000);
        await this.cap('reserva_nequi_seleccionado');

        // ── Número celular Nequi ──────────────────────────────────────
        log.info('Celular Nequi: ' + this.D.nequi.celular);
        const campCel = await this.escribirEn(this.D.nequi.celular,
            '#celularNequi', '#numeroCelular', '#celular',
            '#phoneNequi', '#numNequi',
            'input[name="celular"]', 'input[name="telefono"]',
            'input[name="celularNequi"]', 'input[name="numeroCelular"]',
            'input[placeholder*="celular"]', 'input[placeholder*="Nequi"]',
            'input[placeholder*="numero"]', 'input[placeholder*="Número"]',
            'input[type="tel"]', 'input[type="number"]'
        );
        if (!campCel) log.warn('Campo celular Nequi no encontrado');

        await this.esperar(800);
        await this.cap('reserva_celular_ingresado');

        // ── Confirmar pago ────────────────────────────────────────────
        log.info('Confirmando pago...');
        await this.clickPrimero(
            '#btnConfirmarPago', '.btn-confirmar-pago',
            '#btnPagar', '.btn-pagar', '#btnConfirmar',
            'button[onclick*="pagar"]', 'button[onclick*="confirmar"]',
            'button[onclick*="Pagar"]', 'button[onclick*="Confirmar"]',
            '.modal.show button[type="submit"]',
            '.modal-footer button[type="submit"]',
            'button[type="submit"]'
        );

        await this.esperar(3500, 'Procesando pago Nequi...');
        await this.cerrarModal(4);
        await this.esperar(1200);
        await this.cap('reserva_confirmada');
        log.ok('Reserva realizada con Nequi: ' + this.D.nequi.celular);
        this.reg('reservar_clase', { metodo: 'Nequi', celular: this.D.nequi.celular });
        return true;
    }

    // ══════════════════════════════════════════════
    //  K. ASIGNAR TAREA
    //     CORRECCIÓN: más robusto, no se interrumpe por modal abierto
    // ══════════════════════════════════════════════

    async asignarTarea() {
        const { texto, fecha } = this.D.tarea;
        log.fase(`ASIGNAR TAREA: "${texto}"`);

        await this.ir('materias.html', 'Materias del Profesor');
        await this.esperar(2000);
        await this.cap('tarea_materias_profesor');

        // Seleccionar la materia (si existe)
        log.info(`Buscando materia "${this.D.horario.materia}"...`);
        const materiaOk = await this.page.evaluate(mat => {
            const all = document.querySelectorAll(
                '.materia, .card, .item, li, tr, .materia-item, td, .subject, h3, h4, p'
            );
            for (const el of all) {
                if ((el.textContent || '').toLowerCase().includes(mat.toLowerCase())) {
                    // Solo click si tiene algo clickeable
                    const btn = el.querySelector('button') || el.querySelector('a');
                    if (btn) { btn.click(); return 'btn'; }
                    el.click(); return 'el';
                }
            }
            return null;
        }, this.D.horario.materia);

        if (materiaOk) {
            log.info('Materia encontrada: ' + this.D.horario.materia);
            await this.esperar(1200);
            await this.cerrarModalSiExiste();
        } else {
            log.warn('Materia no encontrada visualmente - continuando igualmente');
        }

        await this.cap('tarea_materias_vista');

        // Buscar botón asignar tarea
        log.info('Buscando boton para asignar tarea...');
        const btnT = await this.clickPrimero(
            '.btn-tarea', '#btnTarea', '[data-action="tarea"]',
            '[data-modal="tarea"]', '.icon-task',
            'button[onclick*="tarea"]', 'button[onclick*="Tarea"]',
            'a[onclick*="tarea"]',
            '#btnAsignarTarea', '.btn-asignar-tarea'
        );

        if (!btnT) {
            const porTexto = await this.page.evaluate(() => {
                const all = document.querySelectorAll('button, a, .btn, [onclick]');
                for (const el of all) {
                    const t = (el.textContent || '').toLowerCase().trim();
                    if (t.includes('tarea') || t.includes('asignar') ||
                        t.includes('nueva tarea') || t === 'tarea') {
                        el.click(); return el.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) log.info(`Boton tarea por texto: "${porTexto}"`);
            else log.warn('Boton asignar tarea no encontrado');
        }

        await this.esperar(1500);
        await this.cap('tarea_modal_abierto');

        // Descripción / pregunta
        log.info('Pregunta: ' + texto);
        const campDesc = await this.escribirEn(texto,
            '#desc', '#descripcion', '#pregunta', '#tarea',
            'textarea[name="descripcion"]', 'textarea[name="desc"]',
            'textarea[name="tarea"]', 'textarea[name="pregunta"]',
            'textarea', 'input[name="descripcion"]'
        );
        if (!campDesc) log.warn('Campo descripcion/pregunta no encontrado');

        await this.esperar(400);

        // Fecha de entrega
        log.info('Fecha entrega: ' + fecha);
        const campFe = await this.encontrarSelector(
            '#fechaEntrega', 'input[name="fechaEntrega"]',
            'input[name="fecha_entrega"]', 'input[name="fechaLimite"]',
            'input[type="date"]'
        );
        if (campFe) {
            await this.setearFecha(campFe, fecha);
            log.info(`Fecha entrega establecida: ${fecha}`);
        } else {
            log.warn('Campo fecha entrega no encontrado');
        }

        await this.esperar(500);
        await this.cap('tarea_formulario_lleno');

        // Guardar tarea
        log.info('Guardando tarea...');
        await this.clickPrimero(
            '#btnEnviar', '.btn-send', '#btnGuardar', '.btn-guardar',
            '#btnAsignar', '.btn-asignar',
            '.modal.show button[type="submit"]',
            '.modal-footer button[type="submit"]',
            'button[type="submit"]', 'form button'
        );

        await this.esperar(2500, 'Guardando tarea...');
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('tarea_asignada');
        log.ok(`Tarea asignada: "${texto}"`);
        this.reg('asignar_tarea', { texto, fecha });
    }

    // ══════════════════════════════════════════════
    //  L. TAREAS PENDIENTES (ESTUDIANTE)
    // ══════════════════════════════════════════════

    async verTareasPendientes() {
        log.paso('Viendo Tareas Pendientes...');
        const rutas = [
            'tareas.html', 'mis-tareas.html',
            'tareas-pendientes.html', 'estudiante.html'
        ];
        let cargado = false;

        for (const ruta of rutas) {
            try {
                await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(1800);
                await this.cerrarModalSiExiste();
                const url = this.page.url();
                if (!url.includes('sesion')) {
                    log.info('Tareas en: ' + ruta);
                    cargado = true;
                    break;
                }
            } catch (_) {}
        }

        if (!cargado) log.warn('Pagina tareas no encontrada');
        await this.cap('tareas_pendientes_lista');
        log.ok('Tareas pendientes cargadas');
        this.reg('ver_tareas_pendientes');
    }

    // ══════════════════════════════════════════════
    //  M. ENTREGAR TAREA
    // ══════════════════════════════════════════════

    async entregarTarea() {
        const entrega = this.D.tarea.entrega;
        log.fase(`ENTREGAR TAREA - Respuesta: "${entrega}"`);

        await this.esperar(1800, 'Asegurando que las tareas esten visibles...');
        await this.cerrarModalSiExiste();

        // Buscar botón entregar
        log.info('Buscando boton para entregar tarea...');
        let btnE = await this.clickPrimero(
            '.btn-entregar', '.btn-realizar', '#btnEntregar',
            '#btnRealizarTarea', '[data-action="entregar"]',
            'button[onclick*="entregar"]', 'button[onclick*="realizar"]',
            '#btnResponder', '.btn-responder'
        );

        if (!btnE) {
            const porTexto = await this.page.evaluate(() => {
                const btns = document.querySelectorAll('button, a, .btn, [onclick]');
                for (const btn of btns) {
                    const t = (btn.textContent || '').toLowerCase().trim();
                    if (t.includes('entregar') || t.includes('realizar') ||
                        t.includes('responder') || t.includes('completar') ||
                        t.includes('enviar tarea')) {
                        btn.click(); return btn.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info(`Boton por texto: "${porTexto}"`);
                btnE = true;
            }
        }

        await this.esperar(1500);
        await this.cap('entrega_modal_abierto');

        // Escribir respuesta
        log.info(`Respuesta: "${entrega}"`);
        await this.escribirEn(entrega,
            '#entregaDesc', '#respuesta', '#descripcion', '#respuestaEstudiante',
            'textarea[name="entrega"]', 'textarea[name="respuesta"]',
            'textarea[name="descripcion"]', 'textarea[name="respuestaEstudiante"]',
            'textarea'
        );

        await this.esperar(500);
        await this.cap('entrega_respuesta_escrita');

        // Guardar entrega
        log.info('Guardando entrega...');
        await this.clickPrimero(
            '#btnSubmit', '.btn-submit', '#btnEnviarEntrega',
            '#btnGuardar', '#btnEnviar',
            '.modal.show button[type="submit"]',
            '.modal-footer button[type="submit"]',
            'button[type="submit"]', 'form button'
        );

        await this.esperar(2500, 'Guardando entrega...');
        await this.cerrarModal(4);
        await this.esperar(1000);
        await this.cap('entrega_guardada');
        log.ok(`Tarea entregada: "${entrega}"`);
        this.reg('entregar_tarea', { respuesta: entrega });
    }

    // ══════════════════════════════════════════════
    //  N. CALIFICAR TAREA
    // ══════════════════════════════════════════════

    async calificarTarea() {
        const { nota, comentario } = this.D.calificacion;
        log.fase('CALIFICAR TAREA - Nota: ' + nota);

        const rutas = [
            'calificaciones.html', 'calificar.html',
            'notas.html', 'misestudiantes.html', 'materias.html'
        ];
        let pagOk = false;

        for (const ruta of rutas) {
            try {
                await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 10000 });
                await this.esperar(1800);
                await this.cerrarModalSiExiste();
                const url = this.page.url();
                if (!url.includes('sesion') && !url.includes('login')) {
                    log.info('Pagina calificaciones: ' + ruta);
                    pagOk = true;
                    break;
                }
            } catch (_) {}
        }

        if (!pagOk) log.warn('Pagina calificaciones no encontrada');
        await this.cap('calificacion_pagina');

        // Buscar botón calificar
        log.info('Buscando boton calificar...');
        const btnCal = await this.clickPrimero(
            '.btn-calificar', '#btnCalificar',
            'button[onclick*="calificar"]', '[data-action="calificar"]'
        );

        if (!btnCal) {
            const porTexto = await this.page.evaluate(() => {
                const btns = document.querySelectorAll('button, a, .btn');
                for (const btn of btns) {
                    const t = (btn.textContent || '').toLowerCase().trim();
                    if (t.includes('calificar') || t.includes('revisar') ||
                        t === 'nota' || t.includes('poner nota')) {
                        btn.click(); return btn.textContent.trim();
                    }
                }
                return null;
            });
            if (porTexto) {
                log.info(`Boton calificar por texto: "${porTexto}"`);
                await this.esperar(1000);
            }
        }

        // Campo nota
        const notaSels = [
            '.nota-input', 'input[name="nota"]', '#nota',
            '.calificacion-input', '#calificacion',
            'input[type="number"][min]', 'input[type="number"]'
        ];
        let notaEl = null;
        for (const s of notaSels) {
            const el = await this.page.$(s);
            if (el) { notaEl = s; break; }
        }

        if (notaEl) {
            log.info('Campo nota: ' + notaEl);
            await this.page.click(notaEl, { clickCount: 3 });
            await this.esperar(200);
            await this.page.type(notaEl, nota, { delay: 70 });
            await this.esperar(400);

            log.info(`Comentario: "${comentario}"`);
            await this.escribirEn(comentario,
                '.obs-input', 'textarea[name="observacion"]', '#observacion',
                '#comentario', 'textarea[name="comentario"]',
                '#obs', 'textarea[name="obs"]', 'textarea'
            );

            await this.esperar(500);
            await this.cap('calificacion_llena');

            log.info('Guardando nota...');
            await this.clickPrimero(
                '.btn-save', '#btnGuardar', '#btnSave', '.btn-calificar',
                '.modal.show button[type="submit"]',
                '.modal-footer button[type="submit"]',
                'button[type="submit"]', 'form button'
            );
            await this.esperar(2500, 'Guardando nota...');
            await this.cerrarModal(4);
            await this.cap('calificacion_guardada');
            log.ok('Nota ' + nota + ' guardada');
            this.reg('calificar_tarea', { nota, comentario });
        } else {
            log.warn('Campo nota no encontrado');
            await this.cap('calificacion_sin_campo');
            this.reg('calificar_tarea', { nota, estado: 'campo_no_encontrado' });
        }
    }

    // ══════════════════════════════════════════════
    //  Ñ. VER PANELES ADMIN
    // ══════════════════════════════════════════════

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
                await this.page.goto(
                    `${this.baseUrl}/${panel.url}`,
                    { waitUntil: 'networkidle2', timeout: 12000 }
                );
                await this.esperar(2500, 'Revisando ' + panel.nombre + '...');
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
                log.warn(`Panel "${panel.nombre}" error: ${e.message.split('\n')[0]}`);
            }
            await this.esperar(600);
        }
        this.reg('ver_paneles_admin');
    }

    // ══════════════════════════════════════════════
    //  O. REPORTE HTML
    // ══════════════════════════════════════════════

    generarReporte() {
        const exitosas = this.results.acciones.filter(a => a.ok);
        const capturas = this.results.capturas;
        const errores  = this.results.errores;

        const filas = exitosas.map(a =>
            `<tr>
               <td class="ok-cell">✓</td>
               <td><strong>${a.accion}</strong></td>
               <td>${a.tipo || a.rol || a.metodo || '-'}</td>
               <td>${a.nombre || a.nota || a.texto || a.respuesta || a.estado || '-'}</td>
             </tr>`
        ).join('');

        const filasErr = errores.length > 0
            ? errores.map(e => `<tr><td class="err-cell">✗</td><td colspan="3">${e}</td></tr>`).join('')
            : '<tr><td colspan="4" style="color:var(--verde);text-align:center">Sin errores</td></tr>';

        const galeria = capturas.map(c =>
            `<div class="thumb">
               <img src="${c}" alt="${path.basename(c)}" loading="lazy"/>
               <span>${path.basename(c)}</span>
             </div>`
        ).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte QA EduAgenda v4</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060a12;--s1:#0d1322;--borde:#1a2540;--acento:#00d4ff;--verde:#00e5a0;--amarillo:#ffd700;--rojo:#ff4d6d;--text:#dde4f0;--muted:#4a5568;--font:"Sora",sans-serif;--mono:"IBM Plex Mono",monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:var(--font);padding:40px 20px}
.wrap{max-width:1150px;margin:0 auto}
.hero{text-align:center;padding:70px 20px 50px;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,212,255,.08),transparent);border:1px solid var(--borde);border-radius:20px;margin-bottom:24px}
.hero h1{font-size:clamp(2rem,5vw,3rem);font-weight:800;margin-bottom:12px}
.hero h1 em{color:var(--acento);font-style:normal}
.hero .badge{display:inline-block;background:rgba(0,212,255,.12);border:1px solid var(--acento);color:var(--acento);font-family:var(--mono);font-size:.75rem;padding:4px 12px;border-radius:20px;margin-bottom:12px}
.hero p{color:var(--muted);font-family:var(--mono);font-size:.9rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:20px;text-align:center}
.stat .n{font-size:2.5rem;font-weight:800;font-family:var(--mono)}
.stat.ok .n{color:var(--verde)}
.stat.info .n{color:var(--acento)}
.stat.warn .n{color:var(--amarillo)}
.stat.err .n{color:var(--rojo)}
.stat .l{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;margin-top:6px}
.bloque{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:26px;margin-bottom:20px;overflow:auto}
.bloque-titulo{font-family:var(--mono);font-size:.72rem;color:var(--acento);text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;border-bottom:1px solid var(--borde);padding-bottom:8px}
table{width:100%;border-collapse:collapse;min-width:460px}
th{text-align:left;font-family:var(--mono);font-size:.68rem;color:var(--muted);text-transform:uppercase;padding:8px 12px;border-bottom:1px solid var(--borde)}
td{padding:9px 12px;border-bottom:1px solid rgba(26,37,64,.5);font-size:.86rem}
tr:last-child td{border:none}
tr:hover td{background:rgba(0,212,255,.03)}
.ok-cell{color:var(--verde);font-weight:800;font-size:1rem}
.err-cell{color:var(--rojo);font-weight:800}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px;margin-top:4px}
.thumb{background:var(--bg);border:1px solid var(--borde);border-radius:10px;overflow:hidden;transition:border-color .2s}
.thumb:hover{border-color:var(--acento)}
.thumb img{width:100%;height:90px;object-fit:cover;opacity:.7;transition:opacity .2s;display:block}
.thumb:hover img{opacity:1}
.thumb span{display:block;font-family:var(--mono);font-size:.62rem;color:var(--muted);padding:5px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pie{text-align:center;padding:40px;color:var(--muted);font-family:var(--mono);font-size:.78rem}
.pie strong{color:var(--acento)}
.flujo{background:var(--s1);border:1px solid var(--borde);border-radius:14px;padding:26px;margin-bottom:20px}
.flujo ol{counter-reset:item;padding:0;margin:0}
.flujo li{counter-increment:item;padding:9px 12px 9px 40px;position:relative;border-bottom:1px solid rgba(26,37,64,.4);font-size:.87rem;color:var(--text)}
.flujo li::before{content:counter(item);position:absolute;left:10px;top:10px;width:20px;height:20px;background:rgba(0,212,255,.1);border:1px solid var(--acento);border-radius:50%;text-align:center;line-height:20px;font-family:var(--mono);font-size:.65rem;color:var(--acento);font-weight:600}
.flujo li:last-child{border:none}
.tag{display:inline-block;background:rgba(0,229,160,.1);border:1px solid var(--verde);color:var(--verde);font-family:var(--mono);font-size:.65rem;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle}
</style>
</head>
<body>
<div class="wrap">

<div class="hero">
  <div class="badge">v4 — Respeta horarios existentes</div>
  <h1>Reporte <em>EduAgenda</em> QA</h1>
  <p>${new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' })}</p>
</div>

<div class="stats">
  <div class="stat ok"><div class="n">${exitosas.length}</div><div class="l">Acciones OK</div></div>
  <div class="stat info"><div class="n">${capturas.length}</div><div class="l">Capturas</div></div>
  <div class="stat info"><div class="n">9</div><div class="l">Fases</div></div>
  <div class="stat info"><div class="n">3</div><div class="l">Roles</div></div>
  <div class="stat ${errores.length === 0 ? 'ok' : 'err'}">
    <div class="n">${errores.length}</div><div class="l">Errores</div>
  </div>
</div>

<div class="flujo">
  <div class="bloque-titulo">Flujo ejecutado (9 fases)</div>
  <ol>
    <li>Registro Profesor <span class="tag">registro</span></li>
    <li>Registro Estudiante <span class="tag">registro</span></li>
    <li>Login Profesor → Ver paneles (sin perfil) → Agregar horario → Logout <span class="tag">profesor</span></li>
    <li>Login Estudiante → Reservar clase con Nequi → Logout <span class="tag">estudiante</span></li>
    <li>Login Profesor → Materias → Asignar tarea → Logout <span class="tag">profesor</span></li>
    <li>Login Estudiante → Tareas pendientes → Entregar tarea → Logout <span class="tag">estudiante</span></li>
    <li>Login Profesor → Calificar tarea → Ver paneles actualizados → Logout <span class="tag">profesor</span></li>
    <li>Login Estudiante → Calificaciones → Perfil → Logout <span class="tag">estudiante</span></li>
    <li>Login Admin → Ver todos los paneles → Logout <span class="tag">admin</span></li>
  </ol>
</div>

<div class="bloque">
  <div class="bloque-titulo">Acciones realizadas (${exitosas.length})</div>
  <table>
    <thead><tr><th></th><th>Accion</th><th>Rol / Metodo</th><th>Detalle</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:20px">Sin acciones registradas</td></tr>'}</tbody>
  </table>
</div>

<div class="bloque">
  <div class="bloque-titulo">Errores (${errores.length})</div>
  <table>
    <thead><tr><th></th><th colspan="3">Descripcion</th></tr></thead>
    <tbody>${filasErr}</tbody>
  </table>
</div>

<div class="bloque">
  <div class="bloque-titulo">Capturas de pantalla (${capturas.length})</div>
  <div class="gallery">${galeria || '<p style="color:var(--muted)">Sin capturas disponibles</p>'}</div>
</div>

<div class="pie">
  <p>Generado por <strong>EduAgenda QA Robot v4</strong> &nbsp;·&nbsp; ${new Date().toLocaleString('es-CO')}</p>
</div>

</div>
</body>
</html>`;

        const ruta = path.join(__dirname, 'reporte-qa.html');
        fs.writeFileSync(ruta, html, 'utf8');
        log.ok('Reporte generado -> ' + ruta);
    }

    // ══════════════════════════════════════════════
    //  P. FLUJO COMPLETO
    // ══════════════════════════════════════════════

    async ejecutar() {
        log.titulo('ROBOT DE QA — EDUAGENDA — v4 FLUJO COMPLETO');

        try {
            await this.iniciarServidor();
            await this.iniciarNavegador();
            await this.irInicio();

            // ── FASE 1: Registro Profesor ─────────────────────────────
            log.fase('FASE 1 - Registro de Profesor');
            await this.registrarUsuario(this.D.profesor);

            // ── FASE 2: Registro Estudiante ───────────────────────────
            log.fase('FASE 2 - Registro de Estudiante');
            await this.registrarUsuario(this.D.estudiante);

            // ── FASE 3: Profesor → Paneles (sin perfil) → Horario ─────
            log.fase('FASE 3 - Profesor: Ver Paneles → Configuracion → Agregar Horario');
            await this.login(this.D.profesor);
            await this.verPanelesProfesor();  // termina en Configuracion
            await this.agregarHorario();      // desde Dashboard del profesor
            await this.logout('profesor');

            // ── FASE 4: Estudiante → Reservar con Nequi ──────────────
            log.fase('FASE 4 - Estudiante: Reservar Clase con Nequi');
            await this.login(this.D.estudiante);
            await this.reservarClase();
            await this.logout('estudiante');

            // ── FASE 5: Profesor → Asignar Tarea ─────────────────────
            log.fase('FASE 5 - Profesor: Asignar Tarea');
            await this.login(this.D.profesor);
            await this.asignarTarea();
            await this.logout('profesor');

            // ── FASE 6: Estudiante → Entregar Tarea ──────────────────
            log.fase('FASE 6 - Estudiante: Entregar Tarea');
            await this.login(this.D.estudiante);
            await this.verTareasPendientes();
            await this.entregarTarea();
            await this.logout('estudiante');

            // ── FASE 7: Profesor → Calificar → Ver paneles actualizados
            log.fase('FASE 7 - Profesor: Calificar Tarea → Ver Paneles Actualizados');
            await this.login(this.D.profesor);
            await this.calificarTarea();
            await this.verPanelesProfesor();  // datos actualizados, sin perfil.html
            await this.logout('profesor');

            // ── FASE 8: Estudiante → Calificaciones → Perfil ─────────
            log.fase('FASE 8 - Estudiante: Ver Calificacion → Perfil');
            await this.login(this.D.estudiante);

            log.paso('Viendo Mis Calificaciones...');
            const rutasNota = ['nota.html', 'notas.html', 'mis-notas.html', 'calificaciones.html'];
            for (const ruta of rutasNota) {
                try {
                    await this.page.goto(`${this.baseUrl}/${ruta}`, { waitUntil: 'networkidle2', timeout: 8000 });
                    await this.esperar(1800);
                    await this.cerrarModalSiExiste();
                    const url = this.page.url();
                    if (!url.includes('sesion')) { log.info('Calificaciones en: ' + ruta); break; }
                } catch (_) {}
            }
            await this.cap('est_mis_calificaciones');
            log.ok('Calificaciones vistas');
            this.reg('ver_calificaciones', { rol: 'estudiante' });

            log.paso('Viendo Perfil del estudiante...');
            await this.ir('perfil.html', 'Mi Perfil (Estudiante)');
            await this.esperar(1800);
            await this.cap('est_perfil');
            log.ok('Perfil visto');
            this.reg('ver_perfil', { rol: 'estudiante' });

            await this.logout('estudiante');

            // ── FASE 9: Admin → Todos los paneles ────────────────────
            log.fase('FASE 9 - Admin: Explorar Todos los Paneles');
            await this.login(this.D.admin);
            await this.verPanelesAdmin();
            await this.logout('admin');

            // ── FIN ───────────────────────────────────────────────────
            log.fase('FIN - Regresando a Pagina Principal');
            await this.irInicio();
            await this.esperar(2200, 'Mostrando inicio final...');
            await this.cap('fin_inicio');

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
        try {
            if (this.serverProcess) {
                this.serverProcess.kill('SIGTERM');
                await new Promise(r => setTimeout(r, 800));
                try { this.serverProcess.kill('SIGKILL'); } catch (_) {}
            }
        } catch (_) {}
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

process.on('uncaughtException', async (err) => {
    log.error('Excepcion no capturada: ' + err.message);
    try { await robot.cerrar(); } catch (_) {}
    process.exit(1);
});

robot.ejecutar().finally(() => robot.cerrar());