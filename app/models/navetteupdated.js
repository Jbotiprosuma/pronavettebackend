'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class NavetteUpdated extends Model {
        static associate(models) {
            NavetteUpdated.belongsTo(models.Employer, { foreignKey: 'employer_id', as: 'employer' });
            NavetteUpdated.belongsTo(models.Navette, { foreignKey: 'navette_id', as: 'navette' });
            NavetteUpdated.belongsTo(models.NavetteLigne, { foreignKey: 'navette_ligne_id', as: 'navetteLigne' });
            NavetteUpdated.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
        }
    }

    NavetteUpdated.init({
        employer_id: DataTypes.BIGINT,
        navette_id: DataTypes.BIGINT,
        navette_ligne_id: DataTypes.BIGINT,
        user_id: DataTypes.BIGINT,
        name: DataTypes.TEXT,
        note: DataTypes.TEXT
    }, {
        sequelize,
        modelName: 'NavetteUpdated',
        tableName: 'navetteupdated',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return NavetteUpdated;
};
