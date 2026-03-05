'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employer_abs', 'type_abs', {
      type: Sequelize.ENUM(
        'ABSENCE_NON_REMUNEREE',
        'ACCIDENT_DE_TRAVAIL',
        'ABSENCE_MISE_A_PIEDS',
        'ABSENCE_CONGES_DE_MATERNITE',
        'ABSENCE_CONGES_PAYE',
        'ABSENCE_REMUNEREE',
        'ABSENCE_PATERNITE',
        'ABSENCE_MALADIE',
        'ABSENCE_FORMATION',
        'ABSENCE_CONGES_A_CALCULER',
        'ABSENCE_CONGES_SUP_MATERNITE'
      ),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employer_abs', 'type_abs', {
      type: Sequelize.ENUM(
        'ABSENCE_NON_REMUNEREE',
        'ACCIDENT_DE_TRAVAIL',
        'ABSENCE_MISE_A_PIEDS',
        'ABSENCE_CONGES_DE_MATERNITE',
        'ABSENCE_CONGES_PAYE',
        'ABSENCE_REMUNEREE',
        'ABSENCE_PATERNITE',
        'ABSENCE_MALADIE',
        'ABSENCE_FORMATION'
      ),
      allowNull: false
    });
  }
};
