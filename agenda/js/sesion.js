document.addEventListener("DOMContentLoaded", function () {
  const btnLogin = document.getElementById("btnLogin");
  if (!btnLogin) return; // si no estamos en la página de login, no hace nada

  btnLogin.addEventListener("click", function (e) {
    e.preventDefault();

    const correo = (document.getElementById("loginCorreo")?.value || "")
      .trim()
      .toLowerCase();
    const password = (document.getElementById("loginPassword")?.value || "")
      .trim();

    if (!correo || !password) {
      alert("⚠️ Ingresa tu correo y tu contraseña");
      return;
    }

    // Usuarios guardados por registrarte.js
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(
      (u) => (u.correo || "").toLowerCase() === correo && u.password === password
    );

    if (!usuario) {
      alert("❌ Correo o contraseña incorrectos");
      return;
    }

    // Guardar sesión (usuario logueado)
    localStorage.setItem(
      "usuarioActivo",
      JSON.stringify({
        nombre: usuario.nombre,
        correo: usuario.correo,
      })
    );

    alert("✅ Sesión iniciada. Bienvenido " + usuario.nombre);

    // Redirigir al inicio
    window.location.href = "main.html";
  });
});
