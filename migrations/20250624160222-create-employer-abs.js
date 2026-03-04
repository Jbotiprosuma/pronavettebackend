'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employer_abs', {
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
      nb_jours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      type_abs: {
        type: Sequelize.ENUM('ABSENCE_NON_REMUNEREE', 'ACCIDENT_DE_TRAVAIL', 'ABSENCE_MISE_A_PIEDS', 'ABSENCE_CONGES_DE_MATERNITE', 'ABSENCE_CONGES_PAYE', 'ABSENCE_REMUNEREE', 'ABSENCE_PATERNITE', 'ABSENCE_MALADIE', 'ABSENCE_FORMATION'),
        allowNull: false
      },
      code_abs: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      motif: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "ABSENCE JUSTIFIE"
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
    await queryInterface.dropTable('employer_abs');
  }
};