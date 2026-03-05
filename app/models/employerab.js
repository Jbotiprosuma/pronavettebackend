'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

    const CODE_ABSENCE = {
        ABSENCE_NON_REMUNEREE: "HA10",
        ACCIDENT_DE_TRAVAIL: "HA06",
        ABSENCE_MISE_A_PIEDS: "HA10",
        ABSENCE_CONGES_DE_MATERNITE: "HA08",
        ABSENCE_CONGES_PAYE: "HC02",
        ABSENCE_REMUNEREE: "HC01",
        ABSENCE_PATERNITE: "HA09",
        ABSENCE_MALADIE: "HA05",
        ABSENCE_FORMATION: "HA07",
        ABSENCE_CONGES_A_CALCULER: "HA03",
        ABSENCE_CONGES_SUP_MATERNITE: "HA04"
    };

    class EmployerAb extends Model {
        static associate(models) {
            EmployerAb.belongsTo(models.Employer, {
                foreignKey: 'employer_id',
                as: 'employer'
            });
            EmployerAb.belongsTo(models.Navette, {
                foreignKey: 'navette_id',
                as: 'navette'
            });
            EmployerAb.belongsTo(models.NavetteLigne, {
                foreignKey: 'navette_ligne_id',
                as: 'navette_ligne'
            });
        }
    }

    EmployerAb.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        employer_id: DataTypes.BIGINT,
        navette_id: DataTypes.BIGINT,
        navette_ligne_id: DataTypes.BIGINT,
        nb_jours: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        type_abs: {
            type: DataTypes.ENUM(
                'ABSENCE_NON_REMUNEREE',
                'ACCIDENT_DE_TRAVAIL',
                'ABSENCE_MISE_A_PIEDS',
                'ABSENCE_CONGES_DE_MATERNITE',
                'ABSENCE_CONGES_PAYE',
                'ABSENCE_REMUNEREE',
                'ABSENCE_PATERNITE',
                'ABSENCE_MALADIE',
                'ABSENCE_FORMATION',
                'ABSENCE_CONGES_A_CALCULER',
                'ABSENCE_CONGES_SUP_MATERNITE'
            ),
            allowNull: false
        },
        code_abs: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        images: DataTypes.JSON,
        motif: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "ABSENCE JUSTIFIE"
        },
        deleted_at: DataTypes.DATE,
        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE

    }, {
        sequelize,
        modelName: 'EmployerAb',
        tableName: 'employer_abs',
        timestamps: true,
        paranoid: true,
        underscored: true,
        hooks: {
            beforeCreate: (absence) => {
                absence.code_abs = CODE_ABSENCE[absence.type_abs];
            },

            beforeUpdate: (absence) => {
                if (absence.changed("type_abs")) {
                    absence.code_abs = CODE_ABSENCE[absence.type_abs];
                }
            },

            afterCreate: async (absence) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAbsenceTotal(absence.navette_ligne_id);
            },
            afterUpdate: async (absence) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAbsenceTotal(absence.navette_ligne_id);
            },
            afterDestroy: async (absence) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAbsenceTotal(absence.navette_ligne_id);
            },
            afterRestore: async (absence) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updateAbsenceTotal(absence.navette_ligne_id);
            }
        }
    });

    return EmployerAb;
};
