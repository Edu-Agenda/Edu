document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    const form = document.getElementById('formRegistro');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const values = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const data = await res.json();

            if (res.ok) {
                alert("¡Cuenta creada! Ahora inicia sesión.");
                window.location.href = 'sesion.html';
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error en el registro");
        }
    });
=======
  const form = document.getElementById('formRegistro');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nombre = document.querySelector('input[name="nombre"]').value;
      const documento = document.querySelector('input[name="documento"]').value;
      const email = document.querySelector('input[name="email"]').value;
      const telefono = document.querySelector('input[name="telefono"]').value;
      const password = document.querySelector('input[name="password"]').value;
      const confirmPassword = document.querySelector('input[name="confirm_password"]').value;
      const tipo = document.querySelector('input[name="tipo"]:checked').value;

      // Validaciones
      if (!nombre || !email || !password) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }

      if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }

      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      try {
        console.log('Registrando usuario...');
        const res = await fetch('/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            documento,
            email,
            telefono,
            password,
            tipo
          })
        });

        const data = await res.json();
        console.log('Respuesta:', res.status);

        if (res.ok) {
          alert("¡Cuenta creada exitosamente! Ahora inicia sesión.");
          window.location.href = 'sesion.html';
        } else {
          alert(data.error || "Error en el registro");
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Error de conexión con el servidor. Asegúrate que el servidor esté corriendo en http://localhost:3000");
      }
    });
  }
>>>>>>> develop
});
