const request = require('supertest');
const app = require('../server');

describe('Materias', () => {
  let profesorToken, profesorNombre, estudianteToken, estudianteNombre;

  beforeAll(async () => {
    // Profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor Materias',
      email: 'profmaterias@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const loginProf = await request(app)
      .post('/login')
      .send({ email: 'profmaterias@test.com', password: '123456' });
    profesorToken = loginProf.body.token;
    profesorNombre = loginProf.body.nombre;

    // Estudiante
    await request(app).post('/registro').send({
      nombre: 'Estudiante Materias',
      email: 'estmaterias@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    const loginEst = await request(app)
      .post('/login')
      .send({ email: 'estmaterias@test.com', password: '123456' });
    estudianteToken = loginEst.body.token;
    estudianteNombre = loginEst.body.nombre;
  });

  test('Crear materia nueva → 201', async () => {
    const nueva = {
      nombre: 'Álgebra',
      estudiante_nombre: estudianteNombre,
      profesor_nombre: profesorNombre,
      horario: 'Lunes 10am',
      modalidad: 'Virtual'
    };
    const response = await request(app)
      .post('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send(nueva);
    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.id).toBeDefined();
  });

  test('Listar materias del profesor → 200', async () => {
    const response = await request(app)
      .get('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Obtener materias de estudiante por nombre → 200', async () => {
    const response = await request(app)
      .get(`/api/materias/estudiante/${estudianteNombre}`)
      .set('Authorization', `Bearer ${estudianteToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Eliminar materia → 200', async () => {
    const crear = await request(app)
      .post('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        nombre: 'Eliminar',
        estudiante_nombre: estudianteNombre,
        profesor_nombre: profesorNombre,
        horario: 'Miércoles 11am'
      });
    const id = crear.body.id;
    const response = await request(app)
      .delete(`/api/materias/${id}`)
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  test('Eliminar materia inexistente → 404', async () => {
    const response = await request(app)
      .delete('/api/materias/99999')
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(404);
  });
});