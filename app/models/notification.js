// app/models/notification.js
'use strict';
module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM(
                'navette_lancee',          // Campagne lancée
                'navette_validee',         // Navette validée par représentant
                'navette_correction',      // Demande de correction
                'navette_envoi_paie',      // Navette envoyée à la paie
                'navette_signalement',     // Problème signalé
                'navette_cloturee',        // Navette clôturée
                'mutation_creee',          // Mutation créée
                'mutation_confirmee',      // Mutation confirmée
                'mutation_rejetee',        // Mutation rejetée
                'mutation_annulee',        // Mutation annulée
                'employe_importe',         // Import d'employés
                'campagne_rappel',         // Rappel délai campagne (3j avant / fin / prolongation)
                'general'                  // Notification générale
            ),
            defaultValue: 'general',
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        link: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'URL de redirection au clic sur la notification'
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'notifications',
        timestamps: false,
        underscored: true,
    });

    Notification.associate = function (models) {
        Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    // ==========================================
    // Méthode statique : créer des notifications pour une liste d'utilisateurs
    // ==========================================
    Notification.notifyUsers = async function (userIds, { title, message, type, link }) {
        if (!userIds || userIds.length === 0) return;
        const notifications = userIds.map(uid => ({
            user_id: uid,
            title,
            message,
            type,
            link,
            created_at: new Date(),
        }));
        return await Notification.bulkCreate(notifications);
    };

    // Méthode statique : notifier par rôle
    Notification.notifyByRole = async function (roleNames, { title, message, type, link }) {
        const users = await sequelize.models.User.findAll({
            include: [{
                model: sequelize.models.Role,
                as: 'role',
                where: { name: { [sequelize.Sequelize.Op.in]: roleNames } },
            }],
            attributes: ['id'],
        });
        const userIds = users.map(u => u.id);
        return await Notification.notifyUsers(userIds, { title, message, type, link });
    };

    // Méthode statique : notifier par service
    Notification.notifyByService = async function (serviceId, roleNames, { title, message, type, link }) {
        const whereClause = { service_id: serviceId };
        const includeClause = [];
        if (roleNames && roleNames.length > 0) {
            includeClause.push({
                model: sequelize.models.Role,
                as: 'role',
                where: { name: { [sequelize.Sequelize.Op.in]: roleNames } },
            });
        }
        const users = await sequelize.models.User.findAll({
            where: whereClause,
            include: includeClause,
            attributes: ['id'],
        });
        const userIds = users.map(u => u.id);
        return await Notification.notifyUsers(userIds, { title, message, type, link });
    };

    return Notification;
};
