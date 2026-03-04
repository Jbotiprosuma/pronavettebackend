// app/controllers/service.controller.js
const db = require('../models');
const Service = db.Service;
const User = db.User; // Pour vérifier les utilisateurs liés
const { Op } = require('sequelize'); // Import Op for more complex queries

// 1. Lister tous les services
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).json({
            message: 'Services récupérés avec succès.',
            data: services
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des services :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des services.', error: error.message });
    }
};

// 2. Récupérer un service par ID ou Slug
exports.getServiceByIdOrSlug = async (req, res) => {
    try {
        const { identifier } = req.params; // Peut être un ID ou un SLUG

        let service;
        if (isNaN(identifier)) {
            service = await Service.findOne({
                where: { slug: identifier }
            });
        } else { // Sinon, c'est un ID
            service = await Service.findByPk(identifier);
        }

        if (!service) {
            return res.status(404).json({ message: 'Service non trouvé.' });
        }
        res.status(200).json({
            message: 'Service récupéré avec succès.',
            data: service
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du service par ID ou slug :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du service.', error: error.message });
    }
};

// 3. Créer un nouveau service
exports.createService = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Le nom du service est obligatoire.' });
        }

        const existingService = await db.Service.findOne({ where: { name: name } }); // Vérifie l'unicité du nom
        if (existingService) {
            return res.status(409).json({ message: 'Ce nom de service existe déjà.' });
        }

        const newService = await db.Service.create({ name: name, description: description });
        // Le slug est généré automatiquement par le hook `beforeCreate` du modèle

        res.status(201).json({ message: 'Service créé avec succès.', data: newService });
    } catch (error) {
        console.error('Erreur lors de la création du service :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création du service.', error: error.message });
    }
};

// 4. Mettre à jour un service existant
exports.updateService = async (req, res) => {
    try {
        const { identifier } = req.params; // Peut être un ID ou un SLUG
        const { name, description } = req.body;

        let service;
        if (isNaN(identifier)) {
            service = await Service.findOne({ where: { slug: identifier } });
        } else {
            service = await Service.findByPk(identifier);
        }

        if (!service) {
            return res.status(404).json({ message: 'Service non trouvé.' });
        }

        // Vérifier si le nom existe déjà pour un autre service (excluant le service actuel)
        if (name && name !== service.name) {
            const existingServiceWithName = await Service.findOne({ where: { name: name, id: { [Op.ne]: service.id } } });
            if (existingServiceWithName) {
                return res.status(409).json({ message: 'Ce nom de service est déjà utilisé par un autre service.' });
            }
        }

        service.name = name !== undefined ? name : service.name;
        service.description = description !== undefined ? description : service.description;
        await service.save(); // Le hook `beforeUpdate` du modèle s'occupera du slug si `name` a changé

        res.status(200).json({ message: 'Service mis à jour avec succès.', data: service });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du service :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du service.', error: error.message });
    }
};

// 5. Supprimer un service (vérifier l'absence d'utilisateurs et de départements liés)
exports.deleteService = async (req, res) => {
    try {
        const { identifier } = req.params; // Peut être un ID ou un SLUG

        let service;
        if (isNaN(identifier)) {
            service = await Service.findOne({
                where: { slug: identifier },
                // Inclure les associations pour vérifier les dépendances
                include: [
                    { model: User, as: 'users' },
                ]
            });
        } else {
            service = await Service.findByPk(identifier, {
                // Inclure les associations pour vérifier les dépendances
                include: [
                    { model: User, as: 'users' },
                ]
            });
        }

        if (!service) {
            return res.status(404).json({ message: 'Service non trouvé.' });
        }

        // Empêcher la suppression si des utilisateurs ou des départements sont associés à ce service
        if (service.users && service.users.length > 0) {
            return res.status(400).json({ message: 'Impossible de supprimer ce service car des utilisateurs y sont associés. Veuillez réaffecter les utilisateurs d\'abord.' });
        }

        await service.destroy(); // Supprime le service

        res.status(200).json({ message: 'Service supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression du service :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression du service.', error: error.message });
    }
};