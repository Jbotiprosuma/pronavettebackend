// models/employerhistory.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployerHistory extends Model {
    static associate(models) {
      EmployerHistory.belongsTo(models.Employer, {
        foreignKey: 'employer_id',
        as: 'employer'
      });
      EmployerHistory.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      EmployerHistory.belongsTo(models.Navette, {
        foreignKey: 'navette_id',
        as: 'navette'
      });
      EmployerHistory.belongsTo(models.NavetteLigne, {
        foreignKey: 'navette_ligne_id',
        as: 'navette_ligne'
      });
      EmployerHistory.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }

    /**
     * Enregistre un événement dans l'historique d'un employé
     */
    static async logEvent({
      employer_id,
      type,
      sous_type = null,
      description,
      details = {},
      montant = null,
      quantite = null,
      service_id = null,
      navette_id = null,
      navette_ligne_id = null,
      reference_id = null,
      reference_table = null,
      periode_at = null,
      created_by = null,
    }) {
      try {
        return await EmployerHistory.create({
          employer_id,
          type,
          sous_type,
          description,
          details: typeof details === 'object' ? details : {},
          montant,
          quantite,
          service_id,
          navette_id,
          navette_ligne_id,
          reference_id,
          reference_table,
          periode_at: periode_at || new Date(),
          created_by,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } catch (err) {
        console.error('Erreur EmployerHistory.logEvent:', err.message);
        return null; // Ne jamais bloquer l'opération principale
      }
    }

    /**
     * Enregistre plusieurs événements en batch
     */
    static async logEvents(events) {
      try {
        const records = events.map(e => ({
          employer_id: e.employer_id,
          type: e.type,
          sous_type: e.sous_type || null,
          description: e.description,
          details: typeof e.details === 'object' ? e.details : {},
          montant: e.montant || null,
          quantite: e.quantite || null,
          service_id: e.service_id || null,
          navette_id: e.navette_id || null,
          navette_ligne_id: e.navette_ligne_id || null,
          reference_id: e.reference_id || null,
          reference_table: e.reference_table || null,
          periode_at: e.periode_at || new Date(),
          created_by: e.created_by || null,
          created_at: new Date(),
          updated_at: new Date(),
        }));
        return await EmployerHistory.bulkCreate(records);
      } catch (err) {
        console.error('Erreur EmployerHistory.logEvents:', err.message);
        return [];
      }
    }
  }

  EmployerHistory.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    employer_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'absence',
        'prime',
        'acompte',
        'heure_sup',
        'prime_nuit',
        'mutation',
        'depart',
        'embauche',
        'modification',
        'import',
        'navette'
      ),
      allowNull: false,
    },
    sous_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Sous-type libre : type_abs, type_prime, pourcentage HS, status mutation, type_depart...',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Données brutes de l\'événement (montant, nb_jours, motif, etc.)',
    },
    montant: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Montant associé (somme acompte, montant prime, etc.)',
    },
    quantite: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Quantité associée (nb_jours absence, heures sup, nb_jour prime nuit, etc.)',
    },
    service_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    navette_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    navette_ligne_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    reference_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID de l\'enregistrement source (absence, prime, mutation, etc.)',
    },
    reference_table: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Table source : employer_abs, employer_primes, employer_mutations, etc.',
    },
    periode_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Période de référence de l\'événement',
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'EmployerHistory',
    tableName: 'employer_histories',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['employer_id'] },
      { fields: ['type'] },
      { fields: ['periode_at'] },
      { fields: ['service_id'] },
      { fields: ['employer_id', 'type'] },
      { fields: ['employer_id', 'periode_at'] },
    ],
  });

  return EmployerHistory;
};
