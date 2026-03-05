'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employer_primes', 'type_prime', {
      type: Sequelize.ENUM(
        'PRIME CAISSE',
        'PRIME IMPOSABLE',
        'PRIME ASTREINTE',
        'PRIME DE FRAIS',
        'PRIME TENUE',
        'PRIME INVENTAIRE',
        'PRIME DE PANIER',
        'PRIME DE TRANSPORT',
        'PRIME DE FIN D ANNEE',
        'PRIME FIXE IMPOSABLE',
        'PRIME FIXE NON IMPOSABLE',
        'PRIME DIVERS',
        'PRIME SURSALAIRE',
        'PRIME RAPPEL AUGMENTATION',
        'PRIME SEMESTRIELLE',
        'PRIME DE DEPART',
        'PRIME FRAIS FUNERAIRES',
        'PRIME ASTREINTE PROXIMITE',
        'PRIME CAISSE PROXIMITE',
        'PRIME JOUR SUPPLEMENTAIRE',
        'PRIME VACCINATION',
        'INDEMNITE PREAVIS',
        'INDEMNITE AGGRAVATION',
        'INDEMNITE LICENCIEMENT IMPOSABLE',
        'INDEMNITE DECES IMPOSABLE',
        'INDEMNITE RETRAITE IMPOSABLE',
        'INDEMNITE DEPART CDD IMPOSABLE',
        'INDEMNITE LICENCIEMENT NON IMPOSABLE',
        'INDEMNITE DECES NON IMPOSABLE',
        'INDEMNITE RETRAITE NON IMPOSABLE',
        'INDEMNITE FIXE DEPART NON IMPOSABLE',
        'INDEMNITE DEPART CDD NON IMPOSABLE'
      ),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employer_primes', 'type_prime', {
      type: Sequelize.ENUM(
        'PRIME CAISSE',
        'PRIME IMPOSABLE',
        'PRIME ASTREINTE',
        'PRIME DE FRAIS',
        'PRIME TENUE',
        'PRIME INVENTAIRE',
        'PRIME DE PANIER',
        'PRIME DE TRANSPORT',
        'PRIME DE FIN D ANNEE',
        'PRIME FIXE IMPOSABLE',
        'PRIME FIXE NON IMPOSABLE',
        'PRIME DIVERS'
      ),
      allowNull: false
    });
  }
};
