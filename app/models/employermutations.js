// models/employermutations.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployerMutation extends Model {
    static associate(models) {
      EmployerMutation.belongsTo(models.Employer, {
        foreignKey: 'employer_id',
        as: 'employer',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.Service, {
        foreignKey: 'service_old_id',
        as: 'serviceOld',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.Service, {
        foreignKey: 'service_new_id',
        as: 'serviceNew',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.Navette, {
        foreignKey: 'navette_id',
        as: 'navette',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.NavetteLigne, {
        foreignKey: 'navette_ligne_id',
        as: 'navetteLigne',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'createdby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'confirme_by',
        as: 'confirmeby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updatedby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'cancel_by',
        as: 'cancelby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'reject_by',
        as: 'rejectby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'deleted_by',
        as: 'deletedby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      EmployerMutation.belongsTo(models.User, {
        foreignKey: 'last_update_by',
        as: 'lastupdateby',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  }

  EmployerMutation.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      employer_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      service_old_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      service_new_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      cancel_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      reject_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      deleted_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      last_update_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      confirme_by: {
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
      nb_jours_job: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nb_jour_abs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      accompte: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      prime_nuit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_15: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_50: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      heure_sup_75: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_apply: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_confirme: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_cadre: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      confirme_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      periode_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      depart_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      arrivee_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('En attente', 'Validé', 'Annulé', 'Rejeté'),
        allowNull: false,
        defaultValue: 'En attente',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      apply_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EmployerMutation',
      tableName: 'employer_mutations',
      underscored: true,
      timestamps: true,
      paranoid: true,
      underscored: true,
      hooks: {
        afterCreate: async (mutation, options) => {
          const Navette = sequelize.models.Navette;
          const NavetteLigne = sequelize.models.NavetteLigne;

          const {
            employer_id,
            service_old_id,
            service_new_id,
            nb_jours_job,
            nb_jour_abs,
            accompte,
            prime_nuit,
            heure_sup_15,
            heure_sup_50,
            heure_sup_75,
            depart_at,
          } = mutation;

          // Récupérer is_cadre depuis l'employé associé
          const Employer = sequelize.models.Employer;
          const employer = await Employer.findByPk(employer_id, { transaction: options.transaction });
          const is_cadre = employer ? employer.is_cadre : false;

          const now = new Date();
          const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);

          // 0️⃣ Vérifier si la mutation doit être appliquée maintenant
          if (depart_at && new Date(depart_at) > now) {
            // On ne fait rien : la date n'est pas encore arrivée
            return;
          }

          // 1️⃣ Récupérer les navettes old et new
          const navette_old = await Navette.findOne({
            where: { service_id: service_old_id, periode_at },
            paranoid: true,
          });

          const navette_new = await Navette.findOne({
            where: { service_id: service_new_id, periode_at },
            paranoid: true,
          });

          if (!navette_old || !navette_new) {
            return; // Rien à faire si l'une des navettes est absente
          }

          // 2️⃣ Récupérer les lignes navette old et new
          const navetteLigne_old = await NavetteLigne.findOne({
            where: {
              employer_id,
              service_id: service_old_id,
              periode_at,
            },
            paranoid: true,
          });

          const navetteLigne_new = await NavetteLigne.findOne({
            where: {
              employer_id,
              service_id: service_new_id,
              periode_at,
            },
            paranoid: true,
          });

          // Ancienne ligne introuvable → on sort
          if (!navetteLigne_old) return;

          // Si la nouvelle existe déjà → cas anormal → on sort
          if (navetteLigne_new) return;

          // 3️⃣ Mettre à jour l’ancienne ligne navette
          await navetteLigne_old.update(
            {
              mutation_out: 1,
              mutation_in: 0,
              is_mutation: 0,
            },
            { transaction: options.transaction }
          );

          // 4️⃣ Créer la nouvelle ligne navette
          const newNavetteLigne = await NavetteLigne.create(
            {
              employer_id,
              service_id: service_new_id,
              navette_id: navette_new.id,
              mutation_in: 1,
              is_mutation: 1,
              nb_jours: navetteLigne_old.nb_jours,
              periode_at: periode_at,
              status: is_cadre ? "Cadre" : "Non cadre",
              nb_jours_job: nb_jours_job,
              nb_jour_abs: nb_jour_abs,
              accompte: accompte,
              prime_nuit: prime_nuit,
              heure_sup_15: heure_sup_15,
              heure_sup_50: heure_sup_50,
              heure_sup_75: heure_sup_75,
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction: options.transaction }
          );

          // 5️⃣ Copier les enregistrements enfants de l'ancienne ligne vers la nouvelle
          const EmployerAb = sequelize.models.EmployerAb;
          const EmployerAccompte = sequelize.models.EmployerAccompte;
          const EmployerHeure = sequelize.models.EmployerHeure;
          const EmployerPrime = sequelize.models.EmployerPrime;
          const EmployerPrimeNuit = sequelize.models.EmployerPrimeNuit;

          const txOpts = { transaction: options.transaction };

          // Copier les absences
          const oldAbsences = await EmployerAb.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
          if (oldAbsences.length > 0) {
            await EmployerAb.bulkCreate(
              oldAbsences.map(a => ({
                employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                nb_jours: a.nb_jours, type_abs: a.type_abs, code_abs: a.code_abs,
                motif: a.motif, created_at: new Date(), updated_at: new Date()
              })),
              txOpts
            );
          }

          // Copier les acomptes
          const oldAccomptes = await EmployerAccompte.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
          if (oldAccomptes.length > 0) {
            await EmployerAccompte.bulkCreate(
              oldAccomptes.map(a => ({
                employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                code_accompte: a.code_accompte, somme: a.somme, motif: a.motif,
                created_at: new Date(), updated_at: new Date()
              })),
              txOpts
            );
          }

          // Copier les heures supplémentaires
          const oldHeures = await EmployerHeure.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
          if (oldHeures.length > 0) {
            await EmployerHeure.bulkCreate(
              oldHeures.map(h => ({
                employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                heures: h.heures, pourcentage: h.pourcentage, code_heure: h.code_heure,
                created_at: new Date(), updated_at: new Date()
              })),
              txOpts
            );
          }

          // Copier les primes
          const oldPrimes = await EmployerPrime.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
          if (oldPrimes.length > 0) {
            await EmployerPrime.bulkCreate(
              oldPrimes.map(p => ({
                employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                montant: p.montant, type_prime: p.type_prime, code_prime: p.code_prime,
                created_at: new Date(), updated_at: new Date()
              })),
              txOpts
            );
          }

          // Copier les primes de nuit
          const oldPrimesNuit = await EmployerPrimeNuit.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
          if (oldPrimesNuit.length > 0) {
            await EmployerPrimeNuit.bulkCreate(
              oldPrimesNuit.map(pn => ({
                employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                code_prime_nuit: pn.code_prime_nuit, nb_jour: pn.nb_jour,
                created_at: new Date(), updated_at: new Date()
              })),
              txOpts
            );
          }

          await mutation.update({
            is_apply: 1,
            apply_at: new Date(),
          }, { isSystemUpdate: true })
        },
        afterUpdate: async (mutation, options) => {
          if (options.isSystemUpdate) return;

          const changedFields = mutation.changed();
          if (!changedFields || changedFields.length === 0) return;
          if (!mutation.last_update_by) return;

          const before = mutation._previousDataValues;
          const after = mutation.dataValues;

          const modifications = changedFields
            .map(field => `${field}: "${before[field]}" → "${after[field]}"`)
            .join('\n');

          await sequelize.models.EmployerUpdated.create({
            employer_id: mutation.employer_id,
            user_id: mutation.last_update_by,
            name: `Mise à jour de la mutation employé #${mutation.employer_id}`,
            note: `Changements:\n${modifications}`,
            created_at: new Date()
          });
        }
      }
    }
  );
  return EmployerMutation;
};
