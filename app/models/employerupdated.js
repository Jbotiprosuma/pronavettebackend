'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class EmployerUpdated extends Model {
        static associate(models) {
            // Log appartient à un employé
            EmployerUpdated.belongsTo(models.Employer, {
                foreignKey: 'employer_id',
                as: 'employer'
            });

            // Log créé par un user
            EmployerUpdated.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user'
            });
        }
    }

    EmployerUpdated.init({
        employer_id: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'EmployerUpdated',
        tableName: 'employerupdated',
        timestamps: false,
        underscored: true
    });

    return EmployerUpdated;
};
