document.addEventListener('DOMContentLoaded', () => {
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