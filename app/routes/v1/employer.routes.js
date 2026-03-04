// app/routes/v1/employer.routes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const controller = require("../../controllers/employer.controller");
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/uploadExcel.middleware');

// Limite l'import : 5 requêtes / 10 minutes par IP
const importLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives d\'import. Réessayez dans 10 minutes.' },
});

// 1. Lister tous les employés
router.get(
  "/",
  authenticateToken,
  controller.getAllEmployers
);

// 1b. Exporter les employés en Excel
router.get(
  "/export",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.exportEmployersToExcel
);

// 1c. Corbeille — Lister les employés supprimés
router.get(
  "/trash",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.getTrashedEmployers
);

// 2. Créer un nouvel employé manuellement
router.post(
  "/",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.createEmployer
);

// 3. Importer des employés depuis un fichier Excel
router.post(
  "/import",
  importLimiter,
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  upload.single('file'),
  controller.importEmployersFromExcel
);

// 3b. Suppression multiple (soft delete)
router.post(
  "/bulk-delete",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.bulkDeleteEmployers
);

// 3c. Restauration multiple
router.post(
  "/bulk-restore",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.bulkRestoreEmployers
);

// 4. Récupérer un employé par ID ou slug
router.get(
  "/:identifier",
  authenticateToken,
  controller.getEmployerByIdOrSlug
);

// 4b. Restaurer un employé depuis la corbeille
router.post(
  "/:identifier/restore",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage']),
  controller.restoreEmployer
);

// 5. Mettre à jour un employé
router.put(
  "/:identifier",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage', 'employers.service.edit']),
  controller.updateEmployer
);

// 6. Basculer le statut d'un employé (Activé/Désactivé)
router.patch(
  "/:identifier/toggle-status",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage', 'employers.service.edit']),
  controller.toggleEmployerStatus
);

// 7. Supprimer un employé (soft delete)
router.delete(
  "/:identifier",
  authenticateToken,
  authorize(['import.manage', 'employers.manage', 'employers.service.manage', 'employers.service.edit']),
  controller.deleteEmployer
);

// 7b. Suppression définitive (force delete)
router.delete(
  "/:identifier/force",
  authenticateToken,
  authorize(['import.manage', 'employers.manage']),
  controller.forceDeleteEmployer
);

module.exports = router;