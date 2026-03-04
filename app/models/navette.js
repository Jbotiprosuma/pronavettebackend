// models/navette.js
'use strict';
const {
  Model, Op
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Navette extends Model {
    static associate(models) {
      Navette.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      Navette.hasMany(models.NavetteLigne, {
        foreignKey: 'navette_id',
        as: 'navetteLignes'
      });
      Navette.hasMany(models.EmployerAccompte, {
        foreignKey: 'navette_id',
        as: 'acomptes'
      });
      Navette.hasMany(models.EmployerAb, {
        foreignKey: 'navette_id',
        as: 'absences'
      });
      Navette.hasMany(models.EmployerHeure, {
        foreignKey: 'navette_id',
        as: 'heuresSup'
      });
      Navette.hasMany(models.EmployerPrime, {
        foreignKey: 'navette_id',
        as: 'primes'
      });
      Navette.hasMany(models.EmployerPrimeNuit, {
        foreignKey: 'navette_id',
        as: 'primesNuit'
      });
      Navette.hasMany(models.NavetteUpdated, {
        foreignKey: 'navette_id',
        as: 'navetteUpdated'
      });
    }

    isModifiable(is_paie) {
      const now = new Date();

      if ((this.status === 'bloqué' || this.status === 'Terminé') && is_paie === false) {
        return false;
      }

      if ((this.periode_fin_at && now > this.periode_fin_at) && (this.status === 'bloqué' || this.status === 'Terminé') && is_paie === false) {
        return false;
      }

      return true;
    }

    static async updateStatusAndEtat(navetteId) {
      const navette = await Navette.findByPk(navetteId, { paranoid: false });

      if (navette) {
        let updatedFields = {};

        if (navette.status === 'En attente') {
          updatedFields.status = 'En cours';
        }

        if (navette.etat === "En attente de l'enregistrement des informations des employés") {
          updatedFields.etat = "En attente de l'envoi des informations des employés au manager";
          updatedFields.date_enregistrement_infos = new Date();
        }

        if (Object.keys(updatedFields).length > 0) {
          await navette.update(updatedFields, { isSystemUpdate: true });
          console.log(`Navette ${navette.id} mise à jour :`, updatedFields);
        }
      }
    }
  }
  Navette.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    service_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    periode_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    periode_debut_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    periode_fin_at: {
      type: DataTypes.DATE,
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
    etat: {
      type: DataTypes.ENUM(
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
      type: DataTypes.DATE,
      allowNull: true
    },
    date_enregistrement_infos: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_envoie_manager: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_envoie_paie: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_traitement_paie: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_cloture: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('En attente', 'En cours', 'bloqué', 'Terminé'),
      allowNull: false,
      defaultValue: 'En attente'
    },
    status_force: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    modelName: 'Navette',
    tableName: 'navettes',
    timestamps: true,
    paranoid: true,
    underscored: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (navette, options) => {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');

        if (!navette.code) {
          const prefix = `NAVETTE-${month}-${year}`;

          await sequelize.transaction(async (t) => {
            const lastNavette = await Navette.findOne({
              where: {
                code: { [Op.like]: `${prefix}%` }
              },
              order: [['code', 'DESC']],
              paranoid: false,
              lock: t.LOCK.UPDATE,
              transaction: t
            });

            let counter = 1;
            if (lastNavette && lastNavette.code) {
              const lastCodeNumber = parseInt(lastNavette.code.slice(-4), 10);
              if (!isNaN(lastCodeNumber)) {
                counter = lastCodeNumber + 1;
              }
            }

            navette.code = `${prefix}-${String(counter).padStart(4, '0')}`;
          });
        }
      },
      beforeUpdate: async (navette, options) => {
        // Si c'est une mise à jour système (ex: updateStatusAndEtat), on saute la vérification
        if (options.isSystemUpdate) return;

        const { User } = navette.sequelize.models;

        if (!navette.last_update_by) {
          throw new Error("Impossible de modifier cette navette : utilisateur non défini.");
        }

        // Récupérer l'utilisateur
        const user = await User.findByPk(navette.last_update_by);

        if (!user) {
          throw new Error("Utilisateur introuvable pour la navette.");
        }

        // Vérifier si l'utilisateur a le droit
        const is_paie = user.is_paie; // true/false

        if (!navette.isModifiable(is_paie)) {
          throw new Error("Impossible de modifier cette navette : elle est bloquée ou la période est terminée.");
        }
      },
      afterUpdate: async (navette, options) => {
        // Pas de log pour les mises à jour système
        if (options.isSystemUpdate) return;

        const { NavetteUpdated } = sequelize.models;

        const changedFields = navette.changed();

        if (!changedFields || changedFields.length === 0) return;

        // Construire un message détaillé
        const modifications = changedFields.map(field => {
          const oldValue = navette.previous(field);
          const newValue = navette.get(field);

          return `${field} : "${oldValue}" → "${newValue}"`;
        }).join(', ');

        await NavetteUpdated.create({
          employer_id: null,
          navette_id: navette.id,
          navette_ligne_id: null,
          user_id: navette.last_update_by,
          name: "Modification de la navette",
          note: `Changements : ${modifications}`,
          created_at: new Date()
        });
      }
    }
  });
  return Navette;
};