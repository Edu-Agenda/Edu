document.getElementById('formSesion').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        // 🔍 Verifica esto en la consola (F12)
        console.log('DATOS RECIBIDOS:', data);

        if (!res.ok) {
            alert(data.error || 'Credenciales incorrectas');
            return;
        }

        // GUARDAR DATOS
        localStorage.clear();
        localStorage.setItem('token', data.token);
        localStorage.setItem('tipo', data.tipo);
        localStorage.setItem('nombre', data.nombre);

        // Aseguramos que el tipo esté en minúsculas y sin espacios
        const tipoUsuario = String(data.tipo).toLowerCase().trim();

        // REDIRECCIÓN USANDO RUTAS ABSOLUTAS (El '/' al principio es clave)
        const rutas = {
            'admin': '/admin.html',
            'profesor': '/profesor.html',
            'estudiante': '/estudiante.html'
        };

        if (rutas[tipoUsuario]) {
            console.log(`Redirigiendo a: ${rutas[tipoUsuario]}`);
            window.location.assign(rutas[tipoUsuario]);
        } else {
            alert('Tipo de usuario no reconocido: ' + data.tipo);
            localStorage.clear();
        }

    } catch (error) {
        console.error('ERROR EN LOGIN:', error);
        alert('No se pudo conectar con el servidor. ¿Está encendido?');
    }
});