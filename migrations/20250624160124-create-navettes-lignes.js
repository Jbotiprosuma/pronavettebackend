'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('navette_lignes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      employer_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'employers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      service_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      service_new_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      last_update_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      navette_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'navettes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nb_jours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      nb_jour_abs: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nb_jour_job: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      mutation_out: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      mutation_in: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_mutation: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      accompte: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      prime_nuit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_15: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_50: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_75: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      periode_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Non cadre', 'Cadre'),
        allowNull: false,
        defaultValue: 'Non cadre'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('navette_lignes');
  }
};