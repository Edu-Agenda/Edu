const request = require('supertest');
const app = require('../server');

describe('Autenticación - Registro y Login', () => {
  
  test('Registro exitoso de estudiante', async () => {
    const nuevoUsuario = {
      nombre: 'Juan Perez',
      documento: '12345678',
      email: 'juan@test.com',
      telefono: '3001234567',
      password: '123456',
      tipo: 'estudiante'
    };

    const response = await request(app)
      .post('/registro')
      .send(nuevoUsuario);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.mensaje).toMatch(/registrado/i);
  });

  test('Registro exitoso de profesor', async () => {
    const nuevoProfesor = {
      nombre: 'Maria Gomez',
      documento: '87654321',
      email: 'maria@test.com',
      telefono: '3007654321',
      password: '654321',
      tipo: 'profesor'
    };
    const response = await request(app).post('/registro').send(nuevoProfesor);
    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  test('Registro con campos faltantes → 400', async () => {
    const incompleto = { nombre: 'Incompleto', email: 'falta@test.com' };
    const response = await request(app).post('/registro').send(incompleto);
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('Registro con email del admin → 400', async () => {
    const adminUser = {
      nombre: 'Admin',
      documento: '000000',
      email: 'admin@eduagenda.com',
      telefono: '000',
      password: 'Admin1234',
      tipo: 'estudiante'
    };
    const response = await request(app).post('/registro').send(adminUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/no está disponible/i);
  });

  test('Registro con tipo inválido → 400', async () => {
    const invalido = {
      nombre: 'Invalido',
      email: 'invalido@test.com',
      password: '123456',
      tipo: 'alien'
    };
    const response = await request(app).post('/registro').send(invalido);
    expect(response.status).toBe(400);
  });

  test('Registro con email duplicado → 400', async () => {
    const usuario = {
      nombre: 'Duplicado',
      email: 'duplicado@test.com',
      password: '123456',
      tipo: 'estudiante'
    };
    await request(app).post('/registro').send(usuario);
    const response = await request(app).post('/registro').send(usuario);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/correo ya está registrado/i);
  });

  test('Login exitoso como admin', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'admin@eduagenda.com', password: 'Admin1234' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.tipo).toBe('admin');
  });

  test('Login exitoso como estudiante (previamente registrado)', async () => {
    await request(app).post('/registro').send({
      nombre: 'Luis Estudiante',
      email: 'luis@test.com',
      password: 'pass123',
      tipo: 'estudiante'
    });
    const response = await request(app)
      .post('/login')
      .send({ email: 'luis@test.com', password: 'pass123' });
    expect(response.status).toBe(200);
    expect(response.body.tipo).toBe('estudiante');
    expect(response.body.nombre).toBe('Luis Estudiante');
  });

  test('Login con contraseña incorrecta → 401', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'admin@eduagenda.com', password: 'wrong' });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/incorrectas/i);
  });

  test('Login con usuario inexistente → 401', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'noexiste@test.com', password: 'cualquiera' });
    expect(response.status).toBe(401);
  });

  test('Login sin campos → 400', async () => {
    const response = await request(app).post('/login').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/requeridos/i);
  });
});