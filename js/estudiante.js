/**
 * EduAgenda - Portal del Estudiante
 * Gestión de horarios, reserva de clases y consulta de calificaciones.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // =========================
    // 1. DATOS GLOBALES Y ESTADO
    // =========================
    const API_URL = 'http://localhost:3000';
    const token = localStorage.getItem('token');
    const nombreUsuario = localStorage.getItem('nombre') || 'Estudiante';
    
    // Seguridad: Redirigir si no hay sesión activa
    if (!token) {
        window.location.href = 'sesion.html';
        return;
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
        // Actualizar UI de los botones
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.getElementById(navId)?.classList.add('active');

        // Ocultar todas las secciones
        Object.values(secciones).forEach(id => {
            const sec = document.getElementById(id);
            if (sec) sec.style.display = 'none';
        });

        // Mostrar sección destino
        const secDestino = document.getElementById(secciones[navId]);
        if (secDestino) secDestino.style.display = 'block';

        // Disparar cargas de datos según la sección
        if (navId === 'nav-resumen') renderResumen();
        if (navId === 'nav-agenda') cargarAgendaDesdeDB(); 
        if (navId === 'nav-clases') renderMisClases(); // Esta es la función clave
    }

    // Configurar eventos de clic en el menú
    Object.keys(secciones).forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSeccion(id);
        });
    });

    // =========================
    // 3. LÓGICA DE CARGA: AGENDA GENERAL
    // =========================
    async function cargarAgendaDesdeDB() {
        try {
            const res = await fetch(`${API_URL}/api/horarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const horarios = await res.json();

            document.querySelectorAll('.slot').forEach(s => s.remove());

            horarios.forEach(h => {
                const cellId = `cell-${h.fecha}-${h.hora_inicio}`;
                const celda = document.getElementById(cellId);

                if (celda) {
                    const div = document.createElement('div');
                    div.className = `slot ${h.estado}`;
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
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('seleccionado'));
        elemento.classList.add('seleccionado');

        seleccionActual = {
            id: horario.id,
            profesor: horario.profesor_nombre,
            materia: horario.materia,
            fecha: horario.fecha,
            hora: horario.hora_inicio,
            precio: 50000
        };

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

        localStorage.setItem('reserva_pendiente', JSON.stringify({
            ...seleccionActual,
            estudiante: nombreUsuario
        }));

        window.location.href = 'pago.html';
    });

    // =========================
    // 5. RENDERIZADO DE MIS CALIFICACIONES (PRIVADO)
    // =========================
    async function renderMisClases() {
        const container = document.getElementById('sec-clases');
        if (!container) return;

        container.innerHTML = '<p style="text-align:center; padding:40px;">Cargando tus notas personalizadas...</p>';

        try {
            // USAR ENDPOINT FILTRADO: El servidor debe devolver solo lo que corresponde al token
            const res = await fetch(`${API_URL}/api/mis-calificaciones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("No se pudo obtener la información");
            
            const misClases = await res.json();

            if (misClases.length === 0) {
                container.innerHTML = `
                    <h1>Mis Calificaciones</h1>
                    <div class="calendar-card" style="text-align:center; padding:50px; border: 2px dashed #cbd5e1;">
                        <p>No tienes tareas calificadas en este momento.</p>
                    </div>`;
                return;
            }

            container.innerHTML = `
                <h1>Mis Calificaciones</h1>
                <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
                    ${misClases.map(clase => `
                        <div class="calendar-card" style="border-left:5px solid #4f46e5; display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex: 1;">
                                <h3 style="margin:0;">${clase.materia_nombre || clase.descripcion}</h3>
                                <p style="color:#64748b; font-size:13px; margin:5px 0;">
                                    ${clase.entrega_fecha ? `Entregado el: ${new Date(clase.entrega_fecha).toLocaleDateString()}` : 'Sin fecha de entrega'}
                                </p>
                                <div style="background:#f1f5f9; padding:10px; border-radius:8px; margin-top:8px; font-size:13px;">
                                    <strong>Retroalimentación:</strong> "${clase.comentario_prof || 'Sin observaciones del docente.'}"
                                </div>
                            </div>
                            <div style="text-align:center; margin-left:25px;">
                                <div style="font-size:11px; color:#94a3b8; font-weight:bold; margin-bottom:4px;">NOTA</div>
                                <div style="background:#4f46e5; color:white; width:55px; height:55px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold;">
                                    ${clase.calificacion || '--'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        } catch (e) {
            console.error("Error al renderizar calificaciones:", e);
            container.innerHTML = "<p style='color:red; text-align:center;'>Error al cargar los datos. Revisa la conexión con el servidor.</p>";
        }
    }

    // Inicio por defecto
    mostrarSeccion('nav-agenda');
});