// app/models/service.js
'use strict';
const {
  Model,
  Op
} = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.hasMany(models.User, {
        foreignKey: 'service_id',
        as: 'users'
      });
      Service.hasMany(models.Employer, {
        foreignKey: 'service_id',
        as: 'employers'
      });
      Service.hasMany(models.Navette, {
        foreignKey: 'service_id',
        as: 'navettes'
      });
      Service.hasMany(models.NavetteLigne, {
        foreignKey: 'service_id',
        as: 'navette_lignes'
      });
    }

    static async ensureUniqueSlug(instance) {
      let baseSlug = instance.slug;
      let counter = 1;
      let uniqueSlug = baseSlug;

      while (true) {
        const existing = await Service.findOne({
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
  Service.init({
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
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    description: DataTypes.STRING,

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }

  }, {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (service) => {
        if (service.name) {
          service.slug = slugify(service.name, { lower: true, strict: true, locale: 'fr' });
        } else {
          service.slug = slugify(`service-${Date.now()}`, { lower: true, strict: true, locale: 'fr' });
        }
        await Service.ensureUniqueSlug(service);
      },
      beforeUpdate: async (service) => {
        if (service.changed('name') && service.name) {
          service.slug = slugify(service.name, { lower: true, strict: true, locale: 'fr' });
          await Service.ensureUniqueSlug(service);
        }
      }
    }
  });
  return Service;
};