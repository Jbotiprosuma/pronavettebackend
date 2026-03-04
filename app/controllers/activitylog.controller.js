// app/controllers/activitylog.controller.js
const db = require('../models');
const { Op } = require('sequelize');
const ActivityLog = db.ActivityLog;
const User = db.User;

/**
 * Lister les logs d'activité par module
 * GET /api/activity-logs?module=campagne&target_id=5&page=1&limit=50&action=launch&from=2026-01-01&to=2026-12-31
 */
exports.getByModule = async (req, res) => {
    try {
        const {
            module: moduleName,
            target_id,
            action,
            user_id,
            from,
            to,
            page = 1,
            limit = 50,
        } = req.query;

        if (!moduleName) {
            return res.status(400).json({ message: 'Le paramètre "module" est obligatoire.' });
        }

        const where = { module: moduleName };

        if (target_id) where.target_id = target_id;
        if (action) where.action = action;
        if (user_id) where.user_id = user_id;
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at[Op.gte] = new Date(from);
            if (to) where.created_at[Op.lte] = new Date(to + 'T23:59:59');
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await ActivityLog.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'nom', 'prenom'],
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            message: 'Logs récupérés avec succès.',
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Erreur getByModule ActivityLog:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

/**
 * Lister les logs pour une entité spécifique
 * GET /api/activity-logs/:module/:targetId
 */
exports.getByTarget = async (req, res) => {
    try {
        const { module: moduleName, targetId } = req.params;
        const { page = 1, limit = 30 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await ActivityLog.findAndCountAll({
            where: { module: moduleName, target_id: targetId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'nom', 'prenom'],
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            message: 'Logs récupérés avec succès.',
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Erreur getByTarget ActivityLog:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

/**
 * Statistiques globales des logs
 * GET /api/activity-logs/stats
 */
exports.getStats = async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = {};
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at[Op.gte] = new Date(from);
            if (to) where.created_at[Op.lte] = new Date(to + 'T23:59:59');
        }

        const [byModule, byAction, totalCount] = await Promise.all([
            ActivityLog.findAll({
                where,
                attributes: [
                    'module',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                ],
                group: ['module'],
                raw: true,
            }),
            ActivityLog.findAll({
                where,
                attributes: [
                    'module',
                    'action',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                ],
                group: ['module', 'action'],
                order: [['module', 'ASC'], [db.sequelize.literal('count'), 'DESC']],
                raw: true,
            }),
            ActivityLog.count({ where }),
        ]);

        res.json({
            data: {
                total: totalCount,
                byModule,
                byAction,
            }
        });
    } catch (error) {
        console.error('Erreur getStats ActivityLog:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};
