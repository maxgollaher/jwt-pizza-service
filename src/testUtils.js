const { DB, Role } = require('./database/database.js');

async function createAdminUser()
{
    let user = {
        name: 'admin' + Math.random().toString(36).substring(2, 12),
        password: 'password',
        email: 'admin' + Math.random().toString(36).substring(2, 12) + '@test.com',
        roles: [{ role: Role.Admin }]
    };
    await DB.addUser(user);
    user.password = 'password';
    user.id = (await DB.getUser(user.email, user.password)).id;

    return user;
}

module.exports = { createAdminUser };