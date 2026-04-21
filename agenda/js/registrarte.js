document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("btnRegistro");
  if (!btn) return; // Evita error si no estamos en la página de registro

  btn.addEventListener("click", function (e) {
    e.preventDefault();

    const nombreEl = document.getElementById("nombre");
    const documentoEl = document.getElementById("documento");
    const correoEl = document.getElementById("correo");
    const telefonoEl = document.getElementById("telefono");
    const passwordEl = document.getElementById("password");

    const nombre = nombreEl.value.trim();
    const documento = documentoEl.value.trim();
    const correo = correoEl.value.trim().toLowerCase();
    const telefono = telefonoEl.value.trim();
    const password = passwordEl.value.trim();

    // Validación básica
    if (!nombre || !documento || !correo || !telefono || !password) {
      alert("⚠️ Todos los campos son obligatorios");
      return;
    }

    // Validación simple de correo
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    if (!emailValido) {
      alert("⚠️ Ingresa un correo válido");
      return;
    }

    // Obtener usuarios guardados o crear array
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Evitar correos duplicados
    const yaExiste = usuarios.some(u => (u.correo || "").toLowerCase() === correo);
    if (yaExiste) {
      alert("⚠️ Este correo ya está registrado. Intenta iniciar sesión.");
      return;
    }

    // Crear objeto usuario
    const usuario = {
      nombre,
      documento,
      correo,
      telefono,
      password
    };

    // Guardar nuevo usuario
    usuarios.push(usuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert("✅ Registro exitoso");

    // Limpiar formulario
    nombreEl.value = "";
    documentoEl.value = "";
    correoEl.value = "";
    telefonoEl.value = "";
    passwordEl.value = "";

    // Redirigir después del registro:
    // Opción A: ir a iniciar sesión
    window.location.href = "iniciar.html";

    // Opción B: si prefieres volver al inicio, usa esta y borra la de arriba:
    // window.location.href = "main.html";
  });
});