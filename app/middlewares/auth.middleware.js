const jwt = require('jsonwebtoken');

const { User, Role, Permission, Service } = require('../models');

/**
 * Middleware pour vérifier le JWT et attacher les informations de l'utilisateur à la requête.
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
 * @param {Function} next - La fonction next() pour passer au middleware suivant.
 */
const authenticateToken = async (req, res, next) => {
  // Récupérer le token depuis l'en-tête Authorization ou le query param (pour les téléchargements)
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé: Aucun token fourni.' });
  }

  try {
    // 1. Vérifier la validité du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Récupérer l'utilisateur depuis la base de données pour obtenir les informations les plus récentes
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] } // Optionnel: pour ne pas inclure les colonnes de la table de jonction
            }
          ]
        },
        {
          model: Service, // Inclusion directe du modèle Service
          as: 'service',
          attributes: ['id', 'name'] // Spécifiez les attributs que vous souhaitez récupérer
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (user.deleted_at) {
      return res.status(403).json({ message: 'Votre compte utilisateur est désactivé.' });
    }

    if (user.status == "Désactivé") {
      return res.status(403).json({ message: 'Votre compte utilisateur est désactivé.' });
    }

    // Attacher les informations de l'utilisateur et ses permissions à l'objet requête
    req.user = {
      id: user.id,
      slug: user.slug,
      nom: user.nom,
      prenom: user.prenom,
      username: user.username,
      email: user.email,
      mail: user.mail,
      genre: user.genre,
      role: user.role ? user.role.name : 'Unknown',
      service: user.service ? user.service.name : 'Unknown',
      service_id: user.service ? user.service.id : 'Unknown',
      status: user.status,
      avatar_url: user.avatar_url,
      is_representant: user.is_representant,
      is_importer: user.is_importer,
      is_manager: user.is_manager,
      is_paie: user.is_paie,
      is_admin: user.is_admin,
      is_superadmin: user.is_superadmin,
      last_login_at: user.last_login_at,
      is_sup: user.is_sup,
    };

    req.permissions = user.role && user.role.permissions
      ? user.role.permissions.map(p => p.name)
      : [];

    next();
  } catch (error) {
    console.error('Erreur de vérification du token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré.' });
    }
    return res.status(403).json({ message: 'Accès interdit: Token invalide.' });
  }
};

/**
 * Middleware pour vérifier si l'utilisateur a une ou plusieurs permissions spécifiques.
 * @param {string[]} requiredPermissions - Tableau des noms de permissions requises.
 * @returns {Function} Le middleware d'autorisation.
 */
const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.permissions || req.permissions.length === 0) {
      return res.status(403).json({ message: 'Accès interdit: Aucune permission trouvée pour cet utilisateur.' });
    }

    // Vérifie si l'utilisateur a au moins une des permissions requises
    const hasPermission = requiredPermissions.some(permission =>
      req.permissions.includes(permission)
    );

    if (hasPermission) {
      next(); // L'utilisateur a la permission, passer au middleware/route suivant
    } else {
      return res.status(403).json({ message: 'Accès interdit: Vous n\'avez pas les permissions requises pour cette action.' });
    }
  };
};

module.exports = {
  authenticateToken,
  authorize,
};