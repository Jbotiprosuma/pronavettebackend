// app/controllers/user.controller.js
const db = require('../models');
const User = db.User;
const Role = db.Role;
const Service = db.Service;
const Employer = db.Employer;
const UserLogin = db.UserLogin;
const { Op } = require('sequelize');
const multer = require('multer');
const { sendAccountCreationEmail } = require('./../services/email.service');

// Fonction utilitaire pour inclure les associations (inchangée, c'est parfait)
const includeUserAssociations = () => [
    { model: Role, as: 'role', attributes: ['id', 'name', 'slug'] },
    { model: Service, as: 'service', attributes: ['id', 'name'] },
    { model: UserLogin, as: 'loginHistory' },
    { model: Employer, as: 'employers' },
];

exports.users = async (req, res) => {
    try {
        const users = await User.findAll({
            where: {
                is_sup: false,
                id: { [Op.ne]: req.user.id },
            },
            include: includeUserAssociations(),
            order: [['nom', 'ASC']]
        });
        res.status(200).json({
            message: 'Services récupérés avec succès.',
            data: users
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateur.', error: error.message });
    }
};

exports.getUserByIdOrSlug = async (req, res) => {
    try {
        const { identifier } = req.params;

        let user;

        user = await User.findOne({
            where: { slug: identifier },
            include: includeUserAssociations(),
            paranoid: true,
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        res.status(200).json({ message: 'Utilisateur récupéré avec succès.', data: user });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur par ID ou slug :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de l\'utilisateur.', error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const {
            username,
            nom,
            prenom,
            email,
            mail,
            genre,
            role_id,
            service_id,
            is_importer,
            is_representant,
            is_paie,
            is_manager,
            is_admin,
            is_superadmin,
        } = req.body;

        // Validation des champs obligatoires
        if (!username || !nom || !prenom || !email || !mail || !role_id || !service_id) {
            return res.status(200).json({ status: false, message: 'Veuillez fournir tous les champs obligatoires (username, nom, prenom, emails, role, service).' });
        }

        // Vérifier si l'utilisateur ou l'email existe déjà (y compris les soft-deleted)
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username: username }, { email: email }, { mail: mail }]
            },
            paranoid: false
        });

        if (existingUser) {
            if (existingUser.deletedAt) {
                // Si l'utilisateur existant est soft-deleted, on peut suggérer de le restaurer
                return res.status(200).json({
                    status: false,
                    message: `Un utilisateur avec ce nom d'utilisateur ou cet email existe déjà mais est archivé. ID: ${existingUser.id}, Slug: ${existingUser.slug}. Vous pouvez tenter de le restaurer.`,
                    user: existingUser
                });
            }
            return res.status(200).json({ status: false, message: 'La création de l\'utilisateur a été refusée ! Le nom de l\'utilisateur ou l\'email existe déjà .' });
        }

        // Vérifier l'existence du rôle
        const role = await Role.findByPk(role_id);
        if (!role) {
            return res.status(200).json({ status: false, message: 'Le rôle spécifié n\'existe pas.' });
        }

        // Vérifier l'existence du service (obligatoire selon le modèle)
        const service = await Service.findByPk(service_id);
        if (!service) {
            return res.status(200).json({ status: false, message: 'Le service spécifié n\'existe pas.' });
        }




        const newUser = await User.create({
            username,
            nom,
            prenom,
            email,
            mail,
            genre,
            role_id,
            service_id,
            created_by: req.user.id,
            is_representant,
            is_importer,
            is_paie,
            is_manager,
            is_admin,
            is_superadmin,
        });

        // Récupérer le nouvel utilisateur avec les associations pour la réponse
        const createdUser = await User.findByPk(newUser.id, {
            include: includeUserAssociations(),
        });

        let setGenre = genre === "Homme" ? "monsieur" : "madame";
        const now = new Date();
        const hour = now.getHours();
        let greeting;

        if (hour >= 5 && hour < 18) {
            greeting = "Bonjour";
        } else {
            greeting = "Bonsoir";
        }

        const name = `${greeting} ${setGenre} ${createdUser.prenom} ${createdUser.nom}`;

        await sendAccountCreationEmail(mail, email, name);

        res.status(201).json({ status: true, message: 'Utilisateur créé avec succès.', user: createdUser });
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de l\'utilisateur.', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = req.user;
        const { identifier } = req.params;
        const {
            username,
            nom,
            prenom,
            email,
            mail,
            genre,
            role_id,
            service_id,
            is_importer,
            is_representant,
            is_paie,
            is_manager,
            is_admin,
            is_superadmin,
        } = req.body;

        let userToUpdate;
        if (isNaN(identifier)) {
            userToUpdate = await User.findOne({ where: { slug: identifier } });
        } else {
            userToUpdate = await User.findByPk(identifier);
        }

        if (!userToUpdate) {
            return res.status(201).json({ status: false, message: 'Utilisateur non trouvé.' });
        }

        // Vérifier l'unicité du username et email si modifiés (excluant l'utilisateur actuel)
        if (username && username !== userToUpdate.username) {
            const existingUserWithUsername = await User.findOne({ where: { username: username, id: { [Op.ne]: userToUpdate.id } }, paranoid: false });
            if (existingUserWithUsername) {
                return res.status(201).json({ status: false, message: 'Ce nom d\'utilisateur est déjà pris.' });
            }
        }

        if (email && email !== userToUpdate.email) {
            const existingUserWithEmail = await User.findOne({ where: { email: email, id: { [Op.ne]: userToUpdate.id } }, paranoid: false });
            if (existingUserWithEmail) {
                return res.status(201).json({ status: false, message: 'Cet email est déjà utilisé.' });
            }
        }

        if (user.is_sup || (user.is_superadmin && !userToUpdate.isSuperadmin) || (user.is_admin && !userToUpdate.isSuperadmin && !userToUpdate.isAdmin)) {
            // Mise à jour des champs généraux
            userToUpdate.username = username !== undefined ? username : userToUpdate.username;
            userToUpdate.nom = nom !== undefined ? nom : userToUpdate.nom;
            userToUpdate.prenom = prenom !== undefined ? prenom : userToUpdate.prenom;
            userToUpdate.email = email !== undefined ? email : userToUpdate.email;
            userToUpdate.mail = mail !== undefined ? mail : userToUpdate.mail;
            userToUpdate.genre = genre !== undefined ? genre : userToUpdate.genre;
            userToUpdate.role_id = role_id !== undefined ? role_id : userToUpdate.role_id;
            userToUpdate.service_id = service_id !== undefined ? service_id : userToUpdate.service_id;
            userToUpdate.is_representant = is_representant !== undefined ? is_representant : userToUpdate.is_representant;
            userToUpdate.is_importer = is_importer !== undefined ? is_importer : userToUpdate.is_importer;
            userToUpdate.is_paie = is_paie !== undefined ? is_paie : userToUpdate.is_paie;
            userToUpdate.is_manager = is_manager !== undefined ? is_manager : userToUpdate.is_manager;
            userToUpdate.is_admin = is_admin !== undefined ? is_admin : userToUpdate.is_admin;
            userToUpdate.is_superadmin = is_superadmin !== undefined ? is_superadmin : userToUpdate.is_superadmin;

            await userToUpdate.save();

            const updatedUser = await User.findByPk(userToUpdate.id, {
                include: includeUserAssociations(),
            });

            res.status(200).json({ status: true, message: 'Informations générales de l\'utilisateur mises à jour avec succès.', user: updatedUser });
        } else {
            return res.status(201).json({ status: false, message: 'Permission non accordée !' });
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'utilisateur.', error: error.message });
    }
};

exports.updateUserInformation = async (req, res) => {
    try {
        const { identifier } = req.params;
        const { nom, prenom, genre } = req.body;

        let userToUpdate;
        if (isNaN(identifier)) {
            userToUpdate = await User.findOne({ where: { slug: identifier }, paranoid: false });
        } else {
            userToUpdate = await User.findByPk(identifier, { paranoid: false });
        }

        if (!userToUpdate) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        // Vérification des permissions
        const isCurrentUser = (req.user && req.user.id === userToUpdate.id);
        const canManageUsers = (req.permissions && req.permissions.includes('user.manage'));

        if (!isCurrentUser && !canManageUsers) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier les informations personnelles de cet utilisateur.' });
        }

        // Mise à jour des champs autorisés
        userToUpdate.nom = nom !== undefined ? nom : userToUpdate.nom;
        userToUpdate.prenom = prenom !== undefined ? prenom : userToUpdate.prenom;
        userToUpdate.genre = genre !== undefined ? genre : userToUpdate.genre;

        await userToUpdate.save();

        const updatedUser = await User.findByPk(userToUpdate.id, {
            include: includeUserAssociations(),
        });

        res.status(200).json({ message: 'Informations personnelles mises à jour avec succès.', user: updatedUser });

    } catch (error) {
        console.error('Erreur lors de la mise à jour des informations personnelles de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour des informations personnelles.', error: error.message });
    }
};

exports.updateUserPhoto = async (req, res) => {
    try {
        const { identifier } = req.params;

        let userToUpdate;
        if (isNaN(identifier)) {
            userToUpdate = await User.findOne({ where: { slug: identifier }, paranoid: false });
        } else {
            userToUpdate = await User.findByPk(identifier, { paranoid: false });
        }

        if (!userToUpdate) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        // Vérification des permissions
        const isCurrentUser = (req.user && req.user.id === userToUpdate.id);
        const canManageUsers = (req.permissions && req.permissions.includes('user.manage'));

        if (!isCurrentUser && !canManageUsers) {
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier la photo de cet utilisateur.' });
        }

        let newAvatarUrl = userToUpdate.avatar_url; // Par défaut, ne change rien

        // Si un fichier est uploadé, utiliser son chemin
        if (req.file) {
            // Assure-toi que baseUrl correspond à la configuration de ton serveur de fichiers statiques
            const baseUrl = `http://localhost:4000`;
            newAvatarUrl = `${baseUrl}/avatars/${req.file.filename}`;
        } else if (req.body.reset_avatar === 'true') { // Permet de réinitialiser à l'avatar généré dynamiquement
            newAvatarUrl = null; // En mettant à null, le getter du modèle générera un avatar par défaut
        } else {
            return res.status(400).json({ message: 'Aucun fichier d\'image n\'a été fourni ou la demande de réinitialisation est manquante.' });
        }

        userToUpdate.avatar_url = newAvatarUrl;

        await userToUpdate.save();

        const updatedUser = await User.findByPk(userToUpdate.id, {
            include: includeUserAssociations(),
        });

        res.status(200).json({ message: 'Photo de profil mise à jour avec succès.', user: updatedUser });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la photo de l\'utilisateur :', error);
        // Multer peut générer des erreurs (par ex. taille de fichier dépassée, type non supporté)
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: `Erreur d'upload : ${error.message}` });
        }
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de la photo.', error: error.message });
    }
};

// --- 6. Mettre à jour le statut de validation (status) d'un utilisateur ---
exports.updateUserStatus = async (req, res) => {
    try {
        const { identifier } = req.params;

        let user;
        let status;

        if (isNaN(identifier)) {
            user = await User.findOne({ where: { slug: identifier }, paranoid: false });
        } else {
            user = await User.findByPk(identifier, { paranoid: false });
        }

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        if (user.status == "Activé") {
            status = "Désactivé";
        } else {
            status = "Activé";
        }

        user.status = status;
        await user.save();

        const updatedUser = await User.findByPk(user.id, {
            include: includeUserAssociations(),
        });

        res.status(200).json({ message: `Statut de l'utilisateur mis à jour à "${status}" avec succès.`, user: updatedUser });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du statut de l\'utilisateur.', error: error.message });
    }
};

// --- 7. Supprimer logiquement un utilisateur (soft delete) ---
exports.deleteUser = async (req, res) => {
    try {
        const { identifier } = req.params; // Peut être un ID ou un SLUG
        let user;
        if (isNaN(identifier)) {
            user = await User.findOne({ where: { slug: identifier } });
        } else {
            user = await User.findByPk(identifier);
        }

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        await user.destroy(); // Cela définit 'deletedAt' grâce au paranoid: true dans le modèle

        res.status(200).json({ message: 'Utilisateur supprimé logiquement avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression logique de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression logique de l\'utilisateur.', error: error.message });
    }
};

// --- 8. Récupérer les utilisateurs supprimés logiquement ---
exports.getDeletedUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            paranoid: false,
            where: { deletedAt: { [Op.ne]: null } }, // Où deletedAt n'est pas null
            include: includeUserAssociations(),
            order: [['nom', 'ASC'], ['prenom', 'ASC']]
        });
        res.status(200).json({ message: 'Utilisateurs supprimés logiquement récupérés avec succès.', data: users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs supprimés :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateurs supprimés.', error: error.message });
    }
};

// --- 9. Restaurer un utilisateur supprimé logiquement ---
exports.restoreUser = async (req, res) => {
    try {
        const { identifier } = req.params; // Peut être un ID ou un SLUG
        let user;
        if (isNaN(identifier)) {
            user = await User.findOne({ where: { slug: identifier }, paranoid: false });
        } else {
            user = await User.findByPk(identifier, { paranoid: false }); // Cherche même si supprimé
        }

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        if (!user.deletedAt) {
            return res.status(400).json({ message: 'L\'utilisateur n\'est pas supprimé logiquement.' });
        }

        await user.restore(); // Restaure l'enregistrement (met deletedAt à null)

        const restoredUser = await User.findByPk(user.id, {
            include: includeUserAssociations(),
        });

        res.status(200).json({ message: 'Utilisateur restauré avec succès.', user: restoredUser });
    } catch (error) {
        console.error('Erreur lors de la restauration de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la restauration de l\'utilisateur.', error: error.message });
    }
};