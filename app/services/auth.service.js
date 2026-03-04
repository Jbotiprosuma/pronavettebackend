const jwt = require('jsonwebtoken');
const db = require('../models');
const adService = require('./ad.service');

class AuthService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'REGFZHVBJEKFBEIFEJHF';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  }

  /**
   * Authentifie un utilisateur via AD, ou le provisionne/met à jour en local.
   * Enregistre la dernière heure de connexion et crée un enregistrement de connexion.
   * @param {string} username - Le nom d'utilisateur AD (ex: jboti@prosuma.ci).
   * @param {string} password - Le mot de passe de l'utilisateur.
   * @param {string} [ipAddress=null] - L'adresse IP de la requête de connexion.
   * @param {string} [userAgent=null] - Les informations de l'agent utilisateur de la requête.
   * @returns {Promise<Object|null>} L'objet utilisateur local et le token JWT, ou null en cas d'échec.
   */
  async login(username, password, ipAddress = null, userAgent = null) {
    let userDB = null;
    try {
      // 1. Authentification via Active Directory
      const result = await adService.authenticate(username, password);

      if (!result.success) {
        console.warn(`Tentative de connexion échouée pour ${username}: Échec authentification AD.`);
        throw new Error('Identifiants invalides ou authentification AD échouée.');
      }

      const { user: adUser } = result;

      console.log(`Authentification AD réussie pour ${adUser.sAMAccountName}.`);


      let emailAD = adUser.userPrincipalName;

      // 2. Chercher l'utilisateur dans notre base de données locale par son email (correspondant au username AD)
      userDB = await db.User.findOne({
        where: { email: emailAD },
        include: [
          {
            model: db.Role,
            as: 'role',
            include: [{
              model: db.Permission,
              as: 'permissions',
              through: { attributes: [] }
            }]
          },
          {
            model: db.Service,
            as: 'service',
            attributes: ['id', 'name']
          },
        ]
      });

      if (!userDB) {
        console.warn(`Connexion refusée . Veuillez contacter l'administrateur. `);
        return { user: [], token: "", message: "Ce compte n'est pas reconnu par notre système. Veuillez vous faire enregistrer par un administrateur.", status: false };
      }

      if (userDB.status == 'Désactivé') {
        console.warn(`Connexion refusée pour ${userDB.username}: Statut du compte '${userDB.status}'.`);
        return { user: userDB, token: "", message: "Ce compte est désactivé. Veuillez contacter un administrateur.", status: false };
      }

      // --- 6. Connexion réussie : Mettre à jour last_login_at et créer une entrée UserLogin ---
      const now = new Date();

      // Mettre à jour last_login_at sur le modèle User
      userDB.last_login_at = now;
      await userDB.save({ fields: ['last_login_at'] });

      // Créer une nouvelle entrée dans UserLogin
      await db.UserLogin.create({
        user_id: userDB.id,
        login_at: now,
        ip_address: ipAddress,
        device_info: userAgent,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 7. Générer le JWT
      const permissions = userDB.role && userDB.role.permissions ? userDB.role.permissions.map(p => p.name) : [];

      const token = jwt.sign(
        {
          id: userDB.id,
          slug: userDB.slug,
          nom: userDB.nom,
          prenom: userDB.prenom,
          username: userDB.username,
          email: userDB.email,
          mail: userDB.mail,
          role: userDB.role ? userDB.role.name : 'Unknown',
          service: userDB.service ? userDB.service.name : 'Unknown',
          permissions: permissions,
          status: userDB.status,
          avatar_url: userDB.avatar_url,
          is_representant: userDB.is_representant,
          is_manager: userDB.is_manager,
          is_admin: userDB.is_admin,
          is_superadmin: userDB.is_superadmin,
          last_login_at: userDB.last_login_at,
          is_sup: userDB.is_sup,
        },
        this.secret,
        { expiresIn: this.expiresIn }
      );

      const userResponse = {
        id: userDB.id,
        slug: userDB.slug,
        nom: userDB.nom,
        prenom: userDB.prenom,
        username: userDB.username,
        email: userDB.email,
        mail: userDB.mail,
        role: userDB.role ? userDB.role.name : 'Unknown',
        service: userDB.service ? userDB.service.name : 'Unknown',
        permissions: permissions,
        status: userDB.status,
        avatar_url: userDB.avatar_url,
        is_representant: userDB.is_representant,
        is_manager: userDB.is_manager,
        is_admin: userDB.is_admin,
        is_superadmin: userDB.is_superadmin,
        last_login_at: userDB.last_login_at,
        is_sup: userDB.is_sup,
      };

      console.log(`Connexion réussie et token généré pour ${userDB.username}.`);

      return { user: userResponse, token, message: "connexion réussie.", status: true };

    } catch (error) {
      console.error(`Erreur inattendue lors de la connexion pour ${username}:`, error.message, error.stack);
      throw error;
    }
  }

  async logout(userId) {
    try {
      const lastLoginEntry = await db.UserLogin.findOne({
        where: {
          user_id: userId,
          logout_at: null
        },
        order: [['login_at', 'DESC']]
      });

      if (lastLoginEntry) {
        lastLoginEntry.logout_at = new Date();
        await lastLoginEntry.save({ fields: ['logout_at'] });
        console.log(`Déconnexion enregistrée pour l'entrée UserLogin (ID: ${lastLoginEntry.id}) de l'utilisateur ${userId}.`);
      } else {
        console.warn(`Aucune session active trouvée pour l'utilisateur ${userId} à la déconnexion.`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement de la déconnexion pour l'utilisateur ${userId}:`, error.message);
    }
  }
}

module.exports = new AuthService();