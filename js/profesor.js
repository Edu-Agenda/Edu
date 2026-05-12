// =========================================
// PANEL PROFESOR JS COMPLETO
// =========================================

// API
const API = 'http://localhost:3000';

// =========================================
// NAVEGACIÓN
// =========================================

function navegar(ruta){

  if(!ruta){
    console.error('Ruta inválida');
    return;
  }

  window.location.href = ruta;

}

// =========================================
// VARIABLES GLOBALES
// =========================================

const token  = localStorage.getItem('token');
const tipo   = localStorage.getItem('tipo');
const nombre = localStorage.getItem('nombre');

const tablaHorarios =
  document.getElementById('tablaHorarios');

const modal =
  document.getElementById('modalHorario');

const formHorario =
  document.getElementById('formHorario');

const btnAbrirModal =
  document.getElementById('abrirModal');

const btnCerrarModal =
  document.getElementById('cerrarModal');

const logoutBtn =
  document.getElementById('logoutBtn');

// =========================================
// VALIDAR SESIÓN
// =========================================

if(!token){

  alert('Debes iniciar sesión');

  window.location.href = 'sesion.html';

}

if(tipo !== 'profesor'){

  alert('Acceso denegado');

  window.location.href = 'sesion.html';

}

// =========================================
// MOSTRAR NOMBRE
// =========================================

document.getElementById('profesorNombre')
.innerText = nombre || 'Profesor';

document.getElementById('saludoNombre')
.innerText = nombre || 'Profesor';

// =========================================
// LOGOUT
// =========================================

logoutBtn.addEventListener('click', () => {

  const confirmar =
    confirm('¿Deseas cerrar sesión?');

  if(!confirmar) return;

  localStorage.clear();

  window.location.href = 'sesion.html';

});

// =========================================
// ABRIR MODAL
// =========================================

btnAbrirModal.addEventListener('click', () => {

  modal.style.display = 'flex';

});

// =========================================
// CERRAR MODAL
// =========================================

btnCerrarModal.addEventListener('click', () => {

  modal.style.display = 'none';

});

// =========================================
// CERRAR MODAL AL DAR CLICK FUERA
// =========================================

window.addEventListener('click', (e) => {

  if(e.target === modal){

    modal.style.display = 'none';

  }

});

// =========================================
// CARGAR HORARIOS
// =========================================

async function cargarHorarios(){

  try{

    const respuesta =
      await fetch(`${API}/api/horarios`);

    const horarios =
      await respuesta.json();

    tablaHorarios.innerHTML = '';

    // SOLO LOS DEL PROFESOR LOGUEADO

    const misHorarios =
      horarios.filter(h =>
        h.profesor_nombre === nombre
      );

    // SIN DATOS

    if(misHorarios.length === 0){

      tablaHorarios.innerHTML = `
        <tr>

          <td colspan="5"
            style="
              text-align:center;
              padding:30px;
              color:#64748b;
            ">

            No tienes horarios registrados

          </td>

        </tr>
      `;

      return;

    }

    // RECORRER

    misHorarios.forEach(horario => {

      const estadoClase =
        horario.estado === 'disponible'
          ? 'status-available'
          : 'status-busy';

      tablaHorarios.innerHTML += `

        <tr>

          <td>
            ${horario.fecha}
          </td>

          <td>
            <strong>
              ${horario.materia}
            </strong>
          </td>

          <td>
            ${horario.hora_inicio}
          </td>

          <td>

            <span class="
              status-badge
              ${estadoClase}
            ">

              ${horario.estado}

            </span>

          </td>

          <td class="actions">

            <i
              class="fas fa-trash"
              style="
                color:red;
                cursor:pointer;
              "
              onclick="eliminarHorario(${horario.id})">
            </i>

          </td>

        </tr>

      `;

    });

  }catch(error){

    console.error(error);

    alert('Error cargando horarios');

  }

}

// =========================================
// GUARDAR HORARIO
// =========================================

formHorario.addEventListener('submit', async (e) => {

  e.preventDefault();

  const materia =
    document.getElementById('materia')
    .value
    .trim();

  const fecha =
    document.getElementById('fecha')
    .value;

  const hora_inicio =
    document.getElementById('hora_inicio')
    .value;

  // VALIDACIÓN

  if(
    !materia ||
    !fecha ||
    !hora_inicio
  ){

    alert('Completa todos los campos');

    return;

  }

  try{

    const respuesta =
      await fetch(`${API}/api/horarios`, {

        method:'POST',

        headers:{

          'Content-Type':'application/json',

          'Authorization':
            `Bearer ${token}`

        },

        body: JSON.stringify({

          profesor_nombre: nombre,

          materia,

          fecha,

          hora_inicio

        })

      });

    const data =
      await respuesta.json();

    // ERROR API

    if(!respuesta.ok){

      alert(data.error || 'Error');

      return;

    }

    // OK

    alert('Horario agregado correctamente');

    formHorario.reset();

    modal.style.display = 'none';

    cargarHorarios();

  }catch(error){

    console.error(error);

    alert('Error del servidor');

  }

});

// =========================================
// ELIMINAR HORARIO
// =========================================

async function eliminarHorario(id){

  const confirmar =
    confirm('¿Eliminar horario?');

  if(!confirmar) return;

  try{

    const respuesta =
      await fetch(`${API}/api/horarios/${id}`, {

        method:'DELETE',

        headers:{

          'Authorization':
            `Bearer ${token}`

        }

      });

    const data =
      await respuesta.json();

    if(!respuesta.ok){

      alert(data.error);

      return;

    }

    alert('Horario eliminado');

    cargarHorarios();

  }catch(error){

    console.error(error);

    alert('Error eliminando horario');

  }

}

// =========================================
// INICIAR
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  cargarHorarios();

});