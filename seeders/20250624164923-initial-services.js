'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('services', [
      {
        name: 'DSI',
        slug: 'dsi',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Achat Sec',
        slug: 'achat-sec',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Achat Frais',
        slug: 'achat-frais',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Achat bazar',
        slug: 'achat-bazar',
        created_at: new Date(),
        updated_at: new Date()
      },

    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('services', null, {});
  }
};