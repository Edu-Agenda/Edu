document.addEventListener('DOMContentLoaded', async () => {

    // 1. Verificación de seguridad
    const token = localStorage.getItem('token');
    const tipo  = localStorage.getItem('tipo');

    if (!token || tipo !== 'estudiante') {
        window.location.href = 'sesion.html';
        return;
    }

    const nombreUsuario = localStorage.getItem('nombre') || 'Estudiante';
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = nombreUsuario;

    // 2. Cargar estado de horarios desde el servidor
    async function cargarEstadoHorarios() {
        try {
            const response = await fetch('/api/horarios');
            const horariosDB = await response.json();

            document.querySelectorAll('.slot').forEach(slot => {
                const fila = slot.closest('tr');
                if (!fila) return;
                const horaInicio = fila.cells[0]?.innerText;
                const indexCol   = slot.parentElement.cellIndex;
                const th         = document.querySelector(`thead th:nth-child(${indexCol + 1})`);
                if (!th) return;
                const dia         = th.innerText;
                const fechaCompleta = `${dia} de mayo de 2026`;

                const reservado = horariosDB.find(h =>
                    h.fecha === fechaCompleta &&
                    h.hora_inicio === horaInicio &&
                    h.estado === 'reservado'
                );

                if (reservado) {
                    slot.classList.remove('available');
                    slot.classList.add('reserved');
                    slot.innerText = 'Reservado';
                    slot.style.cursor = 'not-allowed';
                    slot.style.pointerEvents = 'none';
                }
            });
        } catch (err) {
            console.error('Error cargando horarios:', err);
        }
    }

    await cargarEstadoHorarios();

    // 3. Selección de horario
    let seleccionActual = {
        profesor: 'Darwin Rosero',
        materia:  'Matemáticas',
        fecha:    '',
        hora:     '',
        precio:   50000
    };

    const detalleCard = document.querySelector('.detail-card');

    document.querySelectorAll('.slot.available').forEach(slot => {
        slot.addEventListener('click', function () {
            document.querySelectorAll('.slot').forEach(s => s.style.border = 'none');
            this.style.border = '2px solid var(--primary-blue)';

            const fila      = this.closest('tr');
            const horaInicio = fila.cells[0].innerText;
            const indexCol  = this.parentElement.cellIndex;
            const dia       = document.querySelector(`thead th:nth-child(${indexCol + 1})`).innerText;

            seleccionActual.fecha = `${dia} de mayo de 2026`;
            seleccionActual.hora  = `${horaInicio} - ${sumarHoras(horaInicio, 2)}`;

            if (detalleCard) {
                const infoRows = detalleCard.querySelectorAll('.info-row');
                if (infoRows[0]) infoRows[0].innerHTML = `<i class="far fa-calendar"></i> ${seleccionActual.fecha}`;
                if (infoRows[1]) infoRows[1].innerHTML = `<i class="far fa-clock"></i> ${seleccionActual.hora}`;
                detalleCard.style.opacity = '0.5';
                setTimeout(() => detalleCard.style.opacity = '1', 150);
            }
        });
    });

    // 4. Botón Reservar → guarda datos y va a pago.html
    const btnReservar = document.querySelector('.btn-reserve');
    if (btnReservar) {
        btnReservar.addEventListener('click', () => {
            if (!seleccionActual.fecha || !seleccionActual.hora) {
                alert('Por favor selecciona un horario primero.');
                return;
            }

            const reserva = {
                ...seleccionActual,
                estudiante: nombreUsuario,
                nota: document.querySelector('textarea')?.value || ''
            };

            localStorage.setItem('reserva_pendiente', JSON.stringify(reserva));
            window.location.href = 'pago.html';
        });
    }

    function sumarHoras(horaStr, n) {
        let [hora, mins] = horaStr.split(':');
        let [minutos, periodo] = mins.split(' ');
        let h = parseInt(hora);
        if (periodo === 'PM' && h !== 12) h += 12;
        if (periodo === 'AM' && h === 12) h = 0;
        h += n;
        let nuevoPeriodo = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minutos} ${nuevoPeriodo}`;
    }
});