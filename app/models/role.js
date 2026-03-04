// app/models/role.js
'use strict';
const {
  Model,
  Op
} = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.belongsToMany(models.Permission, {
        through: 'role_permissions', 
        foreignKey: 'role_id',
        otherKey: 'permission_id',
        as: 'permissions'
      });
      Role.hasMany(models.User, {
        foreignKey: 'role_id',
        as: 'users'
      });
    }

    static async ensureUniqueSlug(instance) {
      let baseSlug = instance.slug;
      let counter = 1;
      let uniqueSlug = baseSlug;

      while (true) {
        const existing = await Role.findOne({
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
  Role.init({
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
    is_deletable: { 
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true 
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    hooks: {
      beforeCreate: async (role) => {
        if (role.name) {
          role.slug = slugify(role.name, { lower: true, strict: true, locale: 'fr' });
        } else {
          role.slug = slugify(`role-${Date.now()}`, { lower: true, strict: true, locale: 'fr' });
        }
        await Role.ensureUniqueSlug(role);
      },
      beforeUpdate: async (role) => {
        if (role.changed('name') && role.name) {
          role.slug = slugify(role.name, { lower: true, strict: true, locale: 'fr' });
          await Role.ensureUniqueSlug(role);
        }
      }
    }
  });
  return Role;
};