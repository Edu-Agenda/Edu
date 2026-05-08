document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formSesion');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');

    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

    try {
      const respuesta = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        alert(data.error || 'Credenciales incorrectas');
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        return;
      }

      // Limpiar localStorage antes de guardar nueva sesión
      localStorage.clear();

      // Guardar sesión
      localStorage.setItem('token',  data.token);
      localStorage.setItem('tipo',   data.tipo);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('email',  data.email  || email);
      localStorage.setItem('id',     data.id !== undefined ? String(data.id) : '0');

      console.log('✅ Sesión iniciada como:', data.tipo);

      // Redirigir según tipo
      if (data.tipo === 'admin') {
        window.location.href = 'admin.html';
      } else if (data.tipo === 'profesor') {
        window.location.href = 'profesor.html';
      } else if (data.tipo === 'estudiante') {
        window.location.href = 'estudiante.html';
      } else {
        alert('Tipo de usuario desconocido: ' + data.tipo);
      }

    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('Error de conexión con el servidor.');
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
  });
});