'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employer_mutations', {
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
      service_old_id: {
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
      navette_ligne_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'navette_lignes',
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
      updated_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      confirme_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cancel_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reject_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      deleted_by: {
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
      nb_jours_job: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nb_jour_abs: {
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
        defaultValue: 0
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
      is_confirme: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_apply: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      confirme_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      periode_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      depart_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      arrivee_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_cadre: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('En attente', 'Validé', 'Annulé', 'rejeté'),
        allowNull: false,
        defaultValue: 'En attente'
      },
      apply_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('employer_mutations');
  }
};