// sonar-scanner.js - Escáner para SonarQube
const scanner = require('sonarqube-scanner');
const path = require('path');
const fs = require('fs');

console.log('🔍 Iniciando análisis de SonarQube para EduAgenda...');
console.log('📁 Directorio:', __dirname);

// Verificar que existe el archivo de cobertura
const lcovPath = path.join(__dirname, 'coverage', 'lcov.info');
if (fs.existsSync(lcovPath)) {
    console.log('✅ Reporte de cobertura encontrado:', lcovPath);
} else {
    console.log('⚠️ No se encontró el reporte de cobertura. Ejecuta primero: npm run coverage');
    process.exit(1);
}

scanner(
    {
        serverUrl: 'http://localhost:9000',
        options: {
            'sonar.projectKey': 'EduAgenda',
            'sonar.projectName': 'EduAgenda',
            'sonar.projectVersion': '1.0.0',
            'sonar.sources': '.',
            'sonar.exclusions': '**/node_modules/**, **/tests/**, **/coverage/**, **/screenshots/**, **/*.test.js, robot*.js, **/js/**, **/*.html, **/css/**, **/*.json',
            'sonar.inclusions': 'server.js,db.js,authMiddleware.js',
            'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
            'sonar.sourceEncoding': 'UTF-8'
        }
    },
    () => {
        console.log('✅ Análisis de SonarQube completado');
        console.log('📊 Ver resultados en: http://localhost:9000');
        console.log('🔑 Proyecto: EduAgenda');
    },
    (error) => {
        console.error('❌ Error en análisis de SonarQube:', error);
        console.log('\n⚠️ Asegúrate de:');
        console.log('   1. SonarQube está corriendo: docker start sonarqube');
        console.log('   2. O ejecuta: docker run -d --name sonarqube -p 9000:9000 sonarqube:latest');
        console.log('   3. El servidor está en http://localhost:9000');
    }
);