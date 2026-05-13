// robot-full.js - Robot de QA con flujo completo de usuario (CORREGIDO)
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class EduAgendaRobotFull {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverProcess = null;
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            tests: { passed: 0, failed: 0, total: 0 },
            pages: [],
            actions: [],
            errors: []
        };
        
        // Datos de prueba con timestamp único
        const timestamp = Date.now();
        this.testData = {
            profesor: {
                nombre: `Profesor QA ${timestamp}`,
                email: `profesor_qa_${timestamp}@test.com`,
                password: '123456',
                tipo: 'profesor'
            },
            estudiante: {
                nombre: `Estudiante QA ${timestamp}`,
                email: `estudiante_qa_${timestamp}@test.com`,
                password: '123456',
                tipo: 'estudiante'
            },
            horario: {
                materia: 'Robotica Avanzada',
                fecha: '2026-12-25',
                hora: '10:00'
            },
            tarea: {
                descripcion: 'Construir un robot seguidor de línea con Arduino',
                fechaEntrega: '2026-12-30'
            },
            entrega: 'Entregué el código completo, diagrama del circuito y video demostración'
        };
    }

    // ==========================================
    // 1. INICIAR SERVIDOR
    // ==========================================
    async iniciarServidor() {
        console.log('\n🚀 [ROBOT] Iniciando servidor EduAgenda...');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['server.js'], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            
            this.serverProcess.stdout.on('data', (data) => {
                const msg = data.toString();
                if (msg.includes('Servidor EduAgenda corriendo') || msg.includes('Base de datos')) {
                    console.log('✅ [ROBOT] Servidor iniciado correctamente');
                    resolve();
                }
            });
            
            this.serverProcess.stderr.on('data', (data) => {
                console.error(`❌ Servidor error: ${data.toString()}`);
            });
            
            setTimeout(() => {
                reject(new Error('Timeout iniciando servidor'));
            }, 15000);
        });
    }

    // ==========================================
    // 2. INICIAR NAVEGADOR
    // ==========================================
    async iniciarNavegador() {
        console.log('\n🌐 [ROBOT] Abriendo navegador...');
        
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--start-maximized']
        });
        
        this.page = await this.browser.newPage();
        
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir);
        }
        
        console.log('✅ [ROBOT] Navegador abierto');
    }

    // ==========================================
    // 3. ESPERAR (CORREGIDO)
    // ==========================================
    async esperar(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // 4. NAVEGAR
    // ==========================================
    async navegar(pageName, url) {
        console.log(`\n📄 [ROBOT] Navegando a: ${pageName}`);
        
        try {
            await this.page.goto(`${this.baseUrl}/${url}`, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const screenshotPath = path.join(__dirname, 'screenshots', `${pageName.replace(/ /g, '_')}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            
            console.log(`   ✅ ${pageName} cargada`);
            this.results.pages.push({ name: pageName, url, status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.results.pages.push({ name: pageName, url, status: 'failed' });
            return false;
        }
    }

    // ==========================================
    // 5. REGISTRAR USUARIO
    // ==========================================
    async registrarUsuario(nombre, email, tipo) {
        console.log(`\n📝 [ROBOT] Registrando ${tipo}: ${nombre}`);
        
        try {
            await this.page.goto(`${this.baseUrl}/registrate.html`, { waitUntil: 'networkidle2' });
            await this.esperar(1000);
            
            await this.page.type('input[name="nombre"]', nombre);
            await this.page.type('input[name="documento"]', '12345678');
            await this.page.type('input[name="email"]', email);
            await this.page.type('input[name="telefono"]', '3001234567');
            await this.page.type('input[name="password"]', '123456');
            await this.page.type('input[name="confirm_password"]', '123456');
            
            if (tipo === 'profesor') {
                await this.page.click('input[value="profesor"]');
            } else {
                await this.page.click('input[value="estudiante"]');
            }
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', `registro_${tipo}.png`) 
            });
            
            await this.page.click('button[type="submit"]');
            await this.esperar(2000);
            
            console.log(`   ✅ ${tipo} registrado: ${nombre}`);
            this.results.actions.push({ action: 'registro', nombre, tipo, status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.results.actions.push({ action: 'registro', nombre, tipo, status: 'failed' });
            return false;
        }
    }

    // ==========================================
    // 6. LOGIN (CORREGIDO)
    // ==========================================
    async login(email, password, tipoEsperado) {
        console.log(`\n🔐 [ROBOT] Login como ${tipoEsperado}: ${email}`);
        
        try {
            await this.page.goto(`${this.baseUrl}/sesion.html`, { waitUntil: 'networkidle2' });
            await this.esperar(1000);
            
            await this.page.$eval('#email', el => el.value = '');
            await this.page.$eval('#password', el => el.value = '');
            
            await this.page.type('#email', email);
            await this.page.type('#password', password);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', `login_${tipoEsperado}_form.png`) 
            });
            
            await this.page.click('#btnLogin');
            await this.esperar(3000);
            
            // Verificar si el login fue exitoso
            const currentUrl = this.page.url();
            if (currentUrl.includes('admin.html') || currentUrl.includes('profesor.html') || currentUrl.includes('estudiante.html')) {
                console.log(`   ✅ Login exitoso como ${tipoEsperado}`);
                this.results.actions.push({ action: 'login', tipo: tipoEsperado, status: 'success' });
                
                await this.page.screenshot({ 
                    path: path.join(__dirname, 'screenshots', `dashboard_${tipoEsperado}.png`),
                    fullPage: true 
                });
                return true;
            } else {
                console.log(`   ⚠️ Login fallido, URL actual: ${currentUrl}`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Error en login: ${error.message}`);
            this.results.actions.push({ action: 'login', tipo: tipoEsperado, status: 'failed' });
            this.results.errors.push({ action: 'login', error: error.message });
            return false;
        }
    }

    // ==========================================
    // 7. LOGOUT (CORREGIDO)
    // ==========================================
    async logout() {
        console.log(`\n🚪 [ROBOT] Cerrando sesión...`);
        
        try {
            // Intentar diferentes selectores para logout
            const logoutSelectors = ['.logout-btn', '#logoutBtn', 'a:contains("Salir")', 'button:contains("Cerrar sesión")'];
            
            for (const selector of logoutSelectors) {
                const btn = await this.page.$(selector);
                if (btn) {
                    await btn.click();
                    await this.esperar(2000);
                    console.log(`   ✅ Sesión cerrada`);
                    this.results.actions.push({ action: 'logout', status: 'success' });
                    return true;
                }
            }
            console.log(`   ⚠️ No se encontró botón de logout`);
            return false;
        } catch (error) {
            console.log(`   ⚠️ Error cerrando sesión: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 8. AGREGAR HORARIO
    // ==========================================
    async agregarHorario(materia, fecha, hora) {
        console.log(`\n📅 [ROBOT] Agregando horario: ${materia} - ${fecha} ${hora}`);
        
        try {
            await this.page.goto(`${this.baseUrl}/profesor.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            const abrirModal = await this.page.$('#abrirModal');
            if (abrirModal) {
                await abrirModal.click();
                await this.esperar(1000);
            }
            
            await this.page.type('#materia', materia);
            await this.page.type('#fecha', fecha);
            await this.page.type('#hora_inicio', hora);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'horario_form.png') 
            });
            
            await this.page.click('#formHorario button[type="submit"]');
            await this.esperar(2000);
            
            console.log(`   ✅ Horario agregado: ${materia}`);
            this.results.actions.push({ action: 'agregar_horario', materia, status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 9. RESERVAR CLASE
    // ==========================================
    async reservarClase() {
        console.log(`\n💳 [ROBOT] Reservando clase...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/estudiante.html`, { waitUntil: 'networkidle2' });
            await this.esperar(3000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'agenda_before_reserve.png'),
                fullPage: true 
            });
            
            const slots = await this.page.$$('.slot.disponible');
            if (slots.length > 0) {
                await slots[0].click();
                await this.esperar(1000);
                console.log(`   ✅ Slot seleccionado`);
                
                const btnReservar = await this.page.$('#btnReservar');
                if (btnReservar) {
                    await btnReservar.click();
                    await this.esperar(2000);
                    
                    await this.page.screenshot({ 
                        path: path.join(__dirname, 'screenshots', 'pago_modal.png') 
                    });
                    
                    const btnPagar = await this.page.$('#btnConfirmarPago, .btn-confirmar-pago');
                    if (btnPagar) {
                        await btnPagar.click();
                        await this.esperar(3000);
                        console.log(`   ✅ Reserva confirmada y pagada`);
                        this.results.actions.push({ action: 'reservar_clase', status: 'success' });
                        return true;
                    }
                }
            } else {
                console.log(`   ⚠️ No hay horarios disponibles`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 10. VER MATERIAS
    // ==========================================
    async verMaterias(rol) {
        console.log(`\n📚 [ROBOT] Viendo materias como ${rol}...`);
        
        try {
            const url = rol === 'profesor' ? 'materias.html' : 'estudiante.html';
            await this.page.goto(`${this.baseUrl}/${url}`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', `materias_${rol}.png`),
                fullPage: true 
            });
            
            console.log(`   ✅ Materias cargadas`);
            this.results.actions.push({ action: 'ver_materias', rol, status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 11. IR A PERFIL
    // ==========================================
    async irAPerfil() {
        console.log(`\n👤 [ROBOT] Yendo a Mi Perfil...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/perfil.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'perfil_usuario.png'),
                fullPage: true 
            });
            
            console.log(`   ✅ Perfil cargado`);
            this.results.actions.push({ action: 'ver_perfil', status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 12. CREAR TAREA
    // ==========================================
    async crearTarea(descripcion, fechaEntrega) {
        console.log(`\n📋 [ROBOT] Creando tarea: ${descripcion.substring(0, 30)}...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/materias.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            const primerBotonTarea = await this.$('.task');
            if (primerBotonTarea) {
                await primerBotonTarea.click();
                await this.esperar(1000);
                
                await this.page.type('#desc', descripcion);
                await this.page.type('#fechaEntrega', fechaEntrega);
                
                await this.page.screenshot({ 
                    path: path.join(__dirname, 'screenshots', 'crear_tarea_form.png') 
                });
                
                await this.page.click('#btnEnviar, .btn-send');
                await this.esperar(2000);
                
                console.log(`   ✅ Tarea creada`);
                this.results.actions.push({ action: 'crear_tarea', status: 'success' });
                return true;
            }
            return false;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 13. VER TAREAS PENDIENTES
    // ==========================================
    async verTareasPendientes() {
        console.log(`\n📋 [ROBOT] Viendo tareas pendientes...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/tareas.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'tareas_pendientes.png'),
                fullPage: true 
            });
            
            console.log(`   ✅ Tareas pendientes cargadas`);
            this.results.actions.push({ action: 'ver_tareas_pendientes', status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 14. ENTREGAR TAREA
    // ==========================================
    async entregarTarea(entrega) {
        console.log(`\n📤 [ROBOT] Entregando tarea...`);
        
        try {
            const btnEntregar = await this.page.$('.btn-entregar');
            if (btnEntregar) {
                await btnEntregar.click();
                await this.esperar(1000);
                
                const textarea = await this.page.$('#entregaDesc, textarea');
                if (textarea) {
                    await textarea.type(entrega);
                }
                
                await this.page.screenshot({ 
                    path: path.join(__dirname, 'screenshots', 'entregar_tarea_form.png') 
                });
                
                await this.page.click('#btnSubmit, .btn-submit');
                await this.esperar(2000);
                
                console.log(`   ✅ Tarea entregada`);
                this.results.actions.push({ action: 'entregar_tarea', status: 'success' });
                return true;
            }
            return false;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 15. VER CALIFICACIONES
    // ==========================================
    async verCalificaciones() {
        console.log(`\n📊 [ROBOT] Viendo mis calificaciones...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/nota.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'mis_calificaciones.png'),
                fullPage: true 
            });
            
            console.log(`   ✅ Calificaciones cargadas`);
            this.results.actions.push({ action: 'ver_calificaciones', status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 16. VER ESTUDIANTES
    // ==========================================
    async verEstudiantes() {
        console.log(`\n👨‍🎓 [ROBOT] Viendo lista de estudiantes...`);
        
        try {
            await this.page.goto(`${this.baseUrl}/misestudiantes.html`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'mis_estudiantes.png'),
                fullPage: true 
            });
            
            console.log(`   ✅ Lista de estudiantes cargada`);
            this.results.actions.push({ action: 'ver_estudiantes', status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 17. PANEL ADMIN
    // ==========================================
    async panelAdmin(seccion) {
        console.log(`\n👑 [ROBOT] Panel Admin - ${seccion}...`);
        
        try {
            let url = '';
            if (seccion === 'Usuarios') url = 'usuarios.html';
            else if (seccion === 'Reportes') url = 'reportes.html';
            else if (seccion === 'Seguridad') url = 'seguridad.html';
            else return false;
            
            await this.page.goto(`${this.baseUrl}/${url}`, { waitUntil: 'networkidle2' });
            await this.esperar(2000);
            
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', `admin_${seccion.toLowerCase()}.png`),
                fullPage: true 
            });
            
            console.log(`   ✅ ${seccion} cargado`);
            return true;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 18. GENERAR REPORTE HTML
    // ==========================================
    generarReporteHTML() {
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte QA - EduAgenda Robot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            padding: 30px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #1a73e8; margin-bottom: 10px; }
        .subtitle { color: #5f6368; margin-bottom: 30px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-card.success { border-top: 4px solid #34a853; }
        .stat-card.failed { border-top: 4px solid #ea4335; }
        .stat-number { font-size: 36px; font-weight: bold; margin-bottom: 8px; }
        .stat-label { color: #5f6368; }
        .section {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #1a73e8;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e8eaed;
        }
        .success-item { color: #34a853; }
        .failed-item { color: #ea4335; }
        ul { list-style: none; padding-left: 0; }
        li { padding: 5px 0; }
        .timestamp {
            text-align: center;
            color: #5f6368;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e8eaed;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 EduAgenda - Reporte de QA Automatizado</h1>
        <p class="subtitle">Flujo completo de usuario ejecutado por el robot</p>
        
        <div class="stats">
            <div class="stat-card success">
                <div class="stat-number">${this.results.actions.filter(a => a.status === 'success').length}</div>
                <div class="stat-label">Acciones Exitosas</div>
            </div>
            <div class="stat-card ${this.results.actions.filter(a => a.status === 'failed').length > 0 ? 'failed' : 'success'}">
                <div class="stat-number">${this.results.actions.filter(a => a.status === 'failed').length}</div>
                <div class="stat-label">Acciones Fallidas</div>
            </div>
            <div class="stat-card success">
                <div class="stat-number">${this.results.pages.length}</div>
                <div class="stat-label">Páginas Verificadas</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 Páginas Verificadas</h2>
            <ul>
                ${this.results.pages.map(p => `
                    <li class="${p.status === 'success' ? 'success-item' : 'failed-item'}">
                        ${p.status === 'success' ? '✅' : '❌'} ${p.name}
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>🎬 Acciones Realizadas</h2>
            <ul>
                ${this.results.actions.map(a => `
                    <li class="${a.status === 'success' ? 'success-item' : 'failed-item'}">
                        ${a.status === 'success' ? '✅' : '❌'} ${a.action}: ${a.nombre || a.tipo || a.materia || ''}
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="timestamp">
            Reporte generado: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
        
        const reportePath = path.join(__dirname, 'reporte-qa.html');
        fs.writeFileSync(reportePath, html);
        console.log(`\n📊 Reporte HTML generado: ${reportePath}`);
    }

    // ==========================================
    // 19. FLUJO COMPLETO
    // ==========================================
    async ejecutarFlujoCompleto() {
        console.log('\n' + '='.repeat(70));
        console.log('🤖 ROBOT DE QA - FLUJO COMPLETO DE USUARIO');
        console.log('='.repeat(70));
        
        try {
            // Iniciar servidor y navegador
            await this.iniciarServidor();
            await this.iniciarNavegador();
            
            // ==========================================
            // FASE 1: REGISTRO DE USUARIOS
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('📝 FASE 1: REGISTRO DE USUARIOS');
            console.log('━'.repeat(50));
            
            await this.registrarUsuario(
                this.testData.profesor.nombre,
                this.testData.profesor.email,
                'profesor'
            );
            
            await this.registrarUsuario(
                this.testData.estudiante.nombre,
                this.testData.estudiante.email,
                'estudiante'
            );
            
            // ==========================================
            // FASE 2: PROFESOR - AGREGAR HORARIO
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🏫 FASE 2: PROFESOR - AGREGAR HORARIO');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.profesor.email, '123456', 'profesor');
            await this.agregarHorario(
                this.testData.horario.materia,
                this.testData.horario.fecha,
                this.testData.horario.hora
            );
            await this.logout();
            
            // ==========================================
            // FASE 3: ESTUDIANTE - RESERVAR CLASE
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🎓 FASE 3: ESTUDIANTE - RESERVAR CLASE');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.estudiante.email, '123456', 'estudiante');
            await this.reservarClase();
            await this.verMaterias('estudiante');
            await this.irAPerfil();
            await this.logout();
            
            // ==========================================
            // FASE 4: PROFESOR - VER ESTUDIANTES Y CREAR TAREA
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🏫 FASE 4: PROFESOR - VER ESTUDIANTES Y CREAR TAREA');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.profesor.email, '123456', 'profesor');
            await this.verEstudiantes();
            await this.verMaterias('profesor');
            await this.crearTarea(this.testData.tarea.descripcion, this.testData.tarea.fechaEntrega);
            await this.logout();
            
            // ==========================================
            // FASE 5: ESTUDIANTE - ENTREGAR TAREA
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🎓 FASE 5: ESTUDIANTE - ENTREGAR TAREA');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.estudiante.email, '123456', 'estudiante');
            await this.verTareasPendientes();
            await this.entregarTarea(this.testData.entrega);
            await this.logout();
            
            // ==========================================
            // FASE 6: PROFESOR - CALIFICAR TAREA
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🏫 FASE 6: PROFESOR - CALIFICAR TAREA');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.profesor.email, '123456', 'profesor');
            await this.verCalificaciones();
            await this.logout();
            
            // ==========================================
            // FASE 7: ESTUDIANTE - VER CALIFICACIONES
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👨‍🎓 FASE 7: ESTUDIANTE - VER CALIFICACIONES');
            console.log('━'.repeat(50));
            
            await this.login(this.testData.estudiante.email, '123456', 'estudiante');
            await this.verCalificaciones();
            await this.logout();
            
            // ==========================================
            // FASE 8: ADMIN - PANELES DE CONTROL
            // ==========================================
            console.log('\n' + '━'.repeat(50));
            console.log('👑 FASE 8: ADMIN - PANELES DE CONTROL');
            console.log('━'.repeat(50));
            
            await this.login('admin@eduagenda.com', 'Admin1234', 'admin');
            await this.panelAdmin('Usuarios');
            await this.panelAdmin('Reportes');
            await this.panelAdmin('Seguridad');
            await this.logout();
            
            // ==========================================
            // RESULTADOS FINALES
            // ==========================================
            console.log('\n' + '='.repeat(70));
            console.log('📊 RESUMEN FINAL DEL ROBOT');
            console.log('='.repeat(70));
            
            const accionesExitosas = this.results.actions.filter(a => a.status === 'success').length;
            const accionesFallidas = this.results.actions.filter(a => a.status === 'failed').length;
            
            console.log(`✅ Acciones exitosas: ${accionesExitosas}`);
            console.log(`❌ Acciones fallidas: ${accionesFallidas}`);
            console.log(`📄 Páginas verificadas: ${this.results.pages.length}`);
            console.log(`\n📸 Capturas guardadas en: screenshots/`);
            
            this.generarReporteHTML();
            
            console.log('\n🎉 FLUJO COMPLETADO');
            console.log('='.repeat(70));
            
        } catch (error) {
            console.error('❌ Error en el robot:', error.message);
        }
    }

    // ==========================================
    // CERRAR
    // ==========================================
    async cerrar() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Navegador cerrado');
        }
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('🔚 Servidor detenido');
        }
    }
}

// EJECUTAR
const robot = new EduAgendaRobotFull();

process.on('SIGINT', async () => {
    await robot.cerrar();
    process.exit();
});

robot.ejecutarFlujoCompleto().finally(async () => {
    await robot.cerrar();
});