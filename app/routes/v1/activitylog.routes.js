// app/routes/v1/activitylog.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/activitylog.controller');
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Statistiques globales (admin uniquement)
router.get('/stats', authenticateToken, authorize(['system.config']), controller.getStats);

// Liste par module avec filtres (admin uniquement)
router.get('/', authenticateToken, authorize(['system.config']), controller.getByModule);

// Logs pour une entité spécifique (admin uniquement)
router.get('/:module/:targetId', authenticateToken, authorize(['system.config']), controller.getByTarget);

module.exports = router;
