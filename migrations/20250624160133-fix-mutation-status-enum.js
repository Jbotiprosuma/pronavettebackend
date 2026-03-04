'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // MySQL : ALTER TABLE pour corriger l'ENUM
    await queryInterface.sequelize.query(
      `ALTER TABLE employer_mutations MODIFY COLUMN status ENUM('En attente', 'Validé', 'Annulé', 'Rejeté') NOT NULL DEFAULT 'En attente'`
    );
    // Corriger les données existantes avec l'ancien casing
    await queryInterface.sequelize.query(
      `UPDATE employer_mutations SET status = 'Annulé' WHERE status = 'annulé'`
    );
    await queryInterface.sequelize.query(
      `UPDATE employer_mutations SET status = 'Rejeté' WHERE status = 'rejeté'`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TABLE employer_mutations MODIFY COLUMN status ENUM('En attente', 'Validé', 'annulé', 'rejeté') NOT NULL DEFAULT 'En attente'`
    );
  }
};
