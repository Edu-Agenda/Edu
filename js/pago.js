document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // 1. VERIFICAR SESIÓN Y RESERVA
    // =========================
    const token = localStorage.getItem('token') || 'demo-token'; // Fallback para pruebas
    const reservaStr = localStorage.getItem('reserva_pendiente');

    if (!reservaStr) {
        alert('No hay reserva pendiente. Selecciona un horario primero.');
        window.location.href = 'estudiante.html';
        return;
    }

    const reserva = JSON.parse(reservaStr);

    // =========================
    // 2. POBLAR INTERFAZ
    // =========================
    const precio = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(reserva.precio || 50000);

    // Elementos de la UI
    document.getElementById('profName').innerText = reserva.profesor || 'Profesor';
    document.getElementById('profMateria').innerText = `Profesor de ${reserva.materia || 'la materia'}`;
    document.getElementById('resMateria').innerText = reserva.materia || '—';
    document.getElementById('resFecha').innerText = reserva.fecha || '—';
    document.getElementById('resHora').innerText = reserva.hora || '—';
    document.getElementById('resTotal').innerText = precio;
    document.getElementById('resPrecioLin').innerText = precio;
    document.getElementById('btnTotal').innerText = precio;
    
    if(document.getElementById('cardName')) {
        document.getElementById('cardName').value = reserva.estudiante || '';
    }

    const iniciales = (reserva.profesor || 'PR')
        .split(' ')
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const avatar = document.getElementById('avatarLetras');
    if (avatar) avatar.innerText = iniciales;

    // =========================
    // 3. TEMPORIZADOR 15 MINUTOS
    // =========================
    let segundos = 15 * 60;
    const timerEl = document.getElementById('timerDisplay');
    const timerBox = document.getElementById('timerBox');

    const tick = setInterval(() => {
        segundos--;
        const m = String(Math.floor(segundos / 60)).padStart(2, '0');
        const s = String(segundos % 60).padStart(2, '0');
        if (timerEl) timerEl.innerText = `${m}:${s}`;

        if (segundos <= 60 && timerBox) {
            timerBox.className = 'timer-box urgent';
        }

        if (segundos <= 0) {
            clearInterval(tick);
            alert('⏰ El tiempo para completar el pago expiró.');
            localStorage.removeItem('reserva_pendiente');
            window.location.href = 'estudiante.html';
        }
    }, 1000);

    // =========================
    // 4. MÉTODOS DE PAGO Y FORMATEO
    // =========================
    const metodos = ['metodoTarjeta', 'metodoPSE', 'metodoNequi'];

    metodos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                metodos.forEach(m => {
                    const opt = document.getElementById(m);
                    opt.classList.remove('selected');
                    opt.querySelector('input[type=radio]').checked = false;
                });
                el.classList.add('selected');
                el.querySelector('input[type=radio]').checked = true;
            });
        }
    });

    // Formateo de inputs
    document.getElementById('cardNumber')?.addEventListener('input', function() {
        let v = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = v.replace(/(.{4})/g, '$1 ').trim();
    });

    // =========================
    // 5. VALIDACIÓN Y PROCESAMIENTO
    // =========================
    function validar() {
        const metodoActivo = document.querySelector('.method-option.selected')?.id;
        if (!metodoActivo) return false;

        let ok = true;
        const marcarError = (id, condicion) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (condicion) { el.classList.add('error'); ok = false; }
            else { el.classList.remove('error'); }
        };

        if (metodoActivo === 'metodoTarjeta') {
            const num = document.getElementById('cardNumber').value.replace(/\s/g, '');
            marcarError('cardNumber', num.length < 16);
            marcarError('cardName', !document.getElementById('cardName').value.trim());
            marcarError('cardCvv', document.getElementById('cardCvv').value.length < 3);
        }
        // ... puedes añadir más validaciones para PSE y Nequi aquí
        return ok;
    }

    document.getElementById('confirmPay').addEventListener('click', async () => {
        if (!validar()) {
            alert('Por favor, completa los campos marcados en rojo.');
            return;
        }

        const btn = document.getElementById('confirmPay');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        try {
            // Simulamos una espera de red
            await new Promise(resolve => setTimeout(resolve, 2000));

            // INTENTO DE LLAMADA REAL (Si tienes el endpoint listo)
            /*
            const response = await fetch('/confirmar-pago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...reserva, fechaPago: new Date() })
            });
            if (!response.ok) throw new Error('Error en servidor');
            */

            // Lógica de éxito (Simulada para desarrollo local)
            clearInterval(tick);

            // 1. Obtener clases actuales
            let misClases = JSON.parse(localStorage.getItem('mis_clases') || '[]');
            
            // 2. Añadir la nueva clase pagada
            misClases.push({
                ...reserva,
                id_pago: 'PAY-' + Math.floor(Math.random() * 1000000),
                fecha_registro: new Date().toISOString()
            });

            // 3. Guardar y limpiar
            localStorage.setItem('mis_clases', JSON.stringify(misClases));
            localStorage.removeItem('reserva_pendiente');

            mostrarExito(reserva, precio);

        } catch (error) {
            alert('❌ ' + error.message);
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-lock"></i> Pagar ahora — ${precio}`;
        }
    });

    function mostrarExito(r, precioStr) {
        const screenPago = document.getElementById('paymentScreen');
        const screenExito = document.getElementById('successScreen');
        
        if (screenPago) screenPago.style.display = 'none';
        if (screenExito) {
            screenExito.classList.add('show');
            document.getElementById('successDetails').innerHTML = `
                <div class="detail-pill"><span>Materia</span><strong>${r.materia}</strong></div>
                <div class="detail-pill"><span>Profesor</span><strong>${r.profesor}</strong></div>
                <div class="detail-pill"><span>Fecha</span><strong>${r.fecha}</strong></div>
                <div class="detail-pill"><span>Hora</span><strong>${r.hora}</strong></div>
                <div class="detail-pill"><span>Total</span><strong style="color:#0061ff;">${precioStr}</strong></div>
            `;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});