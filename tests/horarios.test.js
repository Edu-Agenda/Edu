const request = require('supertest');
const app = require('../server');

describe('Horarios', () => {
  let profesorToken, profesorNombre;

  beforeAll(async () => {
    // Registrar profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor Horarios',
      email: 'profhorarios@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const login = await request(app)
      .post('/login')
      .send({ email: 'profhorarios@test.com', password: '123456' });
    profesorToken = login.body.token;
    profesorNombre = login.body.nombre;
  });

  test('GET /api/horarios sin autenticación → 200', async () => {
    const response = await request(app).get('/api/horarios');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Crear horario con datos completos → 200', async () => {
    const nuevoHorario = {
      profesor_nombre: profesorNombre,
      materia: 'Matemáticas',
      fecha: '2026-12-25',
      hora_inicio: '10:00'
    };
    const response = await request(app)
      .post('/api/horarios')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send(nuevoHorario);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body).toHaveProperty('id');
  });

  test('Crear horario con campos faltantes → 400', async () => {
    const incompleto = { materia: 'Física' };
    const response = await request(app)
      .post('/api/horarios')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send(incompleto);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/faltan datos/i);
  });

  test('Eliminar horario existente → 200', async () => {
    // Crear horario primero
    const crear = await request(app)
      .post('/api/horarios')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        profesor_nombre: profesorNombre,
        materia: 'Eliminar',
        fecha: '2026-12-26',
        hora_inicio: '11:00'
      });
    const id = crear.body.id;
    const response = await request(app)
      .delete(`/api/horarios/${id}`)
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  test('Eliminar horario inexistente → 404', async () => {
    const response = await request(app)
      .delete('/api/horarios/999999')
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(404);
  });
});