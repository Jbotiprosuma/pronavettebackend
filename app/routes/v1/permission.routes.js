// app/routes/role.routes.js
const express = require('express');
const router = express.Router();
const controller = require("../../controllers/permission.controller");
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// Lister tous les rôles (peut être accessible à tous les utilisateurs authentifiés pour la consultation)
router.get("/", authenticateToken, authorize(['system.config']), controller.getAllPermissions);

module.exports = router;