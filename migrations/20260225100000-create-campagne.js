'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campagnes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      mois: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '1-12'
      },
      annee: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      periode_debut_at: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      periode_fin_at: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('programmee', 'active', 'terminee', 'desactivee'),
        allowNull: false,
        defaultValue: 'programmee'
      },
      is_executed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true si les navettes ont été créées'
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date/heure d exécution effective'
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Un seul enregistrement par mois/année
    await queryInterface.addIndex('campagnes', ['mois', 'annee'], {
      unique: true,
      name: 'campagnes_mois_annee_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campagnes');
  }
};
