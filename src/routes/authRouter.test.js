const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeEach(async () =>
{
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    testUserId = registerRes.body.user.id;
});

test('register', async () =>
{
    const registerRes = await request(app).post('/api/auth').send(testUser);
    expect(registerRes.status).toBe(200);
    expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const { id, password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
    expect(registerRes.body.user).toMatchObject(user);
    expect(password).toBe(testUser.password);
    expect(id).toBe(testUser.id);
});

test('register missing fields', async () =>
{
    const registerRes = await request(app).post('/api/auth').send({});
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('login', async () =>
{
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const { id, password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
    expect(loginRes.body.user).toMatchObject(user);
    expect(password).toBe(testUser.password);
    expect(id).toBe(testUser.id);
});

test('logout', async () =>
{
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
});

test('updateUser', async () =>
{
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const updateUserRes = await request(app)
        .put(`/api/auth/${testUserId}`)
        .send(testUser).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(updateUserRes.status).toBe(200);
    expect(updateUserRes.body.email).toBe(testUser.email);
});

test('updateUser, wrong userId, throws error', async () =>
{
    const updateUserRes = await request(app)
        .put(`/api/auth/${testUserId + 1}`)
        .send(testUser).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(updateUserRes.status).toBe(403);
    expect(updateUserRes.body.message).toBe('unauthorized');
});
    