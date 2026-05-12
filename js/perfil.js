// ============================================================
// PERFIL EDUAGENDA
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // CLAVE STORAGE
    // ============================================================

    const STORAGE_KEY = 'eduagenda_perfil';

    // ============================================================
    // DATOS DEL LOGIN
    // ============================================================

    const nombreLogin =
        localStorage.getItem('nombre') || 'Estudiante';

    const emailLogin =
        localStorage.getItem('email') || 'correo@edu.co';

    // ============================================================
    // CARGAR PERFIL
    // ============================================================

    function cargarPerfil() {

        let datos = {};

        // DATOS GUARDADOS
        const guardado =
            localStorage.getItem(STORAGE_KEY);

        if (guardado) {

            datos = JSON.parse(guardado);

        } else {

            // SI NO EXISTE PERFIL GUARDADO
            const partes =
                nombreLogin.split(' ');

            datos = {

                nombre:
                    partes[0] || 'Estudiante',

                apellidos:
                    partes.slice(1).join(' ') || '',

                email:
                    emailLogin,

                tel:
                    '+57 ',

                ciudad:
                    'Tumaco, Colombia',

                programa:
                    'Ingeniería de Sistemas',

                semestre:
                    '4'
            };

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(datos)
            );
        }

        // ============================================================
        // INPUTS
        // ============================================================

        document.getElementById('inputNombre').value =
            datos.nombre || '';

        document.getElementById('inputApellidos').value =
            datos.apellidos || '';

        document.getElementById('inputEmail').value =
            datos.email || '';

        document.getElementById('inputTel').value =
            datos.tel || '';

        document.getElementById('inputCiudad').value =
            datos.ciudad || '';

        document.getElementById('inputPrograma').value =
            datos.programa || '';

        document.getElementById('inputSemestre').value =
            datos.semestre || '1';

        actualizarVista();
    }

    // ============================================================
    // ACTUALIZAR VISTA
    // ============================================================

    function actualizarVista() {

        const nombre =
            document.getElementById('inputNombre')
            .value.trim();

        const apellidos =
            document.getElementById('inputApellidos')
            .value.trim();

        const email =
            document.getElementById('inputEmail')
            .value.trim();

        const tel =
            document.getElementById('inputTel')
            .value.trim();

        const ciudad =
            document.getElementById('inputCiudad')
            .value.trim();

        const semestre =
            document.getElementById('inputSemestre')
            .value;

        const nombreCompleto =
            `${nombre} ${apellidos}`.trim();

        // INICIALES
        const iniciales =
            (
                (nombre[0] || '') +
                (apellidos[0] || '')
            ).toUpperCase();

        // HEADER
        document.getElementById('userName')
            .textContent = nombreCompleto;

        document.getElementById('headerAvatar')
            .textContent = iniciales;

        // SIDEBAR
        document.getElementById('perfilAvatar')
            .textContent = iniciales;

        document.getElementById('perfilNombre')
            .textContent = nombreCompleto;

        document.getElementById('perfilRol')
            .textContent =
            `Estudiante · Semestre ${semestre}`;

        document.getElementById('perfilEmail')
            .textContent = email;

        document.getElementById('perfilTel')
            .textContent = tel;

        document.getElementById('perfilCiudad')
            .textContent = ciudad;
    }

    // ============================================================
    // GUARDAR PERFIL
    // ============================================================

    window.guardarPerfil = function () {

        const datos = {

            nombre:
                document.getElementById('inputNombre')
                .value.trim(),

            apellidos:
                document.getElementById('inputApellidos')
                .value.trim(),

            email:
                document.getElementById('inputEmail')
                .value.trim(),

            tel:
                document.getElementById('inputTel')
                .value.trim(),

            ciudad:
                document.getElementById('inputCiudad')
                .value.trim(),

            programa:
                document.getElementById('inputPrograma')
                .value.trim(),

            semestre:
                document.getElementById('inputSemestre')
                .value
        };

        // GUARDAR PERFIL
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(datos)
        );

        // ACTUALIZAR LOGIN
        localStorage.setItem(
            'nombre',
            `${datos.nombre} ${datos.apellidos}`.trim()
        );

        localStorage.setItem(
            'email',
            datos.email
        );

        actualizarVista();

        mostrarToast(
            '✅ Cambios guardados correctamente'
        );
    };

    // ============================================================
    // TOAST
    // ============================================================

    function mostrarToast(msg) {

        const toast =
            document.getElementById('toast');

        document.getElementById('toastMsg')
            .textContent = msg;

        toast.classList.add('visible');

        setTimeout(() => {

            toast.classList.remove('visible');

        }, 3000);
    }

    // ============================================================
    // MODAL
    // ============================================================

    window.abrirModalCerrarSesion = function () {

        const nombre =
            document.getElementById('inputNombre')
            .value.trim();

        document.getElementById('modalMsg')
            .textContent =
            `¿Seguro que deseas salir de la cuenta de ${nombre}?`;

        document.getElementById('modalCerrarSesion')
            .classList.add('visible');
    };

    window.cerrarModal = function () {

        document.getElementById('modalCerrarSesion')
            .classList.remove('visible');
    };

    window.confirmarCierreSesion = function () {

        cerrarModal();

        const nombre =
            document.getElementById('inputNombre')
            .value.trim();

        mostrarToast(
            `¡Hasta pronto, ${nombre}! 👋`
        );

        // LIMPIAR SESIÓN
        localStorage.removeItem('token');
        localStorage.removeItem('tipo');

        setTimeout(() => {

            window.location.href = 'index.html';

        }, 1800);
    };

    // ============================================================
    // INIT
    // ============================================================

    cargarPerfil();

});