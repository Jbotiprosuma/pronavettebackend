// app/controllers/auth.controller.js
const authService = require('../services/auth.service');

class AuthController {
  /**
   * Gère la connexion de l'utilisateur.
   * @param {Object} req - L'objet de requête Express.
   * @param {Object} res - L'objet de réponse Express.
   */
  async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Le nom d\'utilisateur et le mot de passe sont requis.' });
    }

    try {
      // Appelle le service d'authentification pour gérer la logique métier
      // Le service se chargera de mettre à jour lastLoginAt, de créer l'entrée UserLogin et de retourner le slug de l'utilisateur
      const { user, token, message, status } = await authService.login(username, password, req.ip, req.headers['user-agent']);
      if (status == true) {
        
        res.cookie('jwt', token, {
          httpOnly: true,
          secure: false,
          maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
          status: true,
          message: 'Connexion réussie',
          user: user,
          token: token
        });
      } else {
        return res.status(200).json({
          status: false,
          message: message,
          user: user,
          token: token,
        });
      }


    } catch (error) {
      console.error('Erreur de connexion dans AuthController:', error.message);
      // Gère les différentes erreurs et envoie une réponse appropriée
      if (error.message.includes('Identifiants invalides') || error.message.includes('Authentification AD échouée') || error.message.includes('Cannot destructure property')) {
        return res.status(401).json({ status: false, message: 'Identifiants invalides.', erreur: error.message });
      } else if (error.message.includes('Votre compte utilisateur est désactivé')) {
        return res.status(403).json({ status: false, message: 'Votre compte utilisateur est désactivé. Veuillez contacter l\'administrateur.' });
      } else if (error.message.includes('Configuration initiale manquante') || error.message.includes('synchronisation du profil utilisateur')) {
        // Erreur liée à la configuration de la base de données ou à la synchronisation
        return res.status(500).json({ status: false, message: 'Erreur interne du serveur lors de la gestion du profil utilisateur. Contactez l\'administrateur.' });
      } else {
        return res.status(500).json({ status: false, message: 'Une erreur inattendue est survenue lors de la connexion.' });
      }
    }
  }

  /**
  * Gère la connexion de l'utilisateur.
  * @param {Object} req - L'objet de requête Express.
  * @param {Object} res - L'objet de réponse Express.
  */
  async logout(req, res) {

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Erreur lors de la déconnexion', status: false });
    }

    try {
      await authService.logout(id);
      return res.status(200).json({
        status: true,
        message: 'déconnexion réussie',
      });
    } catch (error) {

    }
  }
}

module.exports = new AuthController();