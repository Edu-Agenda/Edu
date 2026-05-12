document.addEventListener('DOMContentLoaded', async () => {
    // =========================
    // 1. DATOS GLOBALES Y ESTADO
    // =========================
    const API_URL = 'http://localhost:3000';
    const token = localStorage.getItem('token');
    const nombreUsuario = localStorage.getItem('nombre') || 'Estudiante';
    
    // Si no hay token, redirigir al login (Seguridad)
    if (!token && window.location.pathname.includes('estudiante.html')) {
        window.location.href = 'sesion.html';
    }

    const userName = document.getElementById('userName');
    if (userName) userName.innerText = nombreUsuario;

    let seleccionActual = null;

    // =========================
    // 2. SISTEMA DE NAVEGACIÓN
    // =========================
    const secciones = {
        'nav-resumen': 'sec-resumen',
        'nav-agenda': 'sec-agenda',
        'nav-clases': 'sec-clases',
    };

    function mostrarSeccion(navId) {
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.getElementById(navId)?.classList.add('active');

        Object.values(secciones).forEach(id => {
            const sec = document.getElementById(id);
            if (sec) sec.style.display = 'none';
        });

        const secDestino = document.getElementById(secciones[navId]);
        if (secDestino) secDestino.style.display = 'block';

        if (navId === 'nav-resumen') renderResumen();
        if (navId === 'nav-agenda') cargarAgendaDesdeDB(); // Carga real de la DB
        if (navId === 'nav-clases') renderMisClases();
    }

    Object.keys(secciones).forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSeccion(id);
        });
    });

    // =========================
    // 3. LÓGICA DE CARGA (API)
    // =========================
    async function cargarAgendaDesdeDB() {
        try {
            const res = await fetch(`${API_URL}/api/horarios`);
            const horarios = await res.json();

            // Limpiar slots existentes antes de repintar
            document.querySelectorAll('.slot').forEach(s => s.remove());

            horarios.forEach(h => {
                // Formato de ID esperado en el HTML: cell-2026-05-26-08:00
                const cellId = `cell-${h.fecha}-${h.hora_inicio}`;
                const celda = document.getElementById(cellId);

                if (celda) {
                    const div = document.createElement('div');
                    div.className = `slot ${h.estado}`; // 'disponible' o 'reservado'
                    div.innerHTML = `<b>${h.materia}</b><br><small>${h.profesor_nombre}</small>`;
                    
                    if (h.estado === 'disponible') {
                        div.addEventListener('click', () => prepararSeleccion(h, div));
                    } else {
                        div.style.pointerEvents = 'none';
                        div.innerHTML += '<br><span style="font-size:10px;">[OCUPADO]</span>';
                    }
                    celda.appendChild(div);
                }
            });
        } catch (error) {
            console.error("Error cargando agenda:", error);
        }
    }

    function prepararSeleccion(horario, elemento) {
        // Visual
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('seleccionado'));
        elemento.classList.add('seleccionado');

        // Estado
        seleccionActual = {
            id: horario.id,
            profesor: horario.profesor_nombre,
            materia: horario.materia,
            fecha: horario.fecha,
            hora: horario.hora_inicio,
            precio: 50000
        };

        // Panel Lateral
        const panelVacio = document.getElementById('panelVacio');
        const panelClase = document.getElementById('panelClase');
        if (panelVacio) panelVacio.style.display = 'none';
        if (panelClase) {
            panelClase.classList.add('visible');
            document.getElementById('panelMateria').innerText = horario.materia;
            document.getElementById('panelFecha').innerText = horario.fecha;
            document.getElementById('panelHora').innerText = horario.hora_inicio;
        }
    }

    // =========================
    // 4. FLUJO DE RESERVA
    // =========================
    document.getElementById('btnReservar')?.addEventListener('click', () => {
        if (!seleccionActual) return alert('Selecciona una clase primero.');

        // Guardamos en localStorage lo que el archivo pago.html necesitará leer
        localStorage.setItem('reserva_pendiente', JSON.stringify({
            ...seleccionActual,
            estudiante: nombreUsuario
        }));

        window.location.href = 'pago.html';
    });

    // =========================
    // 5. RENDERIZADO DE MIS CLASES (PAGADAS)
    // =========================
    async function renderMisClases() {
        const container = document.getElementById('sec-clases');
        if (!container) return;

        try {
            const res = await fetch(`${API_URL}/api/horarios`);
            const todos = await res.json();
            // Filtramos solo las que pertenecen a este estudiante
            const misClases = todos.filter(h => h.estudiante_nombre === nombreUsuario);

            if (misClases.length === 0) {
                container.innerHTML = `<h1>Mis Clases</h1><div class="calendar-card" style="text-align:center; padding:50px;">
                    <p>Aún no tienes clases reservadas.</p>
                </div>`;
                return;
            }

            container.innerHTML = `<h1>Mis Clases Pagadas</h1>
                <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
                    ${misClases.map(clase => `
                        <div class="calendar-card" style="border-left:5px solid #16a34a; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h3 style="margin:0;">${clase.materia}</h3>
                                <p style="color:#64748b; font-size:14px; margin:5px 0;">
                                    ${clase.fecha} | ${clase.hora_inicio} | Prof. ${clase.profesor_nombre}
                                </p>
                            </div>
                            <span style="color:#16a34a; font-weight:bold;">PAGADO</span>
                        </div>
                    `).join('')}
                </div>`;
        } catch (e) {
            container.innerHTML = "<p>Error al cargar tus clases.</p>";
        }
    }

    // Inicio
    mostrarSeccion('nav-agenda');
});