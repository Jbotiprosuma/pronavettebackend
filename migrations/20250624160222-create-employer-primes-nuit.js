'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employer_prime_nuits', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      code_prime_nuit: {
        type: Sequelize.STRING,
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
      nb_jour: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    await queryInterface.dropTable('employer_prime_nuits');
  }
};