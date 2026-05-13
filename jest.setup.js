// Jest setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'clave_secreta_eduagenda_2024';

// Global timeout for tests
jest.setTimeout(10000);

// Optional: Suppress console logs during tests (uncomment if needed)
// console.log = jest.fn();
// console.error = jest.fn();