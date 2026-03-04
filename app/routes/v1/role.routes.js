// app/routes/role.routes.js
const express = require('express');
const router = express.Router();
const controller = require("../../controllers/role.controller");
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Lister tous les rôles (peut être accessible à tous les utilisateurs authentifiés pour la consultation)
router.get("/", authenticateToken, authorize(['system.config','user.manage']), controller.getAllRoles);

// Récupérer un rôle par ID ou slug (peut être accessible à tous les utilisateurs authentifiés pour la consultation)
router.get("/:identifier", authenticateToken, authorize(['system.config','user.manage']), controller.getRoleByIdOrSlug);

// Créer un nouveau rôle (nécessite des permissions d'admin/super_admin)
router.post("/", authenticateToken, authorize(['system.config']), controller.createRole);

// Mettre à jour un rôle (nécessite des permissions d'admin/super_admin)
router.put("/:identifier", authenticateToken, authorize(['system.config']), controller.updateRole);
router.patch("/:identifier", authenticateToken, authorize(['system.config']), controller.updateRole);

// Supprimer un rôle (nécessite des permissions d'admin/super_admin)
router.delete("/:identifier", authenticateToken, authorize(['system.config']), controller.deleteRole);

module.exports = router;