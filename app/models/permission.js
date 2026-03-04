'use strict';
const {
  Model
} = require('sequelize');
const slugify = require('slugify');
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsToMany(models.Role, {
        through: 'role_permissions',
        foreignKey: 'permission_id',
        otherKey: 'role_id',
        as: 'roles'
      });
    }
  }
  Permission.init({
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
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
  });
  return Permission;
};