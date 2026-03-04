// app/routes/v1/users.route.js
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware'); 
const authController = require('../../controllers/auth.controller');

// Route pour obtenir les informations de l'utilisateur connecté
router.get('/me', authenticateToken, (req, res) => {
    res.status(200).json({
        message: 'Informations de l\'utilisateur connecté',
        user: req.user,
        permissions: req.permissions
    });
});

// Route pour la déconnexion de l'utilisateur
router.get('/:id/logout', authenticateToken, authController.logout); 

// --- Routes de gestion des utilisateurs ---

// 1. Lister tous les utilisateurs (avec filtres, tri, recherche, pagination)
router.get('/', authenticateToken, authorize(['system.config','user.manage']), userController.users);

// 2. Récupérer les utilisateurs supprimés logiquement
router.get('/deleted', authenticateToken, authorize(['system.config','user.manage']), userController.getDeletedUsers);

// 3. Récupérer un utilisateur par ID ou Slug
router.get('/:identifier', authenticateToken, authorize(['system.config','user.manage']), userController.getUserByIdOrSlug);

// 4. Créer un nouvel utilisateur
router.post('/', authenticateToken, authorize(['system.config','user.manage']), userController.createUser);

// 5. Mettre à jour les informations générales d'un utilisateur (username, email, nom, prénom, genre)
// C'est une mise à jour partielle, donc PATCH est plus approprié que PUT pour cet endpoint général.
router.put('/:identifier', authenticateToken, authorize(['system.config','user.manage']), userController.updateUser);

router.put('/:identifier/update-status', authenticateToken, authorize(['system.config','user.manage']), userController.updateUserStatus);

// 8. Restaurer un utilisateur supprimé logiquement
router.patch('/:identifier/restore', authenticateToken, authorize(['system.config','user.manage']), userController.restoreUser); // PATCH est plus approprié pour une action "partielle" sur l'état

// 9. Supprimer logiquement un utilisateur
router.delete('/:identifier', authenticateToken, authorize(['system.config','user.manage']), userController.deleteUser);


// --- Routes de mise à jour spécifiques (permissions granulaires) ---

// 10. Mise à jour de la photo de profil (par l'utilisateur lui-même ou admin)
router.put('/:identifier/photo', authenticateToken, upload.single('image'), userController.updateUserPhoto);

// 11. Mise à jour des informations personnelles (nom, prénom, genre) (par l'utilisateur lui-même ou admin)
router.put('/:identifier/information', authenticateToken, userController.updateUserInformation);


module.exports = router;