// robot-full.js - Robot de QA con pruebas de interfaz gráfica
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class EduAgendaRobotFull {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverProcess = null;
        this.results = {
            tests: { passed: 0, failed: 0, total: 0 },
            pages: [],
            actions: [],
            errors: []
        };
        this.baseUrl = 'http://localhost:3000';
    }

    // ==========================================
    // 1. INICIAR SERVIDOR
    // ==========================================
    async iniciarServidor() {
        console.log('\n🚀 [ROBOT] Iniciando servidor EduAgenda...');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = require('child_process').spawn('node', ['server.js'], {
                env: { ...process.env, NODE_ENV: 'development' },
                stdio: 'pipe'
            });
            
            this.serverProcess.stdout.on('data', (data) => {
                const msg = data.toString();
                console.log(`📡 ${msg.trim()}`);
                if (msg.includes('Servidor EduAgenda corriendo')) {
                    console.log('✅ [ROBOT] Servidor iniciado correctamente');
                    resolve();
                }
            });
            
            this.serverProcess.stderr.on('data', (data) => {
                console.error(`❌ ${data.toString()}`);
            });
            
            setTimeout(() => {
                reject(new Error('Timeout iniciando servidor'));
            }, 10000);
        });
    }

    // ==========================================
    // 2. INICIAR NAVEGADOR
    // ==========================================
    async iniciarNavegador() {
        console.log('\n🌐 [ROBOT] Abriendo navegador...');
        
        this.browser = await puppeteer.launch({
            headless: false, // false = muestra la ventana
            defaultViewport: { width: 1280, height: 720 },
            args: ['--start-maximized']
        });
        
        this.page = await this.browser.newPage();
        console.log('✅ [ROBOT] Navegador abierto');
    }

    // ==========================================
    // 3. NAVEGAR A UNA PÁGINA
    // ==========================================
    async navegar(pageName, url) {
        console.log(`\n📄 [ROBOT] Navegando a: ${pageName}`);
        
        try {
            await this.page.goto(`${this.baseUrl}/${url}`, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            // Tomar screenshot
            const screenshotDir = path.join(__dirname, 'screenshots');
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir);
            }
            const screenshotPath = path.join(screenshotDir, `${pageName}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            
            console.log(`   ✅ Página cargada: ${pageName}`);
            console.log(`   📸 Screenshot guardado: screenshots/${pageName}.png`);
            
            this.results.pages.push({ name: pageName, url, status: 'success' });
            return true;
        } catch (error) {
            console.log(`   ❌ Error cargando ${pageName}: ${error.message}`);
            this.results.pages.push({ name: pageName, url, status: 'failed' });
            this.results.errors.push({ page: pageName, error: error.message });
            return false;
        }
    }

    // ==========================================
    // 4. LLENAR FORMULARIO DE LOGIN
    // ==========================================
    async hacerLogin(email, password, tipoEsperado) {
        console.log(`\n🔐 [ROBOT] Iniciando sesión como ${tipoEsperado}...`);
        
        try {
            // Esperar que los campos estén disponibles
            await this.page.waitForSelector('#email', { timeout: 5000 });
            await this.page.waitForSelector('#password', { timeout: 5000 });
            
            // Limpiar y llenar campos
            await this.page.$eval('#email', el => el.value = '');
            await this.page.$eval('#password', el => el.value = '');
            
            await this.page.type('#email', email);
            await this.page.type('#password', password);
            
            // Tomar screenshot antes de enviar
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'login-form.png') 
            });
            
            // Hacer clic en el botón de login
            await this.page.click('#btnLogin, button[type="submit"]');
            
            // Esperar redirección
            await this.page.waitForNavigation({ timeout: 5000 });
            
            // Verificar que estamos en la página correcta
            const url = this.page.url();
            if (url.includes(`${tipoEsperado}.html`)) {
                console.log(`   ✅ Login exitoso como ${tipoEsperado}`);
                await this.page.screenshot({ 
                    path: path.join(__dirname, 'screenshots', `dashboard-${tipoEsperado}.png`),
                    fullPage: true 
                });
                this.results.actions.push({ action: 'login', tipo: tipoEsperado, status: 'success' });
                return true;
            } else {
                console.log(`   ⚠️ Redirigido a: ${url}`);
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
    // 5. REGISTRAR NUEVO USUARIO
    // ==========================================
    async registrarUsuario(nombre, email, tipo) {
        console.log(`\n📝 [ROBOT] Registrando ${tipo}: ${nombre}`);
        
        try {
            // Navegar a registro
            await this.page.goto(`${this.baseUrl}/registrate.html`, { waitUntil: 'networkidle2' });
            
            // Llenar formulario
            await this.page.type('input[name="nombre"]', nombre);
            await this.page.type('input[name="documento"]', '12345678');
            await this.page.type('input[name="email"]', email);
            await this.page.type('input[name="telefono"]', '3001234567');
            await this.page.type('input[name="password"]', '123456');
            await this.page.type('input[name="confirm_password"]', '123456');
            
            // Seleccionar tipo
            if (tipo === 'profesor') {
                await this.page.click('input[value="profesor"]');
            } else {
                await this.page.click('input[value="estudiante"]');
            }
            
            // Tomar screenshot
            await this.page.screenshot({ 
                path: path.join(__dirname, 'screenshots', 'registro-form.png') 
            });
            
            // Enviar formulario
            await this.page.click('button[type="submit"]');
            
            // Esperar respuesta
            await this.page.waitForTimeout(2000);
            
            // Verificar mensaje de éxito
            const pageContent = await this.page.content();
            if (pageContent.includes('exitosamente') || pageContent.includes('Cuenta creada')) {
                console.log(`   ✅ ${tipo} registrado exitosamente`);
                this.results.actions.push({ action: 'registro', nombre, tipo, status: 'success' });
                return true;
            } else {
                console.log(`   ⚠️ Registro puede haber fallado`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Error en registro: ${error.message}`);
            this.results.actions.push({ action: 'registro', nombre, tipo, status: 'failed' });
            return false;
        }
    }

    // ==========================================
    // 6. VERIFICAR ELEMENTOS EN PÁGINA
    // ==========================================
    async verificarElementos(pagina, elementos) {
        console.log(`\n🔍 [ROBOT] Verificando elementos en ${pagina}...`);
        
        let todosOK = true;
        for (const elemento of elementos) {
            try {
                await this.page.waitForSelector(elemento, { timeout: 3000 });
                console.log(`   ✅ Elemento encontrado: ${elemento}`);
            } catch (error) {
                console.log(`   ❌ Elemento NO encontrado: ${elemento}`);
                todosOK = false;
                this.results.errors.push({ page: pagina, element: elemento, error: 'No encontrado' });
            }
        }
        
        return todosOK;
    }

    // ==========================================
    // 7. INTERACTUAR CON AGENDA (ESTUDIANTE)
    // ==========================================
    async interactuarConAgenda() {
        console.log(`\n📅 [ROBOT] Interactuando con la agenda...`);
        
        try {
            // Navegar a agenda si es necesario
            const currentUrl = this.page.url();
            if (!currentUrl.includes('estudiante.html')) {
                await this.page.goto(`${this.baseUrl}/estudiante.html`, { waitUntil: 'networkidle2' });
            }
            
            // Esperar que cargue la agenda
            await this.page.waitForTimeout(3000);
            
            // Buscar slots disponibles
            const slotsDisponibles = await this.page.$$('.slot.disponible');
            console.log(`   📊 Slots disponibles encontrados: ${slotsDisponibles.length}`);
            
            if (slotsDisponibles.length > 0) {
                // Hacer clic en el primer slot disponible
                await slotsDisponibles[0].click();
                console.log(`   ✅ Slot seleccionado`);
                
                await this.page.screenshot({ 
                    path: path.join(__dirname, 'screenshots', 'slot-seleccionado.png') 
                });
                
                this.results.actions.push({ action: 'seleccionar_slot', status: 'success' });
            } else {
                console.log(`   ⚠️ No hay slots disponibles`);
            }
            
            return true;
        } catch (error) {
            console.log(`   ❌ Error interactuando con agenda: ${error.message}`);
            return false;
        }
    }

    // ==========================================
    // 8. GENERAR REPORTE HTML
    // ==========================================
    generarReporteHTML() {
        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de QA - EduAgenda Robot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .stat-card.success { border-top: 4px solid #27ae60; }
        .stat-card.failed { border-top: 4px solid #e74c3c; }
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .stat-label { color: #7f8c8d; }
        .section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .success-item { color: #27ae60; }
        .failed-item { color: #e74c3c; }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .screenshot-card {
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot-card img {
            width: 100%;
            height: auto;
        }
        .screenshot-card p {
            padding: 10px;
            text-align: center;
            background: white;
        }
        .timestamp {
            text-align: center;
            color: #95a5a6;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 EduAgenda - Reporte de QA Automatizado</h1>
        <p class="subtitle">Pruebas realizadas por el robot de calidad</p>
        
        <div class="stats">
            <div class="stat-card success">
                <div class="stat-number">${this.results.tests.passed}</div>
                <div class="stat-label">Pruebas Pasadas</div>
            </div>
            <div class="stat-card ${this.results.tests.failed > 0 ? 'failed' : 'success'}">
                <div class="stat-number">${this.results.tests.failed}</div>
                <div class="stat-label">Pruebas Fallidas</div>
            </div>
            <div class="stat-card success">
                <div class="stat-number">${this.results.pages.length}</div>
                <div class="stat-label">Páginas Verificadas</div>
            </div>
            <div class="stat-card ${this.results.errors.length > 0 ? 'failed' : 'success'}">
                <div class="stat-number">${this.results.errors.length}</div>
                <div class="stat-label">Errores Encontrados</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 Páginas Verificadas</h2>
            <ul>
                ${this.results.pages.map(p => `
                    <li class="${p.status === 'success' ? 'success-item' : 'failed-item'}">
                        ${p.status === 'success' ? '✅' : '❌'} ${p.name} - ${p.url}
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>🎬 Acciones Realizadas</h2>
            <ul>
                ${this.results.actions.map(a => `
                    <li class="${a.status === 'success' ? 'success-item' : 'failed-item'}">
                        ${a.status === 'success' ? '✅' : '❌'} ${a.action}: ${a.nombre || a.tipo || ''}
                    </li>
                `).join('')}
            </ul>
        </div>
        
        ${this.results.errors.length > 0 ? `
        <div class="section">
            <h2>⚠️ Errores Detectados</h2>
            <ul>
                ${this.results.errors.map(e => `
                    <li class="failed-item">❌ ${e.page || e.action}: ${e.error}</li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="section">
            <h2>📸 Capturas de Pantalla</h2>
            <div class="screenshots">
                <div class="screenshot-card">
                    <img src="screenshots/login-form.png" alt="Login" onerror="this.src='https://via.placeholder.com/300x200?text=No+screenshot'">
                    <p>Formulario de Login</p>
                </div>
                <div class="screenshot-card">
                    <img src="screenshots/registro-form.png" alt="Registro" onerror="this.src='https://via.placeholder.com/300x200?text=No+screenshot'">
                    <p>Formulario de Registro</p>
                </div>
                <div class="screenshot-card">
                    <img src="screenshots/dashboard-admin.png" alt="Admin" onerror="this.src='https://via.placeholder.com/300x200?text=No+screenshot'">
                    <p>Panel de Administrador</p>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            Reporte generado: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
        `;
        
        const reportePath = path.join(__dirname, 'reporte-qa.html');
        fs.writeFileSync(reportePath, html);
        console.log(`\n📊 Reporte HTML generado: ${reportePath}`);
    }

    // ==========================================
    // 9. FLUJO COMPLETO
    // ==========================================
    async ejecutarFlujoCompleto() {
        console.log('\n' + '='.repeat(60));
        console.log('🤖 ROBOT DE QA CON PRUEBAS DE INTERFAZ');
        console.log('='.repeat(60));
        
        try {
            // Iniciar servidor
            await this.iniciarServidor();
            
            // Iniciar navegador
            await this.iniciarNavegador();
            
            // ==================================
            // PRUEBAS DE PÁGINAS PÚBLICAS
            // ==================================
            console.log('\n📋 [ROBOT] Verificando páginas públicas...');
            
            await this.navegar('Inicio', 'main.html');
            await this.navegar('Login', 'sesion.html');
            await this.navegar('Registro', 'registrate.html');
            
            // Verificar elementos en página de registro
            await this.verificarElementos('registrate.html', [
                'input[name="nombre"]',
                'input[name="email"]',
                'input[name="password"]',
                'button[type="submit"]'
            ]);
            
            // ==================================
            // PRUEBAS DE LOGIN
            // ==================================
            console.log('\n📋 [ROBOT] Probando diferentes tipos de login...');
            
            // Login como Admin
            await this.navegar('Login', 'sesion.html');
            await this.hacerLogin('admin@eduagenda.com', 'Admin1234', 'admin');
            
            // Verificar panel de admin
            await this.verificarElementos('admin.html', [
                '.card.usuarios',
                '.card.reportes',
                '.card.configuracion',
                '.logout-btn'
            ]);
            
            // Login como Estudiante
            await this.navegar('Login', 'sesion.html');
            await this.hacerLogin('estudiante@test.com', '123456', 'estudiante');
            
            // Interactuar con agenda
            await this.interactuarConAgenda();
            
            // ==================================
            // PRUEBAS DE REGISTRO
            // ==================================
            console.log('\n📋 [ROBOT] Probando registro de nuevos usuarios...');
            
            // Registrar nuevo estudiante
            const timestamp = Date.now();
            await this.registrarUsuario(
                `Robot Test ${timestamp}`,
                `robot${timestamp}@test.com`,
                'estudiante'
            );
            
            // ==================================
            // PRUEBAS DE PÁGINAS DEL PROFESOR
            // ==================================
            await this.navegar('Login', 'sesion.html');
            await this.hacerLogin('profesor@test.com', '123456', 'profesor');
            
            await this.navegar('Materias Profesor', 'materias.html');
            await this.navegar('Calificaciones', 'calificaciones.html');
            await this.navegar('Agenda Profesor', 'agenda.html');
            
            // ==================================
            // GENERAR REPORTE
            // ==================================
            this.generarReporteHTML();
            
            // Contar resultados
            this.results.tests.passed = this.results.pages.filter(p => p.status === 'success').length;
            this.results.tests.failed = this.results.pages.filter(p => p.status === 'failed').length;
            this.results.tests.total = this.results.pages.length;
            
            // Mostrar resumen final
            console.log('\n' + '='.repeat(60));
            console.log('📊 RESUMEN FINAL DEL ROBOT');
            console.log('='.repeat(60));
            console.log(`✅ Páginas exitosas: ${this.results.tests.passed}`);
            console.log(`❌ Páginas fallidas: ${this.results.tests.failed}`);
            console.log(`🎬 Acciones realizadas: ${this.results.actions.length}`);
            console.log(`⚠️ Errores: ${this.results.errors.length}`);
            console.log(`\n📸 Capturas guardadas en: screenshots/`);
            console.log(`📊 Reporte HTML: reporte-qa.html`);
            console.log('='.repeat(60));
            
        } catch (error) {
            console.error('❌ Error en el robot:', error.message);
        }
    }

    // ==========================================
    // CERRAR TODO
    // ==========================================
    async cerrar() {
        if (this.browser) {
            await this.browser.close();
        }
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
        console.log('\n🔚 [ROBOT] Robot finalizado');
    }
}

// ==========================================
// EJECUTAR
// ==========================================
const robot = new EduAgendaRobotFull();

process.on('SIGINT', async () => {
    await robot.cerrar();
    process.exit();
});

robot.ejecutarFlujoCompleto().finally(() => {
    setTimeout(() => robot.cerrar(), 3000);
});