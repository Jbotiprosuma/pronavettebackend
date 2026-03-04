// app/routes/employerMutation.routes.js
const express = require('express');
const router = express.Router(); // Création d'une instance de Router
const controller = require('../../controllers/employermutation.controller'); // Assurez-vous que le chemin vers le contrôleur est correct
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware'); 
// Assurez-vous que les chemins vers vos middlewares sont corrects

// --- Définitions des Permissions ---
// J'assume que 'mutation.read' permet de voir, 'mutation.edit' permet de créer/modifier,
// et 'mutation.manage' permet de confirmer (validation finale).
const PERM_READ = ['system.config', 'mutation.read'];
const PERM_EDIT = ['system.config', 'mutation.edit'];
const PERM_MANAGE = ['system.config', 'mutation.manage']; 

// --- Routes CRUD de base ---

// Export Excel (avant les routes avec :id)
router.get("/export", authenticateToken, authorize(PERM_READ), controller.exportMutationsToExcel);

// Liste des employés ayant une mutation "En attente"
router.get("/pending-employer-ids", authenticateToken, controller.getPendingEmployerIds);

// 1. Lister toutes les mutations
// Seuls les utilisateurs ayant la permission de lire les mutations y ont accès.
router.get("/", authenticateToken, authorize(PERM_READ), controller.getAllMutations);

// 2. Créer une nouvelle mutation
// Seuls les utilisateurs ayant la permission d'éditer les mutations peuvent en créer.
router.post("/", authenticateToken, authorize(PERM_EDIT), controller.createMutation);

// 3. Récupérer une mutation par ID
router.get("/:id", authenticateToken, authorize(PERM_READ), controller.getMutationById);

// 4. Mettre à jour une mutation existante (modification des données avant validation)
router.put("/:id", authenticateToken, authorize(PERM_EDIT), controller.updateMutation);

// 5. Supprimer une mutation (Soft Delete)
router.delete("/:id", authenticateToken, authorize(PERM_EDIT), controller.deleteMutation);


// --- Routes Spécifiques ---

// 6. Lister les mutations liées au service d'un utilisateur spécifique (Pour un responsable de service)
// La permission de lecture des mutations suffit.
// NOTE: J'utilise ':id' ici, car l'ID de l'utilisateur qui filtre est souvent passé par le token
// (req.user.id), mais si vous utilisez un paramètre explicite, cette route est correcte.
router.get("/user/:userId", authenticateToken, authorize(PERM_READ), controller.getAllMutationByServiceUser);

// 7. Confirmer/Valider une mutation (Action sensible)
// Seuls les utilisateurs ayant la permission de gérer/valider les mutations y ont accès.
router.patch("/:id/confirm", authenticateToken, authorize(PERM_MANAGE), controller.confirmMutation);


router.patch("/:id/reject", authenticateToken, authorize(PERM_MANAGE), controller.rejectMutation);

// 9. Annuler/Réinitialiser une mutation (Annuler la validation ou le rejet)
// Seuls les utilisateurs ayant la permission de gérer/valider y ont accès.
router.patch("/:id/reset", authenticateToken, authorize(PERM_MANAGE), controller.cancelOrResetMutation);

module.exports = router;