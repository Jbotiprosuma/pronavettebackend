// app/routes/service.routes.js
const express = require('express');
const router = express.Router(); // Création d'une instance de Router
const controller = require("../../controllers/service.controller");
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');

// 1. Lister tous les services
// La route est maintenant relative à l'endroit où ce routeur sera 'monté' (ex: /api/services)
router.get("/", authenticateToken, authorize(['system.config','user.manage','navette.edit','employers.manage']), controller.getAllServices);

// 2. Créer un nouveau service
// Mettre les routes spécifiques avant les routes avec des paramètres
router.post("/", authenticateToken, authorize(['system.config','user.manage','navette.edit']), controller.createService);

// 3. Récupérer un service par ID ou slug
// L'ordre est important : /:identifier doit venir après les routes sans paramètres
router.get("/:identifier", authenticateToken, authorize(['system.config','user.manage','navette.edit','employers.manage']), controller.getServiceByIdOrSlug);

// 4. Mettre à jour un service
router.put("/:identifier", authenticateToken, authorize(['system.config','user.manage','navette.edit']), controller.updateService);

// 5. Supprimer un service
router.delete("/:identifier", authenticateToken, authorize(['system.config','user.manage','navette.edit']), controller.deleteService);

module.exports = router; // Exportation du routeur