// app/controllers/notification.controller.js
const db = require('../models');
const Notification = db.Notification;
const { Op } = require('sequelize');

// ==========================================
// Récupérer les notifications de l'utilisateur connecté
// ==========================================
exports.getMyNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const filter = req.query.filter; // 'unread', 'read', ou undefined (all)

        const where = { user_id: req.user.id };
        if (filter === 'unread') where.is_read = false;
        else if (filter === 'read') where.is_read = true;

        const { rows, count } = await Notification.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });

        res.json({
            data: rows,
            totalCount: count,
            page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Erreur notifications:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des notifications: ' + error.message });
    }
};

// ==========================================
// Nombre de notifications non lues
// ==========================================
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.count({
            where: { user_id: req.user.id, is_read: false },
        });
        res.json({ count });
    } catch (error) {
        console.error('Erreur count notifications:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// Marquer une notification comme lue
// ==========================================
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notif = await Notification.findOne({
            where: { id, user_id: req.user.id },
        });
        if (!notif) {
            return res.status(404).json({ message: 'Notification introuvable.' });
        }
        await notif.update({ is_read: true, read_at: new Date() });
        res.json({ message: 'Notification marquée comme lue.', data: notif });
    } catch (error) {
        console.error('Erreur markAsRead:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// Marquer toutes les notifications comme lues
// ==========================================
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: { user_id: req.user.id, is_read: false } }
        );
        res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (error) {
        console.error('Erreur markAllAsRead:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// Supprimer une notification
// ==========================================
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Notification.destroy({
            where: { id, user_id: req.user.id },
        });
        if (!deleted) {
            return res.status(404).json({ message: 'Notification introuvable.' });
        }
        res.json({ message: 'Notification supprimée.' });
    } catch (error) {
        console.error('Erreur delete notification:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};
