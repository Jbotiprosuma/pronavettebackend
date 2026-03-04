'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_permissions', { 
      role_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true, 
        references: {
          model: 'roles', 
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permission_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true, 
        references: {
          model: 'permissions', 
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' 
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
    await queryInterface.dropTable('role_permissions');
  }
};