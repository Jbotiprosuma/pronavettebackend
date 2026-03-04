'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employer_histories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      employer_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'employers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'absence',
          'prime',
          'acompte',
          'heure_sup',
          'prime_nuit',
          'mutation',
          'depart',
          'embauche',
          'modification',
          'import',
          'navette'
        ),
        allowNull: false,
      },
      sous_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '{}',
      },
      montant: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      quantite: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
      },
      service_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'services', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      navette_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'navettes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      navette_ligne_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'navette_lignes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reference_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      reference_table: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      periode_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index composites pour les requêtes fréquentes
    await queryInterface.addIndex('employer_histories', ['employer_id'], { name: 'idx_eh_employer' });
    await queryInterface.addIndex('employer_histories', ['type'], { name: 'idx_eh_type' });
    await queryInterface.addIndex('employer_histories', ['periode_at'], { name: 'idx_eh_periode' });
    await queryInterface.addIndex('employer_histories', ['service_id'], { name: 'idx_eh_service' });
    await queryInterface.addIndex('employer_histories', ['employer_id', 'type'], { name: 'idx_eh_employer_type' });
    await queryInterface.addIndex('employer_histories', ['employer_id', 'periode_at'], { name: 'idx_eh_employer_periode' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employer_histories');
  },
};
