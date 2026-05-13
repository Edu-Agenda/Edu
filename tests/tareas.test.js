const request = require('supertest');
const app = require('../server');

describe('Tareas', () => {
  let profesorToken, profesorNombre, estudianteToken, estudianteNombre;
  let materiaId;

  beforeAll(async () => {
    // Registrar profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor Tareas',
      email: 'proftareas@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const loginProf = await request(app)
      .post('/login')
      .send({ email: 'proftareas@test.com', password: '123456' });
    profesorToken = loginProf.body.token;
    profesorNombre = loginProf.body.nombre;

    // Registrar estudiante
    await request(app).post('/registro').send({
      nombre: 'Estudiante Tareas',
      email: 'esttareas@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    const loginEst = await request(app)
      .post('/login')
      .send({ email: 'esttareas@test.com', password: '123456' });
    estudianteToken = loginEst.body.token;
    estudianteNombre = loginEst.body.nombre;

    // Crear materia
    const materia = await request(app)
      .post('/api/materias')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        nombre: 'Tareas Materia',
        estudiante_nombre: estudianteNombre,
        profesor_nombre: profesorNombre,
        horario: 'Jueves 2pm'
      });
    materiaId = materia.body.id;
  });

  test('Crear tarea → 201', async () => {
    const tarea = {
      materiaId: materiaId,
      descripcion: 'Resolver ejercicios del capítulo 1',
      fecha_entrega: '2026-12-30'
    };
    const response = await request(app)
      .post('/api/tareas')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send(tarea);
    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.id).toBeDefined();
  });

  test('Listar tareas por materia → 200', async () => {
    const response = await request(app)
      .get(`/api/tareas/materia/${materiaId}`)
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Eliminar tarea → 200', async () => {
    const crear = await request(app)
      .post('/api/tareas')
      .set('Authorization', `Bearer ${profesorToken}`)
      .send({
        materiaId: materiaId,
        descripcion: 'Eliminar',
        fecha_entrega: '2026-12-31'
      });
    const id = crear.body.id;
    const response = await request(app)
      .delete(`/api/tareas/${id}`)
      .set('Authorization', `Bearer ${profesorToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});