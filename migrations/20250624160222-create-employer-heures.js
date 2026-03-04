'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employer_heures', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      code_heure: {
        type: Sequelize.ENUM('HS01', 'HS02', 'HS03'),
        allowNull: false
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
      heures: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      pourcentage: {
        type: Sequelize.ENUM('15', '50', '75'),
        allowNull: false
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
    await queryInterface.dropTable('employer_heures');
  }
};