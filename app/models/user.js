// app/models/user.js
'use strict';

const {
  Model,
  Op
} = require('sequelize');

const slugify = require('slugify');
const path = require('path');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
      });
      User.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'createur'
      });
      User.hasMany(models.Employer, {
        foreignKey: 'created_by',
        as: 'employers'
      });
      User.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      User.hasMany(models.UserLogin, {
        foreignKey: 'user_id',
        as: 'loginHistory'
      });
    }
    static async ensureUniqueSlug(instance) {
      let baseSlug = instance.slug;
      let counter = 1;
      let uniqueSlug = baseSlug;

      while (true) {
        const existing = await User.findOne({
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
  User.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      field: 'username'
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'nom'
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'prenom'
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    mail: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
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
    status: {
      type: DataTypes.ENUM('Activé', 'Désactivé'),
      allowNull: false,
      defaultValue: 'Activé'
    },
    genre: {
      type: DataTypes.ENUM('Homme', 'Femme'),
      allowNull: true,
      defaultValue: 'Homme'
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'role_id'
    },
    service_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'service_id'
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'created_by'
    },
    is_representant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_importer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_paie: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_paie'
    },
    is_manager: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_manager'
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_admin'
    },
    is_superadmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_superadmin'
    },
    is_sup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_sup'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.username) {
          user.slug = slugify(user.username, { lower: true, strict: true, locale: 'fr' });
        } else {
          const fallbackName = `${user.nom || ''}-${user.prenom || ''}`.trim();
          user.slug = slugify(fallbackName.length > 0 ? fallbackName : `user-${Date.now()}`, { lower: true, strict: true, locale: 'fr' });
        }
        await User.ensureUniqueSlug(user);
      },
      beforeUpdate: async (user) => {
        if (user.changed('username') && user.username) {
          user.slug = slugify(user.username, { lower: true, strict: true, locale: 'fr' });
          await User.ensureUniqueSlug(user);
        }
      }
    }
  });
  return User;
};