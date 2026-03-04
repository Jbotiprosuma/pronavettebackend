// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notification.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Notifications de l'utilisateur connecté
router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
