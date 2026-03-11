'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('navette_lignes', 'correction_status', {
      type: Sequelize.ENUM('signaled', 'corrected', 'validated', 'rejected'),
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn('navette_lignes', 'correction_response', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('navette_lignes', 'correction_resolved_by', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    });
    await queryInterface.addColumn('navette_lignes', 'correction_resolved_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('navette_lignes', 'correction_resolved_date');
    await queryInterface.removeColumn('navette_lignes', 'correction_resolved_by');
    await queryInterface.removeColumn('navette_lignes', 'correction_response');
    await queryInterface.removeColumn('navette_lignes', 'correction_status');
  }
};
