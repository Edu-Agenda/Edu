document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const nombre = localStorage.getItem('nombre');
  const navLinks = document.getElementById('nav-links');
  const saludo = document.getElementById('saludo');

  if (token && nombre) {
    if (saludo) saludo.textContent = `¡Hola de nuevo, ${nombre}!`;

    if (navLinks) {
      navLinks.innerHTML = `
        <a href="main.html" class="activo">Inicio</a>
        <a href="usuarios.html">Mi Cuenta</a>
        <button onclick="logout()" class="btn-register" style="background-color: #ef4444;">Cerrar Sesión</button>
      `;
    }
  }
});

function logout() {
  localStorage.clear();
  window.location.href = 'main.html';
}
