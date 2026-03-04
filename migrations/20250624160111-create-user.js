'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      nom: {
        type: Sequelize.STRING,
        allowNull: true
      },
      prenom: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
      },
      mail: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
      },
      avatar_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      genre: {
        type: Sequelize.ENUM('Homme', 'Femme'),
        allowNull: true
      },
      is_sup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      role_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      is_representant: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_importer: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_paie: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_manager: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_superadmin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('Activé', 'Désactivé'),
        allowNull: false,
        defaultValue: 'Activé'
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_login_at: {
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
    await queryInterface.dropTable('users');
  }
};