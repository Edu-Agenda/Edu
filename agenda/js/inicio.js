document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const nombre = localStorage.getItem('nombre');
    const navLinks = document.getElementById('nav-links');
    const saludo = document.getElementById('saludo');

    if (token && nombre) {
        if (saludo) saludo.textContent = `¡Hola de nuevo, ${nombre}!`;
        
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="main.html" class="nav-item">Inicio</a>
                <button onclick="logout()" class="btn-register">Cerrar Sesión</button>
            `;
        }
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'main.html';
}