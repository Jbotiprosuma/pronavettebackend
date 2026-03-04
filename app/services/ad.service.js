const ad = require('../config/ad');

/**
 * Vérifie les identifiants utilisateur dans l'Active Directory.
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, user?: object, message?: string }>}
 */
const authenticate = async (username, password) => {
  return new Promise((resolve) => {
    ad.authenticate(username, password, function (err, auth) {
      if (err) {
        console.log(`Authentification erreur pour ${username}.`);
        return resolve({ success: false, message: err.message });
      }
      if (!auth) {
        console.log(`Authentification echoué pour ${username}.`);
        return resolve({ success: false, message: 'Authentification échouée' })
      };

      ad.findUser(username, function (err, user) {
        if (err || !user) {
          console.log(`Utilisateur introuvable dans l’AD ${username}.`);
          return resolve({ success: false, message: 'Utilisateur introuvable dans l\'AD' })
        };
        console.log(`Connexion reussi pour ${user} .`);
        return resolve({ success: true, user });
      });
    });
  });
};

module.exports = { authenticate };
