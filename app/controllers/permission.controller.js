// app/controllers/permission.controller.js
const db = require('../models');
const Permission = db.Permission;
const Role = db.Role;
const { Op } = require('sequelize');

// 1. Lister toutes les permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['name', 'ASC']]
    });
    res.status(200).json({
      message: 'Permissoins récupérées avec succès.',
      data: permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des permissions.', error: error.message });
  }
};

// 2. Récupérer une permission par ID ou Slug
exports.getPermissionByIdOrSlug = async (req, res) => {
  try {
    const { identifier } = req.params; // Peut être un ID ou un SLUG

    let permission;
    if (isNaN(identifier)) { // Si l'identifiant n'est pas un nombre, on assume que c'est un slug
      permission = await Permission.findOne({ where: { slug: identifier } });
    } else { // Sinon, c'est un ID
      permission = await Permission.findByPk(identifier);
    }

    if (!permission) {
      return res.status(404).json({ message: 'Permission non trouvée.' });
    }
    res.status(200).json(permission);
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission par ID ou slug :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de la permission.', error: error.message });
  }
};

// 3. Créer une nouvelle permission (Pas de changement majeur lié au slug, il est généré par le hook du modèle)
exports.createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom de la permission est obligatoire.' });
    }

    const existingPermission = await Permission.findOne({ where: { name: name } }); // Vérifie l'unicité du nom
    if (existingPermission) {
      return res.status(409).json({ message: 'Ce nom de permission existe déjà.' });
    }

    const newPermission = await Permission.create({ name, description: description || null });
    // Le slug est généré automatiquement par le hook `beforeCreate` du modèle

    res.status(201).json({ message: 'Permission créée avec succès.', permission: newPermission });
  } catch (error) {
    console.error('Erreur lors de la création de la permission :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la création de la permission.', error: error.message });
  }
};

// 4. Mettre à jour une permission existante (Le slug sera mis à jour par le hook si le nom change)
exports.updatePermission = async (req, res) => {
  try {
    const { identifier } = req.params; // Peut être un ID ou un SLUG
    const { name, description } = req.body;

    let permission;
    if (isNaN(identifier)) {
      permission = await Permission.findOne({ where: { slug: identifier } });
    } else {
      permission = await Permission.findByPk(identifier);
    }

    if (!permission) {
      return res.status(404).json({ message: 'Permission non trouvée.' });
    }

    // Vérifier si le nom existe déjà pour une autre permission (excluant la permission actuelle)
    if (name && name !== permission.name) {
      const existingPermissionWithName = await Permission.findOne({ where: { name: name, id: { [Op.ne]: permission.id } } });
      if (existingPermissionWithName) {
        return res.status(409).json({ message: 'Ce nom de permission est déjà utilisé par une autre permission.' });
      }
    }

    permission.name = name !== undefined ? name : permission.name;
    permission.description = description !== undefined ? description : permission.description;
    await permission.save(); // Le hook `beforeUpdate` du modèle s'occupera du slug si `name` a changé

    res.status(200).json({ message: 'Permission mise à jour avec succès.', permission: permission });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de la permission.', error: error.message });
  }
};

// 5. Supprimer une permission (vérifier si elle est liée à des rôles)
exports.deletePermission = async (req, res) => {
  try {
    const { identifier } = req.params; // Peut être un ID ou un SLUG

    let permission;
    if (isNaN(identifier)) {
      permission = await Permission.findOne({
        where: { slug: identifier },
        include: [{ model: Role, as: 'roles' }] // Inclure les rôles associés
      });
    } else {
      permission = await Permission.findByPk(identifier, {
        include: [{ model: Role, as: 'roles' }] // Inclure les rôles associés
      });
    }


    if (!permission) {
      return res.status(404).json({ message: 'Permission non trouvée.' });
    }

    // Empêcher la suppression si la permission est associée à des rôles
    if (permission.roles && permission.roles.length > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer cette permission car elle est associée à un ou plusieurs rôles. Veuillez d\'abord la retirer des rôles.' });
    }

    await permission.destroy();

    res.status(200).json({ message: 'Permission supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la permission.', error: error.message });
  }
};