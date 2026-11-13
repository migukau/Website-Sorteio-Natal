const { app, initializeDatabase } = require('../mongo-server');

module.exports = async function handler(req, res) {
    await initializeDatabase();
    return app(req, res);
};
