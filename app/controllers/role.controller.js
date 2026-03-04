// app/controllers/role.controller.js
const db = require('../models');
const Role = db.Role;
const Permission = db.Permission;
const User = db.User; 
const { Op } = require('sequelize');

// 1. Lister tous les rôles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'description', 'slug'],
          through: { attributes: [] }
        }
      ],
      order: [['name', 'ASC']]
    });
    res.status(200).json({
      message: 'Rôles récupérés avec succès.',
      data: roles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des rôles.', error: error.message });
  }
};

// 2. Récupérer un rôle par ID ou Slug
exports.getRoleByIdOrSlug = async (req, res) => {
  try {
    const { identifier } = req.params;

    let role;
    if (isNaN(identifier)) {
      role = await Role.findOne({
        where: { slug: identifier },
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['id', 'name', 'description', 'slug'],
            through: { attributes: [] }
          }
        ]
      });
    } else {
      role = await Role.findByPk(identifier, {
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['id', 'name', 'description', 'slug'],
            through: { attributes: [] }
          }
        ]
      });
    }

    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé.' });
    }
    res.status(200).json({
      message: 'Rôle récupéré avec succès.',
      data: role
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du rôle par ID ou slug :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du rôle.', error: error.message });
  }
};

// 3. Créer un nouveau rôle
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom du rôle est obligatoire.' });
    }

    const existingRole = await Role.findOne({ where: { name: name } });
    if (existingRole) {
      return res.status(409).json({ message: 'Ce nom de rôle existe déjà.' });
    }

    // Le nouveau rôle est par défaut 'is_deletable: true'
    const newRole = await Role.create({ name, description: description || null, is_deletable: true });

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await Permission.findAll({ where: { id: permissionIds } });
      await newRole.addPermissions(permissions);
    }

    const createdRole = await Role.findByPk(newRole.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'description', 'slug'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({ message: 'Rôle créé avec succès.', data: createdRole });
  } catch (error) {
    console.error('Erreur lors de la création du rôle :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la création du rôle.', error: error.message });
  }
};

// 4. Mettre à jour un rôle existant
exports.updateRole = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { name, description, permissionIds } = req.body;

    let role;
    if (isNaN(identifier)) {
      role = await Role.findOne({ where: { slug: identifier } });
    } else {
      role = await Role.findByPk(identifier);
    }

    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé.' });
    }

    // VÉRIFICATION : Le rôle doit être modifiable
    if (!role.is_deletable) {
      return res.status(403).json({ message: 'Ce rôle système ne peut pas être modifié.' });
    }

    if (name && name !== role.name) {
      const existingRoleWithName = await Role.findOne({ where: { name: name, id: { [Op.ne]: role.id } } });
      if (existingRoleWithName) {
        return res.status(409).json({ message: 'Ce nom de rôle est déjà utilisé par un autre rôle.' });
      }
    }

    role.name = name !== undefined ? name : role.name;
    role.description = description !== undefined ? description : role.description;
    await role.save();

    // Mettre à jour les permissions associées
    if (permissionIds !== undefined) {
      // Vérifier que toutes les permissionIds existent
      const permissions = await Permission.findAll({ where: { id: permissionIds } });
      if (permissions.length !== permissionIds.length) {
          // Certaines permissions n'ont pas été trouvées
          return res.status(400).json({ message: 'Certaines permissions fournies sont invalides.' });
      }
      await role.setPermissions(permissions);
    }

    const updatedRole = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'description', 'slug'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(200).json({ message: 'Rôle mis à jour avec succès.', data: updatedRole });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du rôle.', error: error.message });
  }
};

// 5. Supprimer un rôle
exports.deleteRole = async (req, res) => {
  try {
    const { identifier } = req.params;

    let role;
    if (isNaN(identifier)) {
      role = await Role.findOne({
        where: { slug: identifier },
        include: [{ model: User, as: 'users' }]
      });
    } else {
      role = await Role.findByPk(identifier, {
        include: [{ model: User, as: 'users' }]
      });
    }

    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé.' });
    }

    // VÉRIFICATION : Le rôle doit être supprimable
    if (!role.is_deletable) {
      return res.status(403).json({ message: 'Ce rôle système ne peut pas être supprimé.' });
    }

    if (role.users && role.users.length > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer ce rôle car des utilisateurs y sont associés. Veuillez réaffecter les utilisateurs d\'abord.' });
    }

    await role.setPermissions([]);
    await role.destroy();

    res.status(200).json({ message: 'Rôle supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression du rôle.', error: error.message });
  }
};