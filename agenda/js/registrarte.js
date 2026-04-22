document.addEventListener('DOMContentLoaded', () => {
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
});