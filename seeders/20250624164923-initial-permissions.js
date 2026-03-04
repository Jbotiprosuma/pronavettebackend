'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('permissions', [{
      slug: 'user.manage',
      name: 'user.manage',
      description: 'Gérer les utilisateurs (créer, modifier, supprimer, activer/désactiver)',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'navette.edit',
      name: 'navette.edit',
      description: 'Permet d\'accéder et de modifier les etats navettes.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'navette.read',
      name: 'navette.read',
      description: 'Permet d\'accéder et de lire les etats navettes.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'navette.manage',
      name: 'navette.manage',
      description: 'Permet d\'accéder, de modifier et supprimer les etats navettes.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'employers.manage',
      name: 'employers.manage',
      description: 'Permet d\'accéder et de modifier les employés.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'mutation.manage',
      name: 'mutation.manage',
      description: 'Permet d\'accéder et de modifier les mutations des employés.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'mutation.service.manage',
      name: 'mutation.service.manage',
      description: 'Permet d\'accéder et de modifier les mutations des employés de son service.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'mutation.service.edit',
      name: 'mutation.service.edit',
      description: 'Permet d\'accéder et de modifier les mutations des employés de son service.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'employers.service.manage',
      name: 'employers.service.manage',
      description: 'Permet d\'accéder et de modifier les employés de son service.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'employers.service.edit',
      name: 'employers.service.edit',
      description: 'Permet d\'accéder et de modifier les employés de son service.',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'system.config',
      name: 'system.config',
      description: 'Permet d\'accéder et de modifier les configurations système.',
      created_at: new Date(),
      updated_at: new Date()
    }, {
      slug: 'import.manage',
      name: 'import.manage',
      description: 'Permet de gérer les importations des listes des employés',
      created_at: new Date(),
      updated_at: new Date()
    }, {
      slug: 'report.generate',
      name: 'report.generate',
      description: 'Générer des rapports',
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('permissions', null, {});
  }
};