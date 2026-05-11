document.addEventListener('DOMContentLoaded', async () => {

    // =========================
    // 1. DATOS GLOBALES Y ESTADO
    // =========================
    const nombreUsuario = localStorage.getItem('nombre') || 'Estudiante';
    const userName = document.getElementById('userName');
    if (userName) userName.innerText = nombreUsuario;

    // Cargar datos de LocalStorage
    let misClasesData = JSON.parse(localStorage.getItem('mis_clases') || '[]');
    
    let seleccionActual = {
        profesor: 'Darwin Rosero',
        materia: '',
        fecha: '',
        hora: '',
        precio: 50000
    };

    // =========================
    // 2. SISTEMA DE NAVEGACIÓN
    // =========================
    const secciones = {
        'nav-resumen': 'sec-resumen',
        'nav-agenda': 'sec-agenda',
        'nav-clases': 'sec-clases',
        'nav-tareas': 'sec-tareas',
        'nav-calificaciones': 'sec-calificaciones',
        'nav-perfil': 'sec-perfil',
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

        // Renders automáticos al entrar a la sección
        if (navId === 'nav-resumen') renderResumen();
        if (navId === 'nav-clases') renderMisClases();
    }

    // Configurar eventos del menú
    Object.keys(secciones).forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSeccion(id);
        });
    });

    // =========================
    // 3. LÓGICA DE AGENDA (SELECCIÓN)
    // =========================
    document.querySelectorAll('.slot.available').forEach(slot => {
        slot.addEventListener('click', function () {
            document.querySelectorAll('.slot.available').forEach(s => s.classList.remove('seleccionado'));
            this.classList.add('seleccionado');

            const fila = this.closest('tr');
            const horaStr = fila.querySelector('.hour')?.innerText.trim();
            const col = this.parentElement.cellIndex;
            const fecha = document.querySelector(`thead th:nth-child(${col + 1})`)?.innerText.trim();
            const materia = this.innerText.split('\n')[0].trim();

            seleccionActual = {
                profesor: 'Darwin Rosero',
                materia,
                fecha,
                hora: `${horaStr} - ${sumarHoras(horaStr, 2)}`,
                precio: 50000
            };

            // Actualizar panel lateral
            document.getElementById('panelVacio').style.display = 'none';
            const panelClase = document.getElementById('panelClase');
            panelClase.classList.add('visible');
            
            document.getElementById('panelMateria').innerText = materia;
            document.getElementById('panelMateriaLabel').innerText = `Profesor de ${materia}`;
            document.getElementById('panelFecha').innerText = fecha;
            document.getElementById('panelHora').innerText = seleccionActual.hora;
        });
    });

    // =========================
    // 4. FLUJO DE RESERVA Y PAGO
    // =========================
    document.getElementById('btnReservar')?.addEventListener('click', () => {
        if (!seleccionActual.materia) return alert('Por favor, selecciona un horario primero.');

        // 1. Guardar reserva temporal para el proceso de pago
        localStorage.setItem('reserva_pendiente', JSON.stringify({
            ...seleccionActual,
            estudiante: nombreUsuario,
            nota: document.getElementById('notaProfesor')?.value || ''
        }));

        // 2. Redirigir a la página de pago
        // Nota: Tu pago.html debe procesar esto y luego añadirlo a 'mis_clases'
        window.location.href = 'pago.html';
    });

    // =========================
    // 5. RENDERIZADO DINÁMICO
    // =========================

    function renderResumen() {
        const container = document.getElementById('sec-resumen');
        if (!container) return;

        container.innerHTML = `
            <h1>Resumen de Actividad</h1>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; margin-top:20px;">
                <div class="calendar-card" style="text-align:center;">
                    <h3 style="color:#64748b;">Clases Activas</h3>
                    <p style="font-size:32px; font-weight:bold; color:#0061ff; margin:10px 0;">${misClasesData.length}</p>
                    <small>Próximas sesiones programadas</small>
                </div>
                <div class="calendar-card" style="text-align:center;">
                    <h3 style="color:#64748b;">Tareas</h3>
                    <p style="font-size:32px; font-weight:bold; color:#16a34a; margin:10px 0;">2</p>
                    <small>Pendientes para esta semana</small>
                </div>
            </div>
        `;
    }

    function renderMisClases() {
        const container = document.getElementById('sec-clases');
        if (!container) return;

        if (misClasesData.length === 0) {
            container.innerHTML = `<h1>Mis Clases</h1><div class="calendar-card" style="text-align:center; padding:50px;">
                <i class="fas fa-calendar-alt" style="font-size:40px; color:#cbd5e1; margin-bottom:15px;"></i>
                <p>No tienes clases pagadas todavía.</p>
            </div>`;
            return;
        }

        container.innerHTML = `<h1 style="margin-bottom:20px;">Mis Clases Pagadas</h1>
            <div style="display:flex; flex-direction:column; gap:15px;">
                ${misClasesData.map((clase, index) => `
                    <div class="calendar-card" style="display:flex; justify-content:space-between; align-items:center; border-left:5px solid #0061ff;">
                        <div>
                            <h3 style="margin:0;">${clase.materia}</h3>
                            <p style="margin:5px 0; color:#64748b; font-size:14px;">
                                <i class="far fa-calendar"></i> ${clase.fecha} &nbsp; 
                                <i class="far fa-clock"></i> ${clase.hora}<br>
                                <i class="fas fa-user-tie"></i> Prof. ${clase.profesor}
                            </p>
                        </div>
                        <button class="btn-cancelar" data-index="${index}" style="background:#fee2e2; color:#ef4444; border:none; padding:10px 15px; border-radius:8px; cursor:pointer; font-weight:bold;">
                            Cancelar
                        </button>
                    </div>
                `).join('')}
            </div>`;

        // Eventos para botones de cancelar
        container.querySelectorAll('.btn-cancelar').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.dataset.index;
                if (confirm('¿Estás seguro de que deseas cancelar esta clase? El cupo volverá a estar disponible.')) {
                    const eliminada = misClasesData.splice(idx, 1)[0];
                    localStorage.setItem('mis_clases', JSON.stringify(misClasesData));
                    
                    // Restaurar en la tabla visual si sigue abierta
                    restaurarHorario(eliminada);
                    
                    renderMisClases();
                    renderResumen();
                }
            });
        });
    }

    // =========================
    // 6. UTILIDADES
    // =========================

    function restaurarHorario(reserva) {
        document.querySelectorAll('.slot').forEach(slot => {
            const fila = slot.closest('tr');
            const horaFila = fila?.querySelector('.hour')?.innerText.trim();
            const col = slot.parentElement.cellIndex;
            const fechaCol = document.querySelector(`thead th:nth-child(${col + 1})`)?.innerText.trim();
            const materiaSlot = slot.innerText.split('\n')[0].trim();

            if (fechaCol === reserva.fecha && materiaSlot === reserva.materia && reserva.hora.startsWith(horaFila)) {
                slot.classList.remove('reserved');
                slot.classList.add('available');
                slot.innerHTML = reserva.materia;
                slot.style.pointerEvents = 'auto';
            }
        });
    }

    function sumarHoras(horaStr, n) {
        let [tiempo, periodo] = horaStr.split(' ');
        let [h, m] = tiempo.split(':').map(Number);
        if (periodo === 'PM' && h !== 12) h += 12;
        if (periodo === 'AM' && h === 12) h = 0;
        h += n;
        const nuevoPeriodo = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m.toString().padStart(2, '0')} ${nuevoPeriodo}`;
    }

    // Inicio por defecto
    mostrarSeccion('nav-agenda');

});