const { createAdminUser } = require('../testUtils.js');
const request = require('supertest');
const app = require('../service');

let testUser;
let testUserAuthToken;
let mockFranchise;

beforeAll(async () =>
{
    testUser = await createAdminUser();

    const loginRes = await request(app).put('/api/auth').send(testUser);
    testUserAuthToken = loginRes.body.token;

    mockFranchise = {
        name: 'Pizza' + Math.random().toString(36).substring(2, 12),
        admins: [{ email: testUser.email }],
    };
    const res = await request(app).post('/api/franchise').send({ ...mockFranchise, testUser }).set('Authorization', `Bearer ${testUserAuthToken}`);
    mockFranchise.id = res.body.id;
});

test('getFranchises', async () =>
{
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    const franchise = res.body.find(f => f.id === mockFranchise.id);
    expect(franchise.name).toBe(mockFranchise.name);
});

test('getUserFranchises', async () =>
{
    const res = await request(app).get(`/api/franchise/${testUser.id}`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    const franchise = res.body.find(f => f.id === mockFranchise.id);
    expect(franchise.name).toBe(mockFranchise.name);
});

test('createFranchise', async () =>
{
    let mockFranchise = {
        name: 'Pizza' + Math.random().toString(36).substring(2, 12),
        admins: [testUser]
    };
    const res = await request(app).post('/api/franchise').send({ ...mockFranchise }).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(mockFranchise.name);
});

test('deleteFranchise', async () =>
{
    let mockFranchise = {
        name: 'Pizza' + Math.random().toString(36).substring(2, 12),
        admins: [testUser]
    };
    await request(app).post('/api/franchise').send({ ...mockFranchise }).set('Authorization', `Bearer ${testUserAuthToken}`);
    const res = await request(app).delete(`/api/franchise/${mockFranchise.id}`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('franchise deleted');
});

test('createStore', async () =>
{
    let mockStore = { "franchiseId": mockFranchise.id, "name": "SLC" }

    const res = await request(app).post(`/api/franchise/${mockFranchise.id}/store`).send({ ...mockStore }).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.franchiseId).toBe(mockStore.franchiseId);
    expect(res.body.name).toBe(mockStore.name);
});

