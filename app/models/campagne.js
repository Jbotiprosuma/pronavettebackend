// models/campagne.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Campagne extends Model {
    static associate(models) {
      Campagne.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  Campagne.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    mois: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 }
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    periode_debut_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    periode_fin_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('programmee', 'active', 'terminee', 'desactivee'),
      allowNull: false,
      defaultValue: 'programmee'
    },
    is_executed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    sequelize,
    modelName: 'Campagne',
    tableName: 'campagnes',
    timestamps: true,
    paranoid: true,
    underscored: true,
    deletedAt: 'deleted_at',
  });

  return Campagne;
};
