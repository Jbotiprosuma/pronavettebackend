'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employers', {
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
      matricule: {
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
      avatar_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      poste_occupe: {
        type: Sequelize.STRING,
        allowNull: true
      },
      genre: {
        type: Sequelize.ENUM('Homme', 'Femme'),
        allowNull: true
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
      is_cadre: {
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
      date_embauche: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_depart: {
        type: Sequelize.DATE,
        allowNull: true
      },
      type_depart: {
        type: Sequelize.ENUM('DEMISSION', 'RETRAITE', 'DECES', 'LICENCIEMENT'),
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
    await queryInterface.dropTable('employers');
  }
};