'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const HEURE_CODE_MAP = {
        '15': "HS01",
        '50': "HS02",
        '75': "HS03"
    };
    class EmployerHeure extends Model {
        static associate(models) {
            EmployerHeure.belongsTo(models.Employer, {
                foreignKey: 'employer_id',
                as: 'employer'
            });
            EmployerHeure.belongsTo(models.Navette, {
                foreignKey: 'navette_id',
                as: 'navette'
            });
            EmployerHeure.belongsTo(models.NavetteLigne, {
                foreignKey: 'navette_ligne_id',
                as: 'navette_ligne'
            });
        }
    }
    EmployerHeure.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        employer_id: DataTypes.BIGINT,
        navette_id: DataTypes.BIGINT,
        navette_ligne_id: DataTypes.BIGINT,

        heures: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        pourcentage: {
            type: DataTypes.ENUM('15', '50', '75'),
            allowNull: false
        },
        code_heure: {
            type: DataTypes.ENUM('HS01', 'HS02', 'HS03'),
            allowNull: true
        },
        deleted_at: DataTypes.DATE,
        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'EmployerHeure',
        tableName: 'employer_heures',
        timestamps: true,
        paranoid: true,
        underscored: true,
        hooks: {
            beforeCreate: (heure) => {
                heure.code_heure = HEURE_CODE_MAP[heure.pourcentage];
            },
            beforeUpdate: (heure) => {
                if (heure.changed("pourcentage")) {
                    heure.code_heure = HEURE_CODE_MAP[heure.pourcentage];
                }
            },
            afterCreate: async (heure) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateHeuresSupTotals(heure.navette_ligne_id);
            },
            afterUpdate: async (heure) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateHeuresSupTotals(heure.navette_ligne_id);
            },
            afterDestroy: async (heure) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateHeuresSupTotals(heure.navette_ligne_id);
            },
            afterRestore: async (heure) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateHeuresSupTotals(heure.navette_ligne_id);
            },
        }
    });
    return EmployerHeure;
};
