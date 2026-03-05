'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class EmployerPrimeNuit extends Model {
        static associate(models) {
            EmployerPrimeNuit.belongsTo(models.Employer, {
                foreignKey: 'employer_id',
                as: 'employer'
            });
            EmployerPrimeNuit.belongsTo(models.Navette, {
                foreignKey: 'navette_id',
                as: 'navette'
            });
            EmployerPrimeNuit.belongsTo(models.NavetteLigne, {
                foreignKey: 'navette_ligne_id',
                as: 'navette_ligne'
            });
        }
    }
    EmployerPrimeNuit.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        code_prime_nuit: {
            type: DataTypes.STRING,
            allowNull: true
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
        nb_jour: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
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
        modelName: 'EmployerPrimeNuit',
        tableName: 'employer_prime_nuits',
        timestamps: true,
        paranoid: true,
        underscored: true,
        hooks: {
            beforeCreate: async (prime, options) => {
                if (prime.code_prime_nuit === "CL12") {

                    const EmployerPrimeNuit = sequelize.models.EmployerPrimeNuit;
                    const primesToAdd = ["CL06", "CL22"];

                    for (const code of primesToAdd) {
                        const exists = await EmployerPrimeNuit.findOne({
                            where: {
                                employer_id: prime.employer_id,
                                navette_id: prime.navette_id,
                                navette_ligne_id: prime.navette_ligne_id,
                                code_prime_nuit: code
                            },
                            transaction: options.transaction
                        });

                        if (!exists) {
                            await EmployerPrimeNuit.create({
                                employer_id: prime.employer_id,
                                navette_id: prime.navette_id,
                                navette_ligne_id: prime.navette_ligne_id,
                                code_prime_nuit: code,
                                nb_jour: prime.nb_jour,
                                created_at: new Date(),
                                updated_at: new Date(),
                            }, { transaction: options.transaction });
                        }
                    }
                }
            },
            beforeUpdate: async (prime, options) => {
                if (prime.code_prime_nuit === "CL12") {

                    const EmployerPrimeNuit = sequelize.models.EmployerPrimeNuit;
                    const linkedCodes = ["CL06", "CL22"];

                    await EmployerPrimeNuit.update(
                        {
                            nb_jour: prime.nb_jour
                        },
                        {
                            where: {
                                employer_id: prime.employer_id,
                                navette_id: prime.navette_id,
                                navette_ligne_id: prime.navette_ligne_id,
                                code_prime_nuit: linkedCodes
                            },
                            transaction: options.transaction
                        }
                    );
                }
            },
            afterCreate: async (prime, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updatePrimeNuitTotal(prime.navette_ligne_id);
            },
            afterUpdate: async (prime, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updatePrimeNuitTotal(prime.navette_ligne_id);
            },
            afterDestroy: async (prime, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updatePrimeNuitTotal(prime.navette_ligne_id);
            },
            afterRestore: async (prime, options) => {
                const NavetteLigne = sequelize.models.NavetteLigne;
                await NavetteLigne.updatePrimeNuitTotal(prime.navette_ligne_id);
            }
        }
    });
    return EmployerPrimeNuit;
};