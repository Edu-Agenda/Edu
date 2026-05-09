/**
 * EduAgenda - Lógica del Panel de Administrador
 * Maneja la seguridad de la sesión, personalización y navegación.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICACIÓN DE SEGURIDAD
    // Extraemos los datos de sesión del almacenamiento local
    const token = localStorage.getItem('token');
    const tipo = localStorage.getItem('tipo');
    const nombreUsuario = localStorage.getItem('nombre');

    // Si no hay token o el usuario no es 'admin', redirigir al login
    if (!token || tipo !== 'admin') {
        console.warn("Acceso denegado: Sesión inválida o permisos insuficientes.");
        window.location.href = 'sesion.html';
        return;
    }

    // 2. PERSONALIZACIÓN DE LA INTERFAZ
    // Mostramos el nombre real del administrador en el banner de bienvenida
    const adminDisplayName = document.getElementById('adminName');
    if (adminDisplayName && nombreUsuario) {
        adminDisplayName.innerText = nombreUsuario;
    }

    // 3. LÓGICA DE NAVEGACIÓN (REDIRECCIONES)
    // Definimos el mapa de las tarjetas y sus destinos
    const rutasCards = {
        'usuarios': 'usuarios.html',
        'reportes': 'reportes.html',
        'configuracion': 'configuracion.html',
        'seguridad': 'seguridad.html'
    };

    // Asignamos el evento de clic a cada tarjeta
    Object.keys(rutasCards).forEach(clase => {
        const tarjeta = document.querySelector(`.card.${clase}`);
        if (tarjeta) {
            tarjeta.addEventListener('click', () => {
                console.log(`Navegando a: ${rutasCards[clase]}`);
                window.location.href = rutasCards[clase];
            });
        }
    });

    // 4. CIERRE DE SESIÓN
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Confirmación opcional para el usuario
            if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
                // Limpiar todo el almacenamiento local
                localStorage.clear();
                // Redirigir al inicio de sesión
                window.location.href = 'sesion.html';
            }
        });
    }
});