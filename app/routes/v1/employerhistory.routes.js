// app/routes/v1/employerhistory.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/employerhistory.controller');
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Liste des employés avec résumé
router.get('/employees', authenticateToken, controller.listEmployeesWithSummary);

// Recherche globale dans l'historique
router.get('/search', authenticateToken, controller.searchHistory);

// Synchronisation initiale (one-shot, admin uniquement)
router.post('/sync', authenticateToken, authorize(['system.config']), controller.syncHistory);

// Historique d'un employé spécifique
router.get('/:employer_id', authenticateToken, controller.getEmployerHistory);

// Statistiques d'un employé
router.get('/:employer_id/stats', authenticateToken, controller.getEmployerStats);

module.exports = router;
