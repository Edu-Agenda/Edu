const request = require('supertest');
const app = require('../server');

describe('Reservas y pagos', () => {
  let estudianteToken, estudianteNombre;
  let profesorToken, profesorNombre;
  let horarioId;

  beforeAll(async () => {
    // Registrar estudiante
    await request(app).post('/registro').send({
      nombre: 'Estudiante Reserva',
      email: 'estreserva@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    const loginEst = await request(app)
      .post('/login')
      .send({ email: 'estreserva@test.com', password: '123456' });
    estudianteToken = loginEst.body.token;
    estudianteNombre = loginEst.body.nombre;

    // Registrar profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor Reserva',
      email: 'profreserva@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const loginProf = await request(app)
      .post('/login')
      .send({ email: 'profreserva@test.com', password: '123456' });
    profesorToken = loginProf.body.token;
    profesorNombre = loginProf.body.nombre;

    // Crear horario disponible
    const horario = await request(app)
      .post('/api/horarios')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        profesor_nombre: profesorNombre,
        materia: 'Química',
        fecha: '2026-12-27',
        hora_inicio: '09:00'
      });
    horarioId = horario.body.id;
  });

  test('Confirmar reserva con datos completos → 200', async () => {
    const reserva = {
      estudiante: estudianteNombre,
      fecha: '2026-12-27',
      hora: '09:00',
      materia: 'Química',
      profesor: profesorNombre
    };
    const response = await request(app)
      .post('/confirmar-pago')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send(reserva);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.mensaje).toMatch(/confirmada/i);
  });

  test('Confirmar reserva con campos faltantes → 400', async () => {
    const incompleta = { estudiante: estudianteNombre, materia: 'Incompleta' };
    const response = await request(app)
      .post('/confirmar-pago')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send(incompleta);
    expect(response.status).toBe(400);
  });

  test('Confirmar reserva crea materia automáticamente', async () => {
    const nuevaMateria = 'Programación';
    const reserva = {
      estudiante: estudianteNombre,
      fecha: '2026-12-28',
      hora: '10:00',
      materia: nuevaMateria,
      profesor: profesorNombre
    };
    await request(app)
      .post('/confirmar-pago')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send(reserva);
    // Verificar que la materia fue creada
    const materiasProf = await request(app)
      .get('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`);
    const existe = materiasProf.body.some(m => m.nombre === nuevaMateria);
    expect(existe).toBe(true);
  });

  test('Cancelar clase por ID → 200', async () => {
    // Primero crear y reservar una clase
    const nuevoHorario = await request(app)
      .post('/api/horarios')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        profesor_nombre: profesorNombre,
        materia: 'ParaCancelar',
        fecha: '2026-12-29',
        hora_inicio: '12:00'
      });
    const idHorario = nuevoHorario.body.id;
    // Reservarla
    await request(app)
      .post('/confirmar-pago')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send({
        estudiante: estudianteNombre,
        fecha: '2026-12-29',
        hora: '12:00',
        materia: 'ParaCancelar',
        profesor: profesorNombre
      });
    // Cancelar
    const cancel = await request(app)
      .post('/api/cancelar-clase')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send({ id: idHorario });
    expect(cancel.status).toBe(200);
    expect(cancel.body.ok).toBe(true);
  });

  test('Cancelar clase inexistente → 404', async () => {
    const response = await request(app)
      .post('/api/cancelar-clase')
      .set('Authorization', `Bearer ${estudianteToken}`)
      .send({ id: 999999 });
    expect(response.status).toBe(404);
  });

  test('Consultar ingresos del profesor → 200', async () => {
    const response = await request(app)
      .get('/api/ingresos-stats')
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalIngresos');
    expect(response.body).toHaveProperty('cantidadReservas');
    expect(typeof response.body.totalIngresos).toBe('number');
  });

  test('Listar mis-estudiantes del profesor → 200', async () => {
    const response = await request(app)
      .get('/api/mis-estudiantes')
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});