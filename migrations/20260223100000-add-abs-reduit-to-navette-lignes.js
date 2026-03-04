'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('navette_lignes', 'nb_jour_abs_reduit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'nb_jour_abs',
      comment: 'Nombre de jours d\'absence réduisant les jours travaillés'
    });
    await queryInterface.addColumn('navette_lignes', 'nb_jour_abs_non_reduit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'nb_jour_abs_reduit',
      comment: 'Nombre de jours d\'absence ne réduisant pas les jours travaillés'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('navette_lignes', 'nb_jour_abs_reduit');
    await queryInterface.removeColumn('navette_lignes', 'nb_jour_abs_non_reduit');
  }
};
