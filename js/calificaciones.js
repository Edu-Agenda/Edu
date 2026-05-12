/**
 * ============================================================
 * EduAgenda — calificaciones.js  (PROFESOR)
 * ============================================================
 * Flujo:
 *  1. Al cargar: verifica token → muestra nombre → carga materias
 *  2. materiaSelect vacío → llama /api/tareas-profesor/todas
 *  3. materiaSelect con valor → llama /api/tareas-profesor/:id
 *  4. Los filtros de estado y búsqueda filtran sobre la lista
 *     ya cargada (sin nueva petición al servidor)
 *  5. guardarNota() hace PATCH /api/tareas/:id/calificar
 * ============================================================
 */

'use strict';

// ── Configuración ──────────────────────────────────────────
const API = '';          // servidor en el mismo origen
const token = localStorage.getItem('token');

// ── Seguridad: redirigir si no hay sesión ──────────────────
if (!token) {
    window.location.href = 'sesion.html';
}

// ── Elementos DOM ──────────────────────────────────────────
const tbody            = document.getElementById('calificacionesBody');
const materiaSelect    = document.getElementById('materiaSelect');
const estadoFilter     = document.getElementById('estadoFilter');
const busquedaInput    = document.getElementById('busquedaEstudiante');
const statTotal        = document.getElementById('statTotal');
const statEntregadas   = document.getElementById('statEntregadas');
const statPendientes   = document.getElementById('statPendientes');
const userNameDisplay  = document.getElementById('userNameDisplay');
const toastEl          = document.getElementById('toast');

// ── Estado local ───────────────────────────────────────────
let todasLasTareas = [];   // lista completa traída del servidor

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    mostrarNombreUsuario();
    await cargarMaterias();
    await cargarTareas();
    conectarFiltros();
});

// ── Nombre del profesor en el nav ──────────────────────────
function mostrarNombreUsuario() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (userNameDisplay) userNameDisplay.textContent = payload.nombre || 'Profesor';
    } catch (_) {
        if (userNameDisplay) userNameDisplay.textContent = 'Profesor';
    }
}

// ── Cargar materias del profesor ───────────────────────────
async function cargarMaterias() {
    try {
        const res = await apiFetch('/api/materias');
        const materias = await res.json();

        materiaSelect.innerHTML = '<option value="">Todas las materias</option>';

        if (!materias.length) return;

        materias.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nombre;
            materiaSelect.appendChild(opt);
        });

    } catch (e) {
        console.error('Error cargando materias:', e);
        toast('No se pudieron cargar las materias', 'err');
    }
}

// ── Cargar tareas según materia seleccionada ───────────────
async function cargarTareas() {
    setLoadingRow();

    try {
        const materiaId = materiaSelect.value;

        // Si hay materia elegida → endpoint por materia
        // Si no → todas las tareas del profesor
        const url = materiaId
            ? `/api/tareas-profesor/${materiaId}`
            : '/api/tareas-profesor/todas';

        const res = await apiFetch(url);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        todasLasTareas = await res.json();
        aplicarFiltros();

    } catch (e) {
        console.error('Error cargando tareas:', e);
        setErrorRow('No se pudieron cargar las tareas: ' + e.message);
    }
}

// ── Filtrar y renderizar ───────────────────────────────────
function aplicarFiltros() {
    let lista = [...todasLasTareas];

    // Filtro estado
    const estado = estadoFilter.value;
    if (estado === 'completada') {
        lista = lista.filter(t => t.estado === 'completada');
    } else if (estado === 'pendiente') {
        lista = lista.filter(t => t.estado !== 'completada');
    } else if (estado === 'calificada') {
        lista = lista.filter(t => t.calificacion !== null && t.calificacion !== '');
    }

    // Filtro búsqueda
    const q = (busquedaInput.value || '').toLowerCase().trim();
    if (q) {
        lista = lista.filter(t =>
            (t.estudiante_nombre || '').toLowerCase().includes(q)
        );
    }

    actualizarStats(lista);
    renderTabla(lista);
}

// ── Actualizar estadísticas ────────────────────────────────
function actualizarStats(lista) {
    statTotal.textContent      = lista.length;
    statEntregadas.textContent = lista.filter(t => t.estado === 'completada').length;
    statPendientes.textContent = lista.filter(
        t => t.calificacion === null || t.calificacion === ''
    ).length;
}

// ── Renderizar tabla ───────────────────────────────────────
function renderTabla(lista) {
    if (!lista.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">
                    <i class="fa-regular fa-folder-open" style="font-size:2rem; display:block; margin-bottom:.75rem;"></i>
                    No hay tareas para mostrar
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = lista.map(t => {
        const entregada      = t.estado === 'completada';
        const calificada     = t.calificacion !== null && t.calificacion !== '';
        const nota           = calificada ? t.calificacion : '';
        const comentario     = t.comentario_prof || '';
        const fechaLimite    = fmtFecha(t.fecha_entrega);
        const fechaEntrega   = t.entrega_fecha ? fmtFecha(t.entrega_fecha) : null;

        const badge = entregada
            ? `<span class="badge badge-entregada"><i class="fa-solid fa-check"></i> Entregada</span>`
            : `<span class="badge badge-pendiente"><i class="fa-solid fa-clock"></i> Pendiente</span>`;

        const entregaBox = (entregada && t.entrega_descripcion)
            ? `<div class="entrega-box"><i class="fa-solid fa-file-lines" style="margin-right:5px;"></i>${esc(t.entrega_descripcion)}</div>`
            : '';

        const fechaEntregaHtml = fechaEntrega
            ? `<small style="color:#64748b;">Entregada: ${fechaEntrega}</small><br>`
            : '';

        return `
        <tr>
            <!-- ESTUDIANTE -->
            <td>
                <strong style="display:block;">${esc(t.estudiante_nombre || '—')}</strong>
                <small style="color:#64748b;">${esc(t.materia_nombre || '')}</small>
            </td>

            <!-- TAREA -->
            <td>
                <span class="materia-tag">${esc(t.materia_nombre || '')}</span>
                <strong style="display:block; margin-bottom:2px;">${esc(t.descripcion)}</strong>
                <small style="color:#94a3b8;">Límite: ${fechaLimite}</small><br>
                ${fechaEntregaHtml}
                ${entregaBox}
            </td>

            <!-- ESTADO -->
            <td>${badge}${calificada ? `<br><span class="badge badge-calificada" style="margin-top:4px;"><i class="fa-solid fa-star"></i> ${t.calificacion}</span>` : ''}</td>

            <!-- NOTA -->
            <td>
                <input
                    type="number"
                    class="nota-input"
                    data-id="${t.id}"
                    value="${nota}"
                    min="0" max="5" step="0.1"
                    placeholder="0–5"
                >
            </td>

            <!-- COMENTARIO -->
            <td>
                <textarea
                    class="obs-input"
                    data-id="${t.id}"
                    rows="2"
                    placeholder="Comentario para el estudiante..."
                >${esc(comentario)}</textarea>
            </td>

            <!-- GUARDAR -->
            <td style="text-align:center;">
                <button
                    class="btn-save"
                    id="btn-${t.id}"
                    onclick="guardarNota(${t.id})"
                    title="Guardar calificación"
                >
                    <i class="fa-solid fa-floppy-disk"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── Guardar nota ───────────────────────────────────────────
async function guardarNota(id) {
    const notaEl  = document.querySelector(`.nota-input[data-id="${id}"]`);
    const obsEl   = document.querySelector(`.obs-input[data-id="${id}"]`);
    const btn     = document.getElementById(`btn-${id}`);

    if (!notaEl || !obsEl || !btn) return;

    const nota      = parseFloat(notaEl.value);
    const comentario = obsEl.value.trim();

    // Validación
    if (isNaN(nota) || nota < 0 || nota > 5) {
        toast('La nota debe estar entre 0 y 5', 'err');
        notaEl.focus();
        return;
    }

    // Estado visual: cargando
    const iconOriginal = btn.innerHTML;
    btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled   = true;

    try {
        const res = await apiFetch(`/api/tareas/${id}/calificar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calificacion: nota, comentario })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        // Actualizar datos locales para que los filtros no borren la nota
        const tarea = todasLasTareas.find(t => t.id === id);
        if (tarea) {
            tarea.calificacion    = nota;
            tarea.comentario_prof = comentario;
        }

        btn.innerHTML      = '<i class="fa-solid fa-check"></i>';
        btn.style.background = '#059669';
        toast('Calificación guardada', 'ok');

        setTimeout(() => {
            btn.innerHTML        = iconOriginal;
            btn.style.background = '';
            btn.disabled         = false;
            aplicarFiltros();   // re-render para mostrar badge calificada
        }, 1800);

    } catch (e) {
        console.error('Error al guardar nota:', e);
        btn.innerHTML      = '<i class="fa-solid fa-xmark"></i>';
        btn.style.background = '#dc2626';
        toast('Error al guardar: ' + e.message, 'err');

        setTimeout(() => {
            btn.innerHTML        = iconOriginal;
            btn.style.background = '';
            btn.disabled         = false;
        }, 2000);
    }
}

// ── Helpers ────────────────────────────────────────────────

/** fetch con token adjunto automáticamente */
function apiFetch(url, opts = {}) {
    opts.headers = {
        ...(opts.headers || {}),
        'Authorization': `Bearer ${token}`
    };
    return fetch(url, opts);
}

/** Escapar HTML para evitar XSS */
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Formatear fecha legible */
function fmtFecha(f) {
    if (!f) return 'N/A';
    const d = new Date(f);
    if (isNaN(d)) return f;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Fila de carga */
function setLoadingRow() {
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="6" style="text-align:center; padding:2.5rem; color:#64748b;">
                <i class="fa-solid fa-spinner fa-spin"></i> &nbsp;Cargando...
            </td>
        </tr>`;
    statTotal.textContent = statEntregadas.textContent = statPendientes.textContent = '—';
}

/** Fila de error */
function setErrorRow(msg) {
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center; padding:2.5rem; color:#dc2626;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:1.5rem; display:block; margin-bottom:.5rem;"></i>
                ${esc(msg)}
            </td>
        </tr>`;
}

/** Toast de notificación */
let toastTimer;
function toast(msg, tipo = 'ok') {
    clearTimeout(toastTimer);
    toastEl.className = `show ${tipo}`;
    toastEl.innerHTML = `<i class="fa-solid ${tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${esc(msg)}`;
    toastTimer = setTimeout(() => {
        toastEl.className = '';
    }, 3000);
}

/** Conectar eventos de filtros */
function conectarFiltros() {
    materiaSelect.addEventListener('change', cargarTareas);
    estadoFilter.addEventListener('change', aplicarFiltros);
    busquedaInput.addEventListener('input', aplicarFiltros);
}