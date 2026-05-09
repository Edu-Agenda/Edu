/**
 * Lógica para el Panel del Profesor
 */
function navegar(url) {
    window.location.href = url;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seguridad y Carga de Datos
    const token = localStorage.getItem('token');
    const tipo = localStorage.getItem('tipo');
    const nombre = localStorage.getItem('nombre');

    if (!token || tipo !== 'profesor') {
        window.location.href = 'sesion.html';
        return;
    }

    // Mostrar nombre en el panel
    const welcomeMsg = document.querySelector('p'); // "Bienvenido, xcxv..."
    if (welcomeMsg && nombre) {
        welcomeMsg.innerText = `Bienvenido, ${nombre}`;
    }

    // 2. Mapeo de Redirecciones por Tarjeta
    const cards = {
        'Mi agenda': 'agenda.html',
        'Solicitudes': 'solicitudes.html',
        'Estudiantes': 'estudiantes_prof.html',
        'Ingresos': 'ingresos.html',
        'Materias': 'materias_prof.html',
        'Calificaciones': 'calificaciones.html', // <--- LA QUE CREAMOS ARRIBA
        'Configuración': 'configuracion_prof.html'
    };

    // Buscamos todos los contenedores de tarjetas
    const allCards = document.querySelectorAll('.card, .card-container'); // Ajusta según tu clase real

    // Si tus tarjetas no tienen una clase única, podemos buscar por el texto dentro:
    const cardElements = document.querySelectorAll('div[class*="card"]'); 
    
    cardElements.forEach(card => {
        const title = card.querySelector('span, p, h3')?.innerText.trim();
        if (cards[title]) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => navegar(cards[title]));
        }
    });

    // 3. Botón de Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'sesion.html';
        });
    }
});