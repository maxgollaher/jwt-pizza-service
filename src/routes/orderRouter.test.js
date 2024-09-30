
const { createAdminUser } = require('../testUtils.js');
const request = require('supertest');
const app = require('../service');

const { DB } = require('../database/database.js');


let menuItem;

beforeAll(async () =>
{
    testUser = await createAdminUser();

    const loginRes = await request(app).put('/api/auth').send(testUser);
    testUserAuthToken = loginRes.body.token;

    menuItem =
    {
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight'
    };
    menuItem = await DB.addMenuItem(menuItem);
});

test('getMenu', async () =>
{
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    const item = res.body.find(f => f.id === menuItem.id);
    expect(item).toEqual(menuItem);
});

test('addMenuItem', async () =>
{
    let menuItem = { title: 'Student', description: 'No topping, no sauce, just carbs', image: 'pizza9.png', price: 0.0001 };
    const res = await request(app)
        .put('/api/order/menu')
        .send({ ...menuItem, testUser })
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject(menuItem);
});
