const request = require('supertest');
const app = require('../server');

describe('Notas / Calificaciones', () => {
  let profesorToken, estudianteToken, estudianteNombre, materiaId;

  beforeAll(async () => {
    // Profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor Notas',
      email: 'profnotas@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const loginProf = await request(app)
      .post('/login')
      .send({ email: 'profnotas@test.com', password: '123456' });
    profesorToken = loginProf.body.token;

    // Estudiante
    await request(app).post('/registro').send({
      nombre: 'Estudiante Notas',
      email: 'estnotas@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    const loginEst = await request(app)
      .post('/login')
      .send({ email: 'estnotas@test.com', password: '123456' });
    estudianteToken = loginEst.body.token;
    estudianteNombre = loginEst.body.nombre;

    // Crear materia
    const materia = await request(app)
      .post('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        nombre: 'Notas Materia',
        estudiante_nombre: estudianteNombre,
        profesor_nombre: 'Profesor Notas',
        horario: 'Viernes 3pm'
      });
    materiaId = materia.body.id;
  });

  test('Consultar notas de estudiante (puede estar vacío) → 200', async () => {
    const response = await request(app)
      .get(`/api/notas/estudiante/${estudianteNombre}`)
      .set('Authorization', `Bearer ${estudianteToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});