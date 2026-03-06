'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('navette_lignes', 'correction_flag', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('navette_lignes', 'correction_comment', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('navette_lignes', 'correction_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('navette_lignes', 'correction_by', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('navette_lignes', 'correction_flag');
    await queryInterface.removeColumn('navette_lignes', 'correction_comment');
    await queryInterface.removeColumn('navette_lignes', 'correction_date');
    await queryInterface.removeColumn('navette_lignes', 'correction_by');
  }
};
