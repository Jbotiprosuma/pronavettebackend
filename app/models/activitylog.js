// app/models/activitylog.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    /**
     * Méthode utilitaire pour créer un log d'activité facilement.
     * @param {object} req - Express request (pour user, ip, user-agent)
     * @param {object} data - { module, action, target_id, target_label, description, old_values, new_values }
     */
    static async log(req, data) {
      try {
        return await ActivityLog.create({
          user_id: req?.user?.id || null,
          module: data.module,
          action: data.action,
          target_id: data.target_id || null,
          target_label: data.target_label || null,
          description: data.description,
          old_values: data.old_values || null,
          new_values: data.new_values || null,
          ip_address: req?.ip || req?.connection?.remoteAddress || null,
          user_agent: req?.headers?.['user-agent']?.substring(0, 500) || null,
        });
      } catch (err) {
        console.error('Erreur ActivityLog.log:', err.message);
      }
    }
  }

  ActivityLog.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    module: {
      type: DataTypes.ENUM('campagne', 'navette', 'mutation', 'employe'),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    target_label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'activity_logs',
    timestamps: false,
    underscored: true,
  });

  return ActivityLog;
};
