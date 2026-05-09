document.addEventListener('DOMContentLoaded', () => {

    const tbody = document.getElementById('calificacionesBody');

    const estudianteInput =
        document.getElementById('estudianteInput');

    const materiaSelect =
        document.getElementById('materiaSelect');

    const notaInput =
        document.getElementById('notaInput');

    const observacionInput =
        document.getElementById('observacionInput');

    const btnGuardar =
        document.querySelector('.btn-save');

    const btnCancelar =
        document.querySelector('.btn-cancel');

    const btnAgregar =
        document.querySelector('.btn-add');

    let filaEditando = null;

    // ============================================
    // CARGAR LOCAL STORAGE
    // ============================================

    cargarDatos();

    // ============================================
    // AGREGAR EVENTOS A FILAS EXISTENTES
    // ============================================

    document.querySelectorAll('#calificacionesBody tr')
    .forEach(fila => {

        agregarEventosFila(fila);

    });

    // ============================================
    // BOTON GUARDAR
    // ============================================

    btnGuardar.addEventListener('click', () => {

        const estudiante =
            estudianteInput.value.trim();

        const materia =
            materiaSelect.value;

        const nota =
            notaInput.value.trim();

        const observacion =
            observacionInput.value.trim();

        // VALIDACIONES

        if (
            estudiante === '' ||
            materia === '' ||
            nota === ''
        ) {

            alert('Completa todos los campos');

            return;
        }

        if (nota < 0 || nota > 5) {

            alert('La nota debe estar entre 0 y 5');

            return;
        }

        // ====================================
        // EDITAR
        // ====================================

        if (filaEditando) {

            filaEditando.children[0].innerText =
                estudiante;

            filaEditando.children[1].innerText =
                materia;

            filaEditando.children[2].innerText =
                nota;

            filaEditando.children[3].innerText =
                observacion;

            filaEditando = null;

            alert('Registro actualizado');

        }

        // ====================================
        // NUEVO
        // ====================================

        else {

            const fila =
                document.createElement('tr');

            fila.innerHTML = `
                <td>${estudiante}</td>
                <td>${materia}</td>
                <td>${nota}</td>
                <td>${observacion}</td>

                <td class="actions-cell">

                    <i class="fas fa-pencil"></i>

                    <i class="fas fa-trash"
                    style="color:#ef4444"></i>

                </td>
            `;

            tbody.appendChild(fila);

            agregarEventosFila(fila);

            alert('Registro agregado');

        }

        guardarDatos();

        limpiarFormulario();

    });

    // ============================================
    // BOTON CANCELAR
    // ============================================

    btnCancelar.addEventListener('click', () => {

        limpiarFormulario();

        filaEditando = null;

    });

    // ============================================
    // BOTON AGREGAR
    // ============================================

    btnAgregar.addEventListener('click', () => {

        limpiarFormulario();

        estudianteInput.focus();

    });

    // ============================================
    // FUNCION EVENTOS FILA
    // ============================================

    function agregarEventosFila(fila) {

        const editarBtn =
            fila.querySelector('.fa-pencil');

        const eliminarBtn =
            fila.querySelector('.fa-trash');

        // EDITAR

        editarBtn.addEventListener('click', () => {

            estudianteInput.value =
                fila.children[0].innerText;

            materiaSelect.value =
                fila.children[1].innerText;

            notaInput.value =
                fila.children[2].innerText;

            observacionInput.value =
                fila.children[3].innerText;

            filaEditando = fila;

            window.scrollTo({

                top:
                document.body.scrollHeight,

                behavior: 'smooth'

            });

        });

        // ELIMINAR

        eliminarBtn.addEventListener('click', () => {

            const confirmar =
                confirm(
                    '¿Eliminar este registro?'
                );

            if (confirmar) {

                fila.remove();

                guardarDatos();

                alert('Registro eliminado');

            }

        });

    }

    // ============================================
    // LIMPIAR
    // ============================================

    function limpiarFormulario() {

        estudianteInput.value = '';

        materiaSelect.value = '';

        notaInput.value = '';

        observacionInput.value = '';

    }

    // ============================================
    // GUARDAR DATOS
    // ============================================

    function guardarDatos() {

        const registros = [];

        document.querySelectorAll(
            '#calificacionesBody tr'
        )
        .forEach(fila => {

            registros.push({

                estudiante:
                    fila.children[0].innerText,

                materia:
                    fila.children[1].innerText,

                nota:
                    fila.children[2].innerText,

                observacion:
                    fila.children[3].innerText

            });

        });

        localStorage.setItem(
            'calificaciones',
            JSON.stringify(registros)
        );

    }

    // ============================================
    // CARGAR DATOS
    // ============================================

    function cargarDatos() {

        const datos =
            JSON.parse(
                localStorage.getItem(
                    'calificaciones'
                )
            );

        if (!datos) return;

        tbody.innerHTML = '';

        datos.forEach(registro => {

            const fila =
                document.createElement('tr');

            fila.innerHTML = `
                <td>${registro.estudiante}</td>
                <td>${registro.materia}</td>
                <td>${registro.nota}</td>
                <td>${registro.observacion}</td>

                <td class="actions-cell">

                    <i class="fas fa-pencil"></i>

                    <i class="fas fa-trash"
                    style="color:#ef4444"></i>

                </td>
            `;

            tbody.appendChild(fila);

            agregarEventosFila(fila);

        });

    }

});