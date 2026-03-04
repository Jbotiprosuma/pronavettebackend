'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Récupérer l'ID du rôle 'SuperAdmin'
    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1;`
    );
    const superAdminRoleId = superAdminRole[0] ? superAdminRole[0].id : null;

    const [defaultService] = await queryInterface.sequelize.query(
      `SELECT id FROM services WHERE name = 'DSI' LIMIT 1;`
    );
    const defaultServiceId = defaultService[0] ? defaultService[0].id : null;

    // Vérifier que les IDs ont été trouvés
    if (!superAdminRoleId || !defaultServiceId) {
      console.error('Erreur: Impossible de trouver les IDs de rôle/service/département pour le SuperAdmin. Assurez-vous que les seeders précédents ont été exécutés.');
      return;
    }

    // Insérer l'utilisateur SuperAdmin
    await queryInterface.bulkInsert('users', [{
      slug: 'jboti',
      username: 'jboti',
      nom: 'Boti',
      prenom: 'Joel',
      email: 'jboti@prosuma.ci',
      mail: 'Joel.Boti@prosuma.ci',
      role_id: superAdminRoleId,
      service_id: defaultServiceId,
      genre: "Homme",
      is_sup: true,
      is_paie: true,
      is_representant: true,
      is_importer: true,
      is_manager: true,
      is_admin: true,
      is_superadmin: true,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    await queryInterface.bulkInsert('employers', [{
      slug: 'jboti',
      matricule: '9913',
      nom: 'Boti',
      prenom: 'Joel',
      email: 'jboti@prosuma.ci',
      service_id: defaultServiceId,
      genre: "Homme",
      poste_occupe: "Informaticien developpeur",
      is_cadre: 1,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
    await queryInterface.bulkInsert('employers', [{
      slug: 'jagaman',
      matricule: '9914',
      nom: 'Agaman',
      prenom: 'Jacob',
      email: 'jagaman@prosuma.ci',
      service_id: defaultServiceId,
      genre: "Homme",
      poste_occupe: "Chef de projets",
      is_cadre: 0,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
    await queryInterface.bulkInsert('employers', [{
      slug: 'pdiallo',
      matricule: '9915',
      nom: 'Diallo',
      prenom: 'Patrick',
      email: 'pdiallo@prosuma.ci',
      service_id: defaultServiceId,
      genre: "Homme",
      poste_occupe: "Analyste developpeur",
      is_cadre: 1,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    await queryInterface.bulkInsert('employers', [{
      slug: 'pdiadi',
      matricule: '9916',
      nom: 'Diabi',
      prenom: 'Paul',
      email: 'pdiadi@prosuma.ci',
      service_id: 2,
      genre: "Homme",
      poste_occupe: "Acheteur",
      is_cadre: 0,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    await queryInterface.bulkInsert('employers', [{
      slug: 'rn',
      matricule: '9926',
      nom: 'Noelle',
      prenom: 'Rose',
      email: 'rn@prosuma.ci',
      service_id: 2,
      genre: "Femme",
      poste_occupe: "Acheteur",
      is_cadre: 0,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

     await queryInterface.bulkInsert('employers', [{
      slug: 'drose',
      matricule: '9921',
      nom: 'Didi',
      prenom: 'Rose',
      email: 'drose@prosuma.ci',
      service_id: 2,
      genre: "Femme",
      poste_occupe: "Acheteur",
      is_cadre: 1,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'jboti@prosuma.ci' }, {});
  }
};