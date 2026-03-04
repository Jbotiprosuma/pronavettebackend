'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('navettes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      name: {
        type: Sequelize.TEXT,
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
      periode_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      periode_debut_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      periode_fin_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      etat: {
        type: Sequelize.ENUM(
          "En attente de l'enregistrement des informations des employés",
          "En attente de l'envoi des informations des employés au manager",
          "En attente de la confirmation des informations des employés par le manager",
          "En attente du traitement de l'etat navette par la paie",
          "Etat navette cloturé"
        ),
        allowNull: false,
        defaultValue: "En attente de l'enregistrement des informations des employés"
      },
      date_creation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_enregistrement_infos: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_envoie_manager: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_envoie_paie: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_traitement_paie: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_cloture: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('En attente', 'En cours', 'bloqué', 'Terminé'),
        allowNull: false,
        defaultValue: 'En attente'
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
    await queryInterface.dropTable('navettes');
  }
};