// models/navetteLigne.js
'use strict';
const {
  Model, Op
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NavetteLigne extends Model {
    static associate(models) {
      NavetteLigne.belongsTo(models.Employer, {
        foreignKey: 'employer_id',
        as: 'employer'
      });
      NavetteLigne.belongsTo(models.Navette, {
        foreignKey: 'navette_id',
        as: 'navette'
      });
      NavetteLigne.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      NavetteLigne.hasMany(models.EmployerAccompte, {
        foreignKey: 'navette_ligne_id',
        as: 'acomptes'
      });
      NavetteLigne.hasMany(models.EmployerAb, {
        foreignKey: 'navette_ligne_id',
        as: 'absences'
      });
      NavetteLigne.hasMany(models.EmployerHeure, {
        foreignKey: 'navette_ligne_id',
        as: 'heuresSup'
      });
      NavetteLigne.hasMany(models.EmployerPrime, {
        foreignKey: 'navette_ligne_id',
        as: 'primes'
      });
      NavetteLigne.hasMany(models.EmployerPrimeNuit, {
        foreignKey: 'navette_ligne_id',
        as: 'primesNuit'
      });
      NavetteLigne.hasMany(models.EmployerMutation, {
        foreignKey: 'navette_ligne_id',
        as: 'mutations'
      });
    }

    static async updateAbsenceTotal(navetteLigneId) {
      const navetteLigne = await NavetteLigne.findByPk(navetteLigneId, { paranoid: false });

      if (navetteLigne) {
        const absenceTypesReduisantNbJours = [
          'ABSENCE_NON_REMUNEREE',
          'ABSENCE_MISE_A_PIEDS',
          'ABSENCE_CONGES_DE_MATERNITE',
          'ABSENCE_CONGES_PAYE',
          'ACCIDENT_DE_TRAVAIL'
        ];

        // 1. Absences qui réduisent les jours travaillés
        const joursAbsenceReducteurs = await sequelize.models.EmployerAb.sum('nb_jours', {
          where: {
            navette_ligne_id: navetteLigneId,
            deleted_at: { [Op.eq]: null },
            type_abs: { [Op.in]: absenceTypesReduisantNbJours }
          }
        }) || 0;

        // 2. Absences qui ne réduisent PAS les jours travaillés
        const joursAbsenceNonReducteurs = await sequelize.models.EmployerAb.sum('nb_jours', {
          where: {
            navette_ligne_id: navetteLigneId,
            deleted_at: { [Op.eq]: null },
            type_abs: { [Op.notIn]: absenceTypesReduisantNbJours }
          }
        }) || 0;

        // 3. Total de toutes les absences
        const totalJoursAbsence = joursAbsenceReducteurs + joursAbsenceNonReducteurs;

        const joursTravailInitiaux = 30;
        const nouveauNbJours = joursTravailInitiaux - joursAbsenceReducteurs;

        await navetteLigne.update({
          nb_jour_abs: totalJoursAbsence,
          nb_jour_abs_reduit: joursAbsenceReducteurs,
          nb_jour_abs_non_reduit: joursAbsenceNonReducteurs,
          nb_jours: nouveauNbJours
        });

        console.log(`Mise à jour pour navette_ligne ${navetteLigneId}:`);
        console.log(`  nb_jour_abs (total): ${totalJoursAbsence}`);
        console.log(`  nb_jour_abs_reduit: ${joursAbsenceReducteurs}`);
        console.log(`  nb_jour_abs_non_reduit: ${joursAbsenceNonReducteurs}`);
        console.log(`  nb_jours (30 - réducteurs): ${nouveauNbJours}`);

      } else {
        console.log(`NavetteLigne avec l'ID ${navetteLigneId} non trouvée. Aucune mise à jour effectuée.`);
      }
    }

    static async updateAccompteTotal(navetteLigneId) {
      const navetteLigne = await NavetteLigne.findByPk(navetteLigneId, { paranoid: false });
      if (navetteLigne) {
        const totalAccomptes = await sequelize.models.EmployerAccompte.sum('somme', {
          where: {
            navette_ligne_id: navetteLigneId,
            deleted_at: { [Op.eq]: null }
          }
        });
        await navetteLigne.update({ accompte: totalAccomptes || 0 });
      }
    }

    static async updatePrimeNuitTotal(navetteLigneId) {
      const navetteLigne = await NavetteLigne.findByPk(navetteLigneId, { paranoid: false });
      if (navetteLigne) {
        const totalPrimeNuit = await sequelize.models.EmployerPrimeNuit.sum('nb_jour', {
          where: {
            navette_ligne_id: navetteLigneId,
            deleted_at: { [Op.eq]: null }
          }
        });
        await navetteLigne.update({ prime_nuit: totalPrimeNuit || 0 });
      }
    }

    static async updateHeuresSupTotals(navetteLigneId) {
      const navetteLigne = await NavetteLigne.findByPk(navetteLigneId, { paranoid: false });

      if (navetteLigne) {
        // 1. Calculer la somme initiale de toutes les heures supplémentaires pour chaque pourcentage
        // Ces sommes représentent les heures brutes avant distribution.
        let totalHeuresSup15 = await sequelize.models.EmployerHeure.sum('heures', {
          where: {
            navette_ligne_id: navetteLigneId,
            pourcentage: '15',
            deleted_at: { [Op.eq]: null }
          }
        }) || 0; // S'assurer que c'est 0 si pas de résultat

        let totalHeuresSup50 = await sequelize.models.EmployerHeure.sum('heures', {
          where: {
            navette_ligne_id: navetteLigneId,
            pourcentage: '50',
            deleted_at: { [Op.eq]: null }
          }
        }) || 0;

        let totalHeuresSup75 = await sequelize.models.EmployerHeure.sum('heures', {
          where: {
            navette_ligne_id: navetteLigneId,
            pourcentage: '75',
            deleted_at: { [Op.eq]: null }
          }
        }) || 0;

        // 2. Appliquer la logique de distribution des heures supplémentaires

        let restePourcentage15 = 0;
        // let restePourcentage50 = 0;

        // Logique pour les heures à 15%
        if (totalHeuresSup15 >= 32) {
          restePourcentage15 = totalHeuresSup15 - 32; // Calculer le surplus
          totalHeuresSup15 = 32; // Limiter le total à 15% à 30
          totalHeuresSup50 += restePourcentage15; // Ajouter le surplus aux heures à 50%
          console.log(`Excédent de 15% (${restePourcentage15}h) transféré aux 50%.`);
        }

        // // Logique pour les heures à 50% (prend en compte le surplus potentiel des 15%)
        // if (totalHeuresSup50 >= 1045) {
        //   restePourcentage50 = totalHeuresSup50 - 1045; // Calculer le surplus
        //   totalHeuresSup50 = 1045; // Limiter le total à 50% à 45
        //   totalHeuresSup75 += restePourcentage50; // Ajouter le surplus aux heures à 75%
        //   console.log(`Excédent de 50% (${restePourcentage50}h) transféré aux 75%.`);
        // }

        // 3. Mettre à jour l'enregistrement NavetteLigne avec les totaux finaux
        await navetteLigne.update({
          heure_sup_15: totalHeuresSup15,
          heure_sup_50: totalHeuresSup50,
          heure_sup_75: totalHeuresSup75,
        });

        console.log(`Heures supplémentaires mises à jour pour navetteLigneId ${navetteLigneId}:`);
        console.log(`  15%: ${totalHeuresSup15}h`);
        console.log(`  50%: ${totalHeuresSup50}h`);
        console.log(`  75%: ${totalHeuresSup75}h`);

      } else {
        console.warn(`NavetteLigne avec l'ID ${navetteLigneId} non trouvée. Impossible de mettre à jour les heures supplémentaires.`);
      }
    }
  }
  NavetteLigne.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    employer_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'employer_id'
    },
    service_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    service_new_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    last_update_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    navette_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    nb_jours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    nb_jour_abs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    nb_jour_abs_reduit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    nb_jour_abs_non_reduit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    nb_jour_job: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    mutation_out: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    mutation_in: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_mutation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    accompte: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    prime_nuit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    heure_sup_15: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    heure_sup_50: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    heure_sup_75: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    periode_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Non cadre', 'Cadre'),
      allowNull: false,
      defaultValue: 'Non cadre'
    },
    correction_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    correction_comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    correction_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    correction_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'NavetteLigne',
    tableName: 'navette_lignes',
    timestamps: true,
    paranoid: true,
    underscored: true,
    deletedAt: 'deleted_at',
    hooks: {
      afterUpdate: async (navetteLigne, options) => {
        const { NavetteUpdated } = sequelize.models;

        // Récupération des champs modifiés
        const changed = navetteLigne.changed();
        if (!changed || changed.length === 0) return;

        // Créer le log uniquement si un utilisateur est identifié
        // (pas de log pour les recalculs automatiques d'agrégats)
        if (navetteLigne.last_update_by) {
          // Construction du texte des modifications
          const modifications = changed.map(field => {
            const oldValue = navetteLigne.previous(field);
            const newValue = navetteLigne.get(field);
            return `${field} : "${oldValue}" → "${newValue}"`;
          }).join(', ');

          // Création du log
          await NavetteUpdated.create({
            employer_id: navetteLigne.employer_id || null,
            navette_id: navetteLigne.navette_id,
            navette_ligne_id: navetteLigne.id,
            user_id: navetteLigne.last_update_by,
            name: "Modification de la navette ligne",
            note: `Changements : ${modifications}`,
            created_at: new Date()
          });
        }

        // Appel logique métier existante (toujours exécuté)
        await sequelize.models.Navette.updateStatusAndEtat(navetteLigne.navette_id);
      }

    }
  });
  return NavetteLigne;
};