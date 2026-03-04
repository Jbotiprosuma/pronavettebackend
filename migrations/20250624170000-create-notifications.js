'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'navette_lancee', 'navette_validee', 'navette_correction',
          'navette_envoi_paie', 'navette_signalement', 'navette_cloturee',
          'mutation_creee', 'mutation_confirmee', 'mutation_rejetee',
          'mutation_annulee', 'employe_importe', 'general'
        ),
        defaultValue: 'general',
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      link: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index pour les performances
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], { name: 'idx_notif_user_read' });
    await queryInterface.addIndex('notifications', ['created_at'], { name: 'idx_notif_created' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  }
};
