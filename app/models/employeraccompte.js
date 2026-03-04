// models/employeraccompte.js
'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class EmployerAccompte extends Model {
        static associate(models) {
            EmployerAccompte.belongsTo(models.Employer, {
                foreignKey: 'employer_id',
                as: 'employer'
            });
            EmployerAccompte.belongsTo(models.Navette, {
                foreignKey: 'navette_id',
                as: 'navette'
            });
            EmployerAccompte.belongsTo(models.NavetteLigne, {
                foreignKey: 'navette_ligne_id',
                as: 'navette_ligne'
            });
        }
    }
    EmployerAccompte.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        code_accompte: {
            type: DataTypes.STRING,
            defaultValue: "CL30"
        },
        employer_id: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        navette_id: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        navette_ligne_id: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        somme: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        motif: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        modelName: 'EmployerAccompte',
        tableName: 'employer_accomptes',
        timestamps: true,
        paranoid: true,
        underscored: true,
        hooks: {
            afterCreate: async (accompte, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAccompteTotal(accompte.navette_ligne_id);
            },
            afterUpdate: async (accompte, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAccompteTotal(accompte.navette_ligne_id);
            },
            afterDestroy: async (accompte, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAccompteTotal(accompte.navette_ligne_id);
            },
            afterRestore: async (accompte, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAccompteTotal(accompte.navette_ligne_id);
            },
        }
    });
    return EmployerAccompte;
};