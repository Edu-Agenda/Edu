const request = require('supertest');
const app = require('../server');

describe('Gestión de usuarios (admin)', () => {
  let adminToken;

  beforeAll(async () => {
    const loginAdmin = await request(app)
      .post('/login')
      .send({ email: 'admin@eduagenda.com', password: 'Admin1234' });
    adminToken = loginAdmin.body.token;
  });

  test('Listar usuarios autenticado → 200 con array', async () => {
    const response = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Puede estar vacío al inicio, pero debe ser un array
    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty('nombre');
      expect(response.body[0]).not.toHaveProperty('password');
    }
  });

  test('Eliminar usuario como admin → 200', async () => {
    // Registrar usuario para eliminar
    const registro = await request(app).post('/registro').send({
      nombre: 'Eliminar',
      email: 'eliminar@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    expect(registro.status).toBe(201);
    
    const usuarios = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminToken}`);
    const usuario = usuarios.body.find(u => u.email === 'eliminar@test.com');
    expect(usuario).toBeDefined();
    
    const response = await request(app)
      .delete(`/usuarios/${usuario.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  test('Eliminar usuario como no-admin → 403', async () => {
    // Registrar profesor
    await request(app).post('/registro').send({
      nombre: 'Profesor NoAdmin',
      email: 'profno@test.com',
      password: '123456',
      tipo: 'profesor'
    });
    const loginProf = await request(app)
      .post('/login')
      .send({ email: 'profno@test.com', password: '123456' });
    const profToken = loginProf.body.token;
    
    const response = await request(app)
      .delete('/usuarios/1')
      .set('Authorization', `Bearer ${profToken}`);
    expect(response.status).toBe(403);
  });

  test('Eliminar usuario inexistente → 404', async () => {
    const response = await request(app)
      .delete('/usuarios/99999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(404);
  });
});