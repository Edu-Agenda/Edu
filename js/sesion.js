document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    // Usamos el ID del formulario para capturar el evento "Enter" también
    const form = document.getElementById('formSesion');

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                // Guardamos los datos de sesión
                localStorage.setItem('token', data.token);
                localStorage.setItem('nombre', data.nombre);
                
                // ¡REDIRECCIÓN AL DASHBOARD!
                window.location.href = 'usuarios.html'; 
            } else {
                // Si el servidor envía un error (ej: contraseña incorrecta)
                alert(data.error || "Credenciales incorrectas");
            }
        } catch (err) {
            console.error("Error de conexión:", err);
            alert("No se pudo conectar con el servidor de EduAgenda. Revisa la terminal.");
        }
    });
});
=======
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
>>>>>>> develop
