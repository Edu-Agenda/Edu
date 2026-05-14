const sonarqubeScanner = require('sonarqube-scanner');
const path = require('path');
const fs = require('fs');

console.log('🔍 Iniciando análisis de SonarQube para EduAgenda...');

// 1. Verificación de seguridad: Reporte de cobertura
const lcovPath = path.join(__dirname, 'coverage', 'lcov.info');
if (fs.existsSync(lcovPath)) {
    console.log('✅ Reporte de cobertura encontrado:', lcovPath);
} else {
    console.log('⚠️ No se encontró el reporte de cobertura en: ' + lcovPath);
    console.log('👉 Ejecuta primero: npm run coverage');
    process.exit(1);
}

// 2. Ejecución del Escáner
sonarqubeScanner.scan(
    {
        serverUrl: 'http://localhost:9000',
        options: {
            // Autenticación y Identificación
            'sonar.token': 'sqp_d910b65c3a70c5408b7cd8a6754783643ac4486c',
            'sonar.projectKey': 'EduAgenda',
            'sonar.projectName': 'EduAgenda',
            'sonar.projectVersion': '1.0.0',

            // Configuración de rutas
            'sonar.sources': '.',
            'sonar.inclusions': 'server.js,db.js,authMiddleware.js',
            'sonar.exclusions': '**/node_modules/**, **/tests/**, **/coverage/**, **/screenshots/**, **/*.test.js, robot*.js, **/js/**, **/*.html, **/css/**, **/*.json',
            
            // Reportes de Cobertura
            'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
            'sonar.coverage.exclusions': '**/tests/**, **/node_modules/**, **/*.test.js, robot*.js',
            
            // Codificación
            'sonar.sourceEncoding': 'UTF-8'
        }
    },
    () => {
        console.log('\n✅ ¡Análisis de SonarQube completado con éxito!');
        console.log('📊 Revisa los resultados aquí: http://localhost:9000');
        process.exit(0);
    }
).catch((error) => {
    console.error('\n❌ Error crítico durante el análisis:', error);
    process.exit(1);
});