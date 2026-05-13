const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');

describe('Verificación de token y middleware', () => {
  let adminToken, estudianteToken;

  beforeAll(async () => {
    // Registrar un estudiante
    await request(app).post('/registro').send({
      nombre: 'Estudiante Token',
      email: 'tokenest@test.com',
      password: '123456',
      tipo: 'estudiante'
    });
    const loginEst = await request(app)
      .post('/login')
      .send({ email: 'tokenest@test.com', password: '123456' });
    estudianteToken = loginEst.body.token;

    const loginAdmin = await request(app)
      .post('/login')
      .send({ email: 'admin@eduagenda.com', password: 'Admin1234' });
    adminToken = loginAdmin.body.token;
  });

  test('GET /verificar con token válido → 200', async () => {
    const response = await request(app)
      .get('/verificar')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.usuario).toHaveProperty('email', 'admin@eduagenda.com');
  });

  test('GET /verificar con token inválido → 401', async () => {
    const response = await request(app)
        .get('/verificar')
        .set('Authorization', 'Bearer token_falso');
    expect(response.status).toBe(401);
    // El mensaje puede ser "Sesión expirada" o "Token inválido" - ambos son válidos
    expect(response.body.error).toBeDefined();
});

  test('GET /verificar con token inválido → 401', async () => {
    const response = await request(app)
      .get('/verificar')
      .set('Authorization', 'Bearer token_falso');
    expect(response.status).toBe(401);
    // El mensaje puede ser "Sesión expirada" o "Token inválido"
    expect(response.body.error).toBeDefined();
  });

  test('Ruta protegida sin token → 401', async () => {
    const response = await request(app).get('/usuarios');
    expect(response.status).toBe(401);
  });

  test('Ruta protegida con token de estudiante accediendo a acción de admin (eliminar usuario) → 403', async () => {
    const response = await request(app)
      .delete('/usuarios/1')
      .set('Authorization', `Bearer ${estudianteToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/permiso/i);
  });
});