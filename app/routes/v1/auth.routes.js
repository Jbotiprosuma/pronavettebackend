const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../../controllers/auth.controller');

// Limite les tentatives de connexion : 10 requêtes / 15 minutes par IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

router.post('/login', loginLimiter, authController.login);

module.exports = router;