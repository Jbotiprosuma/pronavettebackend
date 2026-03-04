// app/routes/v1/stats.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/stats.controller');
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Dashboard global
router.get('/dashboard', authenticateToken, controller.getDashboard);

// Statistiques détaillées (accessible à admin, superadmin, paie)
const PERM_STATS = ['system.config', 'navette.manage', 'mutation.edit'];

router.get('/absences', authenticateToken, authorize(PERM_STATS), controller.getAbsenceStats);
router.get('/accomptes', authenticateToken, authorize(PERM_STATS), controller.getAccompteStats);
router.get('/departs', authenticateToken, authorize(PERM_STATS), controller.getDepartStats);
router.get('/heures', authenticateToken, authorize(PERM_STATS), controller.getHeuresStats);
router.get('/mutations', authenticateToken, authorize(PERM_STATS), controller.getMutationStats);

module.exports = router;
