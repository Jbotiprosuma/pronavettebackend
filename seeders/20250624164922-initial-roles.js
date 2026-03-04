'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
      slug: 'superadmin',
      name: 'superadmin',
      is_deletable : false,
      description: 'Accès complet au système et supérieur aux admins',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'admin',
      name: 'admin',
      is_deletable : false,
      description: 'Accès complet au système',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'representant',
      name: 'representant',
      is_deletable : false,
      description: "Le representant d'un manager",
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'manager',
      name: 'manager',
      is_deletable : false,
      description: 'Accès aux informations des etats navette des employés',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'paie',
      name: 'paie',
      is_deletable : false,
      description: 'Accès aux informations des etats navette des employés ',
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'importer',
      name: 'importer',
      is_deletable : false,
      description: "Celui qui fait l'importation de la liste des employés dans le système",
      created_at: new Date(),
      updated_at: new Date()
    },{
      slug: 'standard', 
      name: 'standard', 
      is_deletable : false,
      description: 'Accès limité aux fonctionnalités de base',
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};