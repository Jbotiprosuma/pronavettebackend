'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('navettes', 'status_force', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('navettes', 'status_force');
  }
};
