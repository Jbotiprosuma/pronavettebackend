'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Utilisateur ayant effectué l action'
      },
      module: {
        type: Sequelize.ENUM('campagne', 'navette', 'mutation', 'employe'),
        allowNull: false,
        comment: 'Module concerné'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Type d action (ex: create, update, delete, launch, toggle...)'
      },
      target_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'ID de l entité cible (campagne_id, navette_id, employer_id, mutation_id)'
      },
      target_label: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Label lisible de la cible (ex: Février 2026, NAV-001, DUPONT Jean)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Description détaillée de l action effectuée'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Valeurs avant modification (pour les updates)'
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Valeurs après modification (pour les updates)'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Index pour les performances
    await queryInterface.addIndex('activity_logs', ['module'], { name: 'idx_actlog_module' });
    await queryInterface.addIndex('activity_logs', ['module', 'target_id'], { name: 'idx_actlog_module_target' });
    await queryInterface.addIndex('activity_logs', ['user_id'], { name: 'idx_actlog_user' });
    await queryInterface.addIndex('activity_logs', ['created_at'], { name: 'idx_actlog_created' });
    await queryInterface.addIndex('activity_logs', ['action'], { name: 'idx_actlog_action' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
  }
};
