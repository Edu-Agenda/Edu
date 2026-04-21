document.addEventListener("DOMContentLoaded", function () {
  const btnInicio = document.getElementById("btnInicio");
  if (!btnInicio) return;

  btnInicio.addEventListener("click", function (e) {
    const href = btnInicio.getAttribute("href") || "";

    // Caso 1: estamos en main.html y el link es #tabla
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    // Caso 2: href es main.html#tabla (desde registrate.html)
    // No hacemos preventDefault, dejamos navegar normal.
  });

  // Scroll suave al cargar si la URL ya viene con #tabla
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }
});
