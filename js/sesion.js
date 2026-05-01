document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formSesion');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const respuesta = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        alert(data.error || 'Error al iniciar sesión');
        return;
      }

      // ✅ GUARDAR DATOS EN LOCALSTORAGE
      localStorage.setItem('token', data.token);
      localStorage.setItem('tipo', data.tipo);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('email', data.email);
      localStorage.setItem('id', data.id);

      console.log('✅ Sesión guardada:', data.tipo);
      console.log('✅ Token:', data.token.substring(0, 20) + '...');
      console.log('✅ Redirigiendo a:', data.tipo === 'admin' ? 'admin.html' : 'main.html');

      // ✅ REDIRECCIÓN SEGÚN TIPO DE USUARIO
      if (data.tipo === 'admin') {
        window.location.href = 'admin.html';
      } else if (data.tipo === 'profesor') {
        window.location.href = 'profesor.html';
      } else {
        window.location.href = 'main.html';
      }

    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error de conexión con el servidor');
    }
  });
});
