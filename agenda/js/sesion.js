document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnLogin');

    btn.addEventListener('click', async () => {
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
                localStorage.setItem('token', data.token);
                localStorage.setItem('nombre', data.nombre);
                window.location.href = 'main.html';
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error al conectar con el servidor");
        }
    });
});