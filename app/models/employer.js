'use strict';
const { Op, Model } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class Employer extends Model {
    static associate(models) {
      Employer.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      Employer.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      Employer.hasMany(models.NavetteLigne, {
        foreignKey: 'employer_id',
        as: 'navette_lignes'
      });
      Employer.hasMany(models.EmployerAccompte, {
        foreignKey: 'employer_id',
        as: 'acomptes'
      });
      Employer.hasMany(models.EmployerAb, {
        foreignKey: 'employer_id',
        as: 'absences'
      });
      Employer.hasMany(models.EmployerHeure, {
        foreignKey: 'employer_id',
        as: 'heuresSup'
      });
      Employer.hasMany(models.EmployerPrime, {
        foreignKey: 'employer_id',
        as: 'primes'
      });
      Employer.hasMany(models.EmployerPrimeNuit, {
        foreignKey: 'employer_id',
        as: 'primesNuit'
      });

      Employer.hasMany(models.EmployerMutation, {
        foreignKey: 'employer_id',
        as: 'employermutation'
      });

      Employer.hasMany(models.EmployerUpdated, {
        foreignKey: 'employer_id',
        as: 'logs'
      });

      Employer.hasMany(models.EmployerHistory, {
        foreignKey: 'employer_id',
        as: 'historique'
      });
    }

    static async ensureUniqueSlug(instance) {
      let baseSlug = instance.slug;
      let counter = 1;
      let uniqueSlug = baseSlug;

      while (true) {
        const existing = await Employer.findOne({
          where: {
            slug: uniqueSlug,
            id: { [Op.ne]: instance.id }
          },
          paranoid: false
        });

        if (!existing) {
          instance.slug = uniqueSlug;
          break;
        }

        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
  }

  Employer.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    matricule: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: true
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: {
          msg: "Le format de l'email est invalide."
        },
      },
    },
    avatar_url: {
      type: DataTypes.STRING,
      field: 'avatar_url',
      get() {
        const storedValue = this.getDataValue('avatar_url');
        if (storedValue) return storedValue;

        const nom = this.getDataValue('nom') || '';
        const prenom = this.getDataValue('prenom') || '';
        const initials = `${(prenom[0] || '')}${(nom[0] || '')}`.toUpperCase();

        const bgColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const svg = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
                    <rect width="100%" height="100%" fill="${bgColor}" />
                    <text x="50%" y="50%" font-size="48" fill="#ffffff" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif">
                        ${initials}
                    </text>
                  </svg>
              `;

        const base64 = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
      }
    },
    poste_occupe: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'poste_occupe'
    },
    genre: {
      type: DataTypes.ENUM('Homme', 'Femme'),
      allowNull: true
    },
    service_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'service_id'
    },
    is_cadre: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_cadre'

    },
    status: {
      type: DataTypes.ENUM('Activé', 'Désactivé'),
      allowNull: false,
      defaultValue: 'Activé'
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'created_by'

    },
    last_update_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'last_update_by'
    },
    date_embauche: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'date_embauche'
    },
    date_depart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'date_depart'
    },
    type_depart: {
      type: DataTypes.ENUM('DEMISSION', 'RETRAITE', 'DECES', 'LICENCIEMENT'),
      allowNull: true,
      field: 'type_depart'
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
    modelName: 'Employer',
    tableName: 'employers',
    timestamps: true,
    paranoid: true,
    underscored: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (employer) => {
        if (employer.nom) {
          const fallbackName = `${employer.nom || ''}-${employer.prenom || ''}`.trim();
          employer.slug = slugify(fallbackName.length > 0 ? fallbackName : `employer-${Date.now()}`, { lower: true, strict: true, locale: 'fr' });
        }
        await Employer.ensureUniqueSlug(employer);
      },
      afterCreate: async (employer, options) => {
        const Navette = sequelize.models.Navette;
        const NavetteLigne = sequelize.models.NavetteLigne;
        const service_id = employer.service_id;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const periode_at = new Date(currentYear, currentMonth, 1);
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Différence en millisecondes
        const diff = lastDayOfMonth - now;

        // Convertir en jours
        const nb_jours = Math.ceil(diff / (1000 * 60 * 60 * 24));

        // 1️⃣ Vérifier s'il existe une navette pour la période
        const navette = await Navette.findOne({
          where: {
            service_id: service_id,
            periode_at: periode_at,
          },
          paranoid: true,
        });

        // Si aucune navette → on s'arrête
        if (!navette) {
          return;
        }

        // 2️⃣ Vérifier si la ligne navette existe déjà pour cet employé
        const existingNavetteLigne = await NavetteLigne.findOne({
          where: {
            employer_id: employer.id,
            service_id: service_id,
            periode_at: periode_at,
          },
          paranoid: true,
        });

        // 3️⃣ Si la ligne n'existe pas ET l’employé n’est pas parti, on la crée
        if (!existingNavetteLigne && employer.date_depart == null) {
          await NavetteLigne.create({
            employer_id: employer.id,
            nb_jours: nb_jours,
            navette_id: navette.id,
            service_id: service_id,
            periode_at: periode_at,
            status: employer.is_cadre ? "Cadre" : "Non cadre",
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      },
      beforeUpdate: async (employer, options) => {
        try {
          const Navette = sequelize.models.Navette;
          const service_id = employer.service_id;
          const changed = employer.changed() || [];
          if (employer.changed('nom') || employer.changed('prenom')) {
            const fallbackName = `${employer.nom || ''}-${employer.prenom || ''}`.trim();
            employer.slug = slugify(fallbackName.length > 0 ? fallbackName : `employer-${Date.now()}`, { lower: true, strict: true, locale: 'fr' });
            await Employer.ensureUniqueSlug(employer);
          }
          if (!changed.includes('service_id')) {
            return;
          }
          // compute periode_at as first day of current month
          const now = new Date();
          const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);
          // 1️⃣ Vérifier s'il existe une navette pour la période
          const navette = await Navette.findOne({
            where: {
              service_id: service_id,
              periode_at: periode_at,
            },
            paranoid: true,
          });

          if (!navette) {
            return;
          }

          if (navette) {
            throw new Error("Impossible de modifier le service des employés pendant car l'etat navette est lancé attendez la fin ou utilisez-la.");
          }
        } catch (err) {
          console.error('beforeUpdate employer hook error:', err);
        }
      },
      afterUpdate: async (employer, options) => {

        const changed = employer.changed();

        if (!changed || changed.length === 0) return;

        const before = employer._previousDataValues;
        const after = employer.dataValues;

        const modifications = changed.map(field => {
          return `${field}: "${before[field]}" → "${after[field]}"`;
        }).join('\n');

        const logText = `Changements:\n${modifications}`;

        await sequelize.models.EmployerUpdated.create({
          employer_id: employer.id,
          user_id: employer.last_update_by || null,
          name: `Mise à jour de l’employé ${employer.matricule}`,
          note: logText,
          created_at: new Date()
        });
      },
    }
  });
  return Employer;
};