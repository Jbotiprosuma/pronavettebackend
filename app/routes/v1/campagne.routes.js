// app/routes/v1/campagne.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/campagne.controller');
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Liste complète (programmées + exécutées)
router.get('/', authenticateToken, authorize(['system.config', 'navette.manage']), controller.listAll);

// Statut du mois courant
router.get('/current-month', authenticateToken, authorize(['system.config', 'navette.manage']), controller.currentMonthStatus);

// Lancer manuellement une campagne (mois courant)
router.post('/launch', authenticateToken, authorize(['system.config', 'navette.manage']), controller.launch);

// Programmer des campagnes futures
router.post('/schedule', authenticateToken, authorize(['system.config', 'navette.manage']), controller.schedule);

// Modifier une campagne programmée
router.put('/:id', authenticateToken, authorize(['system.config', 'navette.manage']), controller.update);

// Activer/Désactiver une campagne programmée
router.put('/:id/toggle', authenticateToken, authorize(['system.config', 'navette.manage']), controller.toggle);

// Prolonger une campagne exécutée
router.put('/:id/extend', authenticateToken, authorize(['system.config', 'navette.manage']), controller.extend);

// Modifier les dates d'une campagne exécutée
router.put('/:id/dates', authenticateToken, authorize(['system.config', 'navette.manage']), controller.updateDates);

// Supprimer une campagne programmée (non exécutée)
router.delete('/:id', authenticateToken, authorize(['system.config', 'navette.manage']), controller.remove);

// Supprimer une campagne exécutée (avec ses navettes)
router.delete('/:id/executed', authenticateToken, authorize(['system.config', 'navette.manage']), controller.deleteExecuted);

module.exports = router;
