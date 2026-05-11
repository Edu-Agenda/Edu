document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // SELECTORES
    // =========================

    const tableBody = document.getElementById('agenda-body');
    const btnNew = document.getElementById('btnNuevaReserva');

    const modal = document.getElementById('modalReserva');
    const form = document.getElementById('formReserva');
    const modalTitle = document.getElementById('modalTitle');

    const closeModal = document.querySelector('.close-modal');
    const btnCancel = document.querySelector('.btn-cancel');

    const filterDateInput = document.getElementById('filter-date');
    const filterMateriaSelect = document.getElementById('filter-materia');
    const filterEstadoSelect = document.getElementById('filter-estado');

    let editingRow = null;

    // =========================
    // ABRIR MODAL
    // =========================

    if (btnNew) {

        btnNew.addEventListener('click', () => {

            editingRow = null;

            form.reset();

            modalTitle.innerText = 'Nueva Reserva';

            modal.classList.add('active');

        });

    }

    // =========================
    // CERRAR MODAL
    // =========================

    const hideModal = () => {

        modal.classList.remove('active');

        editingRow = null;

    };

    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', hideModal);
    }

    window.addEventListener('click', (event) => {

        if (event.target === modal) {

            hideModal();

        }

    });

    // =========================
    // GUARDAR RESERVA
    // =========================

    if (form) {

        form.addEventListener('submit', (e) => {

            e.preventDefault();

            const nombre =
                document.getElementById('inputNombre').value;

            const materia =
                document.getElementById('inputMateria').value;

            const fechaRaw =
                document.getElementById('inputFecha').value;

            const [y, m, d] = fechaRaw.split('-');

            const fechaFormateada =
                `${d}/${m}/${y}`;

            // =========================
            // EDITAR
            // =========================

            if (editingRow) {

                editingRow.cells[0].innerText = nombre;

                editingRow.cells[1].innerText = materia;

                editingRow.cells[2].innerText =
                    fechaFormateada;

            }

            // =========================
            // CREAR NUEVA FILA
            // =========================

            else {

                const newRow =
                    document.createElement('tr');

                newRow.innerHTML = `

                    <td>${nombre}</td>

                    <td>${materia}</td>

                    <td>${fechaFormateada}</td>

                    <td>08:00 AM</td>

                    <td>1h</td>

                    <td>Virtual</td>

                    <td>
                        <span class="status pending">
                            Pendiente
                        </span>
                    </td>

                    <td>
                        Nueva reserva añadida
                    </td>

                    <td class="actions">

                        <i class="fas fa-eye"
                            title="Ver detalle"></i>

                        <i class="fas fa-pen"
                            title="Editar"></i>

                        <i class="fas fa-trash"
                            title="Eliminar"></i>

                    </td>

                `;

                tableBody.appendChild(newRow);

            }

            hideModal();

            updateStats();

            filterTable();

        });

    }

    // =========================
    // EDITAR Y ELIMINAR
    // =========================

    tableBody.addEventListener('click', (e) => {

        const row = e.target.closest('tr');

        if (!row) return;

        // =========================
        // EDITAR
        // =========================

        if (e.target.classList.contains('fa-pen')) {

            editingRow = row;

            modalTitle.innerText =
                'Editar Reserva';

            document.getElementById('inputNombre').value =
                row.cells[0].innerText.trim();

            document.getElementById('inputMateria').value =
                row.cells[1].innerText.trim();

            const p =
                row.cells[2].innerText.trim().split('/');

            if (p.length === 3) {

                document.getElementById('inputFecha').value =
                    `${p[2]}-${p[1]}-${p[0]}`;

            }

            modal.classList.add('active');

        }

        // =========================
        // ELIMINAR
        // =========================

        if (e.target.classList.contains('fa-trash')) {

            const nombre =
                row.cells[0].innerText.trim();

            if (
                confirm(
                    `¿Eliminar la reserva de ${nombre}?`
                )
            ) {

                row.remove();

                updateStats();

            }

        }

    });

    // =========================
    // FILTROS
    // =========================

    const filterTable = () => {

        const dateValue =
            filterDateInput.value;

        const subjectValue =
            filterMateriaSelect.value
                .toLowerCase()
                .trim();

        const statusValue =
            filterEstadoSelect.value
                .toLowerCase()
                .trim();

        tableBody.querySelectorAll('tr')
            .forEach(row => {

                const rowDate =
                    row.cells[2].innerText.trim();

                const rowSubject =
                    row.cells[1].innerText
                        .toLowerCase()
                        .trim();

                const rowStatus =
                    row.cells[6].innerText
                        .toLowerCase()
                        .trim();

                // Convertir DD/MM/YYYY
                // a YYYY-MM-DD

                const parts = rowDate.split('/');

                let formattedRowDate = '';

                if (parts.length === 3) {

                    formattedRowDate =
                        `${parts[2]}-${parts[1]}-${parts[0]}`;

                }

                const matchesDate =
                    !dateValue ||
                    formattedRowDate === dateValue;

                const matchesSubject =
                    subjectValue === 'todas las materias' ||
                    subjectValue === 'todas' ||
                    rowSubject === subjectValue;

                const matchesStatus =
                    statusValue === 'todos los estados' ||
                    statusValue === 'todos' ||
                    rowStatus === statusValue;

                row.style.display =
                    (
                        matchesDate &&
                        matchesSubject &&
                        matchesStatus
                    )
                        ? ''
                        : 'none';

            });

    };

    // =========================
    // LISTENERS FILTROS
    // =========================

    if (filterDateInput) {

        filterDateInput.addEventListener(
            'change',
            filterTable
        );

    }

    if (filterMateriaSelect) {

        filterMateriaSelect.addEventListener(
            'change',
            filterTable
        );

    }

    if (filterEstadoSelect) {

        filterEstadoSelect.addEventListener(
            'change',
            filterTable
        );

    }

    // =========================
    // ACTUALIZAR ESTADÍSTICAS
    // =========================

    const updateStats = () => {

        const totalEstudiantes =
            tableBody.querySelectorAll('tr').length;

        const pendientes =
            tableBody.querySelectorAll(
                '.status.pending'
            ).length;

        const statEstudiantes =
            document.getElementById(
                'stat-estudiantes'
            );

        const statPendientes =
            document.getElementById(
                'stat-pendientes'
            );

        if (statEstudiantes) {

            statEstudiantes.innerText =
                totalEstudiantes;

        }

        if (statPendientes) {

            statPendientes.innerText =
                pendientes;

        }

    };

    // =========================
    // INICIALIZAR
    // =========================

    updateStats();

});