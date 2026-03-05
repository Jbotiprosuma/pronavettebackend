// app/controllers/navette.controller.js
const db = require('../models');
const User = db.User;
const Service = db.Service;
const Employer = db.Employer;
const Navette = db.Navette;
const NavetteLigne = db.NavetteLigne;
const EmployerAb = db.EmployerAb;
const EmployerAccompte = db.EmployerAccompte;
const EmployerHeure = db.EmployerHeure;
const EmployerPrime = db.EmployerPrime;
const EmployerPrimeNuit = db.EmployerPrimeNuit;
const { Op, where } = require('sequelize');
const multer = require('multer'); // Assurez-vous que multer est configuré si vous l'utilisez pour les images.
const { sendNavetteValidatedEmail, sendCorrectionRequestEmail, sendToPayrollEmail, sendCampagneLaunchedEmail, sendCampagneReminderEmail } = require('../services/email.service');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const Notification = db.Notification;
const EmployerHistory = db.EmployerHistory;
const EmployerMutation = db.EmployerMutation;
const ActivityLog = db.ActivityLog;

/**
 * Vérifie si une ligne navette est liée à un employé en mutation entrante "En attente".
 * Si oui, retourne un message d'erreur. Sinon retourne null.
 */
const checkMutationInPending = async (navette_ligne_id) => {
    if (!navette_ligne_id) return null;
    const ligne = await NavetteLigne.findByPk(navette_ligne_id);
    if (!ligne || ligne.mutation_in !== 1) return null;
    const pendingMutation = await EmployerMutation.findOne({
        where: {
            employer_id: ligne.employer_id,
            service_new_id: ligne.service_id,
            status: 'En attente'
        }
    });
    if (pendingMutation) {
        return 'Cet employé est en cours de mutation (En attente de validation). Veuillez valider ou traiter cette mutation avant de pouvoir enregistrer des informations.';
    }
    return null;
};

// Fonction utilitaire pour inclure les associations
const includeNavetteAssociations = () => [ // Renommé pour plus de clarté
    { model: Service, as: 'service', attributes: ['id', 'name'] },
    {
        model: NavetteLigne, as: 'navetteLignes',
        include: [ // IMPORTANT: Ceci doit être un tableau d'objets pour chaque association
            { model: Employer, as: 'employer', attributes: ['id', 'matricule', 'nom', 'prenom', 'is_cadre', 'date_depart', 'type_depart'] },
            { model: EmployerAb, as: 'absences' },
            { model: EmployerAccompte, as: 'acomptes' },
            { model: EmployerHeure, as: 'heuresSup' },
            { model: EmployerPrime, as: 'primes' },
            { model: EmployerPrimeNuit, as: 'primesNuit' },
        ]
    },
];

exports.navetteAlls = async (req, res) => {
    try {
        const { service_id, is_importer, is_paie, is_admin, is_superadmin } = req.user;
        let navettes;
        let employeCount;

        if (!is_importer && !is_paie && !is_admin && !is_superadmin) {
            navettes = await Navette.findAll({
                where: {
                    service_id: service_id
                },
                attributes: ['status'],
            });
            employeCount = await Employer.count({
                where: {
                    service_id: service_id
                }
            });
        } else {
            navettes = await Navette.findAll({
                attributes: ['status'],
            });
            employeCount = await Employer.count();
        }


        // Compte le nombre de navettes pour les statuts 'new', 'encours' et 'terminer'
        const navetteCounts = navettes.reduce((acc, navette) => {
            if (navette.status === 'En attente') {
                acc["newCount"] = (acc["newCount"] || 0) + 1;
            }
            if (navette.status === 'En cours') {
                acc["encours"] = (acc["encours"] || 0) + 1;
            }
            if (navette.status === 'Terminé') {
                acc["terminer"] = (acc["terminer"] || 0) + 1;
            }
            return acc;
        }, { newCount: 0, encours: 0, terminer: 0 });

        // Récupère le nombre d'employés


        const stats = {
            navetteCounts,
            employeCount,
        };

        res.status(200).json({
            message: 'Statistiques du tableau de bord récupérées avec succès.',
            data: stats
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques du tableau de bord :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des statistiques.', error: error.message });
    }
};

exports.navettes = async (req, res) => {
    try {
        const now = new Date();
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);

        const navettes = await Navette.findAll({
            where: {
                periode_at: periode_at
            },
            include: includeNavetteAssociations(),
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            message: 'Navettes récupérées avec succès.',
            data: navettes
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des navette :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des navettes.', error: error.message });
    }
};

// Historique des navettes (toutes périodes, avec filtrage optionnel)
exports.navettesHistorique = async (req, res) => {
    try {
        const { mois, annee } = req.query;
        const whereClause = {};

        if (mois && annee) {
            const periode_at = new Date(parseInt(annee), parseInt(mois) - 1, 1);
            whereClause.periode_at = periode_at;
        } else if (annee) {
            const debutAnnee = new Date(parseInt(annee), 0, 1);
            const finAnnee = new Date(parseInt(annee), 11, 31, 23, 59, 59);
            whereClause.periode_at = { [Op.between]: [debutAnnee, finAnnee] };
        }

        const navettes = await Navette.findAll({
            where: whereClause,
            include: [
                { model: Service, as: 'service', attributes: ['id', 'name'] },
            ],
            order: [['periode_at', 'DESC'], ['created_at', 'DESC']],
            attributes: ['id', 'name', 'service_id', 'periode_at', 'periode_debut_at', 'periode_fin_at', 'status', 'etat', 'date_creation', 'created_at']
        });

        // Grouper par période
        const grouped = {};
        navettes.forEach(n => {
            const key = n.periode_at ? new Date(n.periode_at).toISOString().slice(0, 7) : 'inconnu';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(n);
        });

        res.status(200).json({
            message: 'Historique des navettes récupéré avec succès.',
            data: navettes,
            grouped: grouped
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des navettes :', error);
        res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
};

exports.getNavetteById = async (req, res) => {
    try {
        const { id } = req.params;

        let navette;

        navette = await Navette.findOne({
            where: { id: id },
            include: includeNavetteAssociations(),
            paranoid: true,
        });

        if (!navette) {
            return res.status(404).json({ message: 'Navette non trouvée.' });
        }

        res.status(200).json({ message: 'Navette récupérée avec succès.', data: navette });
    } catch (error) {
        console.error('Erreur lors de la récupération de la navette par ID :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de la navette.', error: error.message });
    }
};

exports.createNavette = async (req, res) => {
    try {
        const { periode_debut_at, periode_fin_at} = req.body;
        const user_id  = req.user.id;
        if (!periode_debut_at || !periode_fin_at) {
            return res.status(400).json({ message: "Les dates de début et de fin sont obligatoires." });
        }

        const now = new Date();
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);

        // Récupérer tous les services
        const services = await Service.findAll({
            attributes: ['id', 'name']
        });

        const navettesCreated = [];

        for (const service of services) {
            // Vérifier si la navette existe déjà pour ce service et cette période
            let navette = await Navette.findOne({
                where: {
                    service_id: service.id,
                    periode_at: periode_at
                },
                include: includeNavetteAssociations(),
                paranoid: true
            });

            if (!navette) {
                // Créer la navette
                navette = await Navette.create({
                    name: `Etat Navette ${service.name} ${now.getMonth() + 1} ${now.getFullYear()}`,
                    service_id: service.id,
                    periode_at: periode_at,
                    periode_debut_at: periode_debut_at,
                    periode_fin_at: periode_fin_at,
                    date_creation: new Date(),
                    created_by: user_id,
                    created_at: new Date(),
                    updated_at: new Date()
                });

                // Récupérer tous les employés actifs de ce service
                const employers = await Employer.findAll({
                    where: {
                        service_id: service.id,
                        date_depart: null
                    },
                    attributes: ['id', 'is_cadre']
                });

                // Créer les lignes navettes
                const navetteLigneData = employers.map(employer =>
                ({
                    employer_id: employer.id,
                    navette_id: navette.id,
                    service_id: service.id,
                    status: employer.is_cadre ? "Cadre" : "Non cadre",
                    created_by: user_id,
                    periode_at: periode_at,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                );

                if (navetteLigneData.length > 0) {
                    await NavetteLigne.bulkCreate(navetteLigneData);
                }

                // Recharger la navette avec associations
                navette = await Navette.findOne({
                    where: { id: navette.id },
                    include: includeNavetteAssociations(),
                    paranoid: true
                });
            }

            navettesCreated.push(navette);
        }

        // Notification : campagne navette lancée — à TOUS les utilisateurs de tous les services
        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const periodeLabel = `${moisNoms[now.getMonth()]} ${now.getFullYear()}`;
        const dateDebutFormatted = new Date(periode_debut_at).toLocaleDateString('fr-FR');
        const dateFinFormatted = new Date(periode_fin_at).toLocaleDateString('fr-FR');

        try {
            // Notifier tous les utilisateurs ayant un rôle lié aux navettes
            const allUsers = await User.findAll({
                where: {
                    [Op.or]: [
                        { is_manager: true },
                        { is_representant: true },
                        { is_paie: true },
                        { is_admin: true },
                        { is_superadmin: true },
                    ]
                },
                attributes: ['id', 'email'],
            });

            const allUserIds = allUsers.map(u => u.id);
            const allEmails = allUsers.filter(u => u.email).map(u => u.email);

            // Notification en base
            await Notification.notifyUsers(allUserIds, {
                title: 'Nouvelle campagne navette lancée',
                message: `La campagne navette pour ${periodeLabel} a été lancée. Période du ${dateDebutFormatted} au ${dateFinFormatted}.`,
                type: 'navette_lancee',
                link: '/navette/service',
            });

            // Email à tous les utilisateurs
            await sendCampagneLaunchedEmail(allEmails, {
                periodeLabel,
                dateDebut: dateDebutFormatted,
                dateFin: dateFinFormatted,
                action: 'lancée',
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_lancee:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_navettes',
            target_id: null,
            target_label: `Campagne ${now.getMonth() + 1}/${now.getFullYear()}`,
            description: `Création de ${navettesCreated.length} navette(s) pour tous les services.`,
            new_values: { periode_debut_at, periode_fin_at, count: navettesCreated.length },
        });

        res.status(200).json({
            message: "Navettes créées/récupérées avec succès pour tous les services.",
            data: navettesCreated
        });

    } catch (error) {
        console.error('Erreur lors de la création des navettes :', error);
        res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
};

exports.getNavetteByServiceUser = async (req, res) => {
    try {
        const { service_id, is_paie, is_admin, is_superadmin } = req.user;

        const now = new Date();
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);
        // Récupérer la navette existante pour le service et le mois courant
        const navette = await Navette.findOne({
            where: {
                service_id: service_id,
                periode_at: periode_at,
            },
            include: includeNavetteAssociations(),
            paranoid: true,
        });

        if (!navette) {
            return res.status(200).json({ message: 'Aucune navette trouvée.', data: null });
        }

        // --- Vérification de l'accès par dates ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dateDebut = navette.periode_debut_at ? new Date(navette.periode_debut_at) : null;
        const dateFin = navette.periode_fin_at ? new Date(navette.periode_fin_at) : null;

        if (dateDebut) dateDebut.setHours(0, 0, 0, 0);
        if (dateFin) dateFin.setHours(23, 59, 59, 999);

        const campagneActive = dateDebut && dateFin && today >= dateDebut && today <= dateFin;

        // Si la campagne n'est pas active (pas encore commencée ou dépassée)
        if (!campagneActive) {
            // Paie, admin, superadmin → lecture seule
            if (is_paie || is_admin || is_superadmin) {
                return res.status(200).json({
                    message: 'Navette récupérée en lecture seule (campagne non active).',
                    data: navette,
                    readOnly: true,
                    campagneStatus: today < dateDebut ? 'not_started' : 'expired',
                    campagneDates: {
                        debut: navette.periode_debut_at,
                        fin: navette.periode_fin_at,
                    },
                });
            }
            // Autres rôles → pas d'accès
            return res.status(200).json({
                message: 'La campagne n\'est pas active.',
                data: null,
                readOnly: true,
                campagneStatus: today < dateDebut ? 'not_started' : 'expired',
                campagneDates: {
                    debut: navette.periode_debut_at,
                    fin: navette.periode_fin_at,
                },
            });
        }

        res.status(200).json({
            message: 'Navette récupérée avec succès.',
            data: navette,
            readOnly: false,
            campagneStatus: 'active',
            campagneDates: {
                debut: navette.periode_debut_at,
                fin: navette.periode_fin_at,
            },
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la navette par le service:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
};

exports.createEmployerAb = async (req, res) => {
    try {
        const { employer_id, navette_id, navette_ligne_id, nb_jours, type_abs, motif } = req.body;

        // Blocage mutation entrante en attente
        const mutBlock = await checkMutationInPending(navette_ligne_id);
        if (mutBlock) return res.status(403).json({ message: mutBlock });

        if (!motif || motif.trim() === '') {
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error('Erreur lors de la suppression du fichier :', err);
                    });
                });
            }
            return res.status(400).json({ message: 'Le motif est obligatoire.' });
        }

        if (!type_abs || type_abs.trim() === '') {
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error('Erreur lors de la suppression du fichier :', err);
                    });
                });
            }
            return res.status(400).json({ message: 'Le type est obligatoire.' });
        }
        // Les chemins des fichiers uploadés par Multer se trouvent dans req.files
        const imagePaths = req.files ? req.files.map(file => `http://10.0.80.41:4000/absences/${file.filename}`) : [];

        const newAbsence = await db.EmployerAb.create({
            employer_id,
            navette_id,
            navette_ligne_id,
            nb_jours: parseInt(nb_jours, 10),
            type_abs,
            motif,
            images: imagePaths.length > 0 ? imagePaths : null,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id, type: 'absence', sous_type: type_abs,
                description: `Absence ${type_abs} - ${nb_jours} jour(s) - ${motif || ''}`,
                details: { type_abs, nb_jours: parseInt(nb_jours, 10), motif },
                quantite: parseInt(nb_jours, 10),
                navette_id, navette_ligne_id,
                reference_id: newAbsence.id, reference_table: 'employer_abs',
                created_by: req.user?.id,
            });
        } catch (e) { console.error('History log absence:', e.message); }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_absence',
            target_id: newAbsence.id,
            target_label: `Absence ${type_abs} - Employé #${employer_id}`,
            description: `Absence ${type_abs} créée: ${nb_jours} jour(s) - ${motif || 'N/A'}.`,
            new_values: { employer_id, navette_id, nb_jours, type_abs, motif },
        });

        res.status(201).json({ message: 'Absence créée avec succès.', data: newAbsence });
    } catch (error) {
        console.error('Erreur lors de la création de l\'absence :', error);
        // Supprimer les fichiers uploadés en cas d'erreur
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Erreur lors de la suppression du fichier :', err);
                });
            });
        }
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de l\'absence.', error: error.message });
    }
};

exports.updateEmployerAb = async (req, res) => {
    try {
        const { id } = req.params;
        const { nb_jours, type_abs, motif, existing_images_json, images_to_delete } = req.body;

        const absence = await db.EmployerAb.findByPk(id);

        if (!absence) {
            return res.status(404).json({ message: 'Absence non trouvée.' });
        }

        let imagesToKeepFromFrontend = [];
        if (existing_images_json) {
            try {
                imagesToKeepFromFrontend = JSON.parse(existing_images_json);
                imagesToKeepFromFrontend = imagesToKeepFromFrontend.map(imagePath => {
                    if (imagePath.startsWith('http')) {
                        return imagePath;

                    }
                });
            } catch (parseError) {
                console.error("Erreur de parsing de existing_images_json:", parseError);
                return res.status(400).json({ message: 'Données des images existantes mal formatées.' });
            }
        }

        if (images_to_delete) {
            const parsedImagesToDelete = JSON.parse(images_to_delete);
            parsedImagesToDelete.forEach(imagePath => {
                let relativePathToDelete = imagePath;
                if (imagePath.startsWith('http')) {
                    try {
                        const url = new URL(imagePath);
                        relativePathToDelete = url.pathname;
                    } catch (urlError) {
                        console.warn(`URL d'image à supprimer mal formée: ${imagePath}. Ne tente pas de suppression physique.`, urlError);
                        return;
                    }
                }
                const fullPath = path.join(__dirname, '../..', 'public', relativePathToDelete);
                fs.unlink(fullPath, (err) => {
                    if (err) {
                        if (err.code !== 'ENOENT') {
                            console.error(`Erreur lors de la suppression de l'image ${fullPath}:`, err);
                        } else {
                            console.warn(`Tentative de suppression d'un fichier inexistant (peut-être déjà supprimé) : ${fullPath}`);
                        }
                    }
                });
            });
        }

        const newImagePaths = req.files ? req.files.map(file => `http://10.0.80.41:4000/absences/${file.filename}`) : null;

        const updatedImages = [...imagesToKeepFromFrontend, ...newImagePaths];

        const oldAbValues = { nb_jours: absence.nb_jours, type_abs: absence.type_abs, motif: absence.motif };

        await absence.update({
            nb_jours: parseInt(nb_jours, 10),
            type_abs,
            motif,
            images: updatedImages.length > 0 ? updatedImages : null,
            updated_at: new Date(),
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_absence',
            target_id: absence.id,
            target_label: `Absence #${absence.id} - Employé #${absence.employer_id}`,
            description: `Absence mise à jour.`,
            old_values: oldAbValues,
            new_values: { nb_jours, type_abs, motif },
        });

        res.status(200).json({ message: 'Absence mise à jour avec succès.', data: absence });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'absence :', error);
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Erreur lors de la suppression du fichier temporaire :', err);
                });
            });
        }
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'absence.', error: error.message });
    }
};

exports.deleteEmployerAb = async (req, res) => {
    try {
        const { id } = req.params;

        const absence = await db.EmployerAb.findByPk(id);

        if (!absence) {
            return res.status(404).json({ message: 'Absence non trouvée.' });
        }

        // --- CORRECTION CLÉ ICI ---
        let imagesToDelete = [];
        if (absence.images) {
            try {
                // Tenter de parser la chaîne JSON en tableau
                imagesToDelete = JSON.parse(absence.images);
            } catch (parseError) {
                // Si le parsing échoue (ce n'est pas une chaîne JSON valide),
                // cela pourrait être une seule chaîne de chemin (cas rare) ou vide.
                // Gérer les cas où c'est une seule chaîne non-JSON ou null.
                if (typeof absence.images === 'string' && absence.images.startsWith('/')) {
                    // C'est potentiellement un chemin d'accès simple non parsé.
                    imagesToDelete = [absence.images];
                } else {
                    console.warn("absence.images n'est pas une chaîne JSON valide ou un chemin d'accès simple:", absence.images);
                    imagesToDelete = []; // Ou gérer comme une erreur, selon la politique
                }
            }
        }
        // --- FIN DE LA CORRECTION CLÉ ---

        // Supprimer les images physiques associées
        if (imagesToDelete.length > 0) { // Utilisez imagesToDelete ici
            imagesToDelete.forEach(imagePath => {
                // --- AJUSTEMENT POUR LES URLS COMPLÈTES ---
                // Extraire le chemin relatif de l'URL complète
                const url = new URL(imagePath); // Crée un objet URL pour parser le chemin
                const relativePath = url.pathname; // Obtient le chemin comme '/absences/images-X.jpeg'

                // Reconstruire le chemin complet sur le système de fichiers
                // Notez '../..' pour remonter de app/controllers à la racine du backend, puis public.
                const fullPath = path.join(__dirname, '../..', 'public', relativePath);

                fs.unlink(fullPath, (err) => {
                    if (err) {
                        // Log uniquement si l'erreur n'est pas ENOENT (fichier non trouvé),
                        // car ENOENT est attendu si le fichier a déjà été supprimé ou n'a jamais existé.
                        if (err.code !== 'ENOENT') {
                            console.error(`Erreur lors de la suppression de l'image ${fullPath} lors de la suppression de l'absence:`, err);
                        } else {
                            console.warn(`Tentative de suppression d'un fichier inexistant (peut-être déjà supprimé) : ${fullPath}`);
                        }
                    } else {
                        console.log(`Fichier supprimé : ${fullPath}`);
                    }
                });
            });
        }

        await absence.destroy();

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_absence',
            target_id: absence.id,
            target_label: `Absence #${absence.id} - Employé #${absence.employer_id}`,
            description: `Absence supprimée: ${absence.type_abs} - ${absence.nb_jours} jour(s).`,
            old_values: { employer_id: absence.employer_id, type_abs: absence.type_abs, nb_jours: absence.nb_jours, motif: absence.motif },
        });

        res.status(200).json({ message: 'Absence supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'absence :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de l\'absence.', error: error.message });
    }
};

exports.createEmployerAccompte = async (req, res) => {
    try {
        const { employer_id, navette_id, navette_ligne_id, somme, motif, code_accompte } = req.body;

        // Blocage mutation entrante en attente
        const mutBlock = await checkMutationInPending(navette_ligne_id);
        if (mutBlock) return res.status(403).json({ message: mutBlock });

        const newAccompte = await db.EmployerAccompte.create({
            employer_id,
            navette_id,
            navette_ligne_id,
            somme,
            motif,
            code_accompte: code_accompte || 'CL30',
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id, type: 'acompte',
                description: `Acompte de ${somme} FCFA${motif ? ' - ' + motif : ''}`,
                details: { somme, motif },
                montant: somme,
                navette_id, navette_ligne_id,
                reference_id: newAccompte.id, reference_table: 'employer_accomptes',
                created_by: req.user?.id,
            });
        } catch (e) { console.error('History log acompte:', e.message); }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_acompte',
            target_id: newAccompte.id,
            target_label: `Acompte ${somme} FCFA - Employé #${employer_id}`,
            description: `Acompte de ${somme} FCFA créé${motif ? ' - ' + motif : ''}.`,
            new_values: { employer_id, navette_id, somme, motif },
        });

        res.status(201).json({ message: 'Acompte créé avec succès.', data: newAccompte });
    } catch (error) {
        console.error('Erreur lors de la création de l\'acompte :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de l\'acompte.', error: error.message });
    }
};

exports.updateEmployerAccompte = async (req, res) => {
    try {
        const { id } = req.params;
        const { somme, motif, code_accompte } = req.body;

        const accompte = await db.EmployerAccompte.findByPk(id);

        if (!accompte) {
            return res.status(404).json({ message: 'Acompte non trouvé.' });
        }

        const oldAccValues = { somme: accompte.somme, motif: accompte.motif };

        await accompte.update({
            somme,
            motif,
            code_accompte: code_accompte || accompte.code_accompte,
            updated_at: new Date(),
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_acompte',
            target_id: accompte.id,
            target_label: `Acompte #${accompte.id} - Employé #${accompte.employer_id}`,
            description: `Acompte mis à jour.`,
            old_values: oldAccValues,
            new_values: { somme, motif },
        });

        res.status(200).json({ message: 'Acompte mis à jour avec succès.', data: accompte });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'acompte :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'acompte.', error: error.message });
    }
};

exports.deleteEmployerAccompte = async (req, res) => {
    try {
        const { id } = req.params;

        const accompte = await db.EmployerAccompte.findByPk(id);

        if (!accompte) {
            return res.status(404).json({ message: 'Acompte non trouvé.' });
        }

        await accompte.destroy();

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_acompte',
            target_id: accompte.id,
            target_label: `Acompte #${accompte.id} - Employé #${accompte.employer_id}`,
            description: `Acompte supprimé: ${accompte.somme} FCFA.`,
            old_values: { employer_id: accompte.employer_id, somme: accompte.somme, motif: accompte.motif },
        });

        res.status(200).json({ message: 'Acompte supprimé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'acompte :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de l\'acompte.', error: error.message });
    }
};

exports.createEmployerHeure = async (req, res) => {
    try {
        const { employer_id, navette_id, navette_ligne_id, heures, pourcentage } = req.body;

        // Blocage mutation entrante en attente
        const mutBlock = await checkMutationInPending(navette_ligne_id);
        if (mutBlock) return res.status(403).json({ message: mutBlock });

        const newHeure = await db.EmployerHeure.create({
            employer_id,
            navette_id,
            navette_ligne_id,
            heures,
            pourcentage,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id, type: 'heure_sup', sous_type: `${pourcentage}%`,
                description: `${heures}h supplémentaires à ${pourcentage}%`,
                details: { heures, pourcentage },
                quantite: heures,
                navette_id, navette_ligne_id,
                reference_id: newHeure.id, reference_table: 'employer_heures',
                created_by: req.user?.id,
            });
        } catch (e) { console.error('History log heure:', e.message); }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_heure_sup',
            target_id: newHeure.id,
            target_label: `${heures}h à ${pourcentage}% - Employé #${employer_id}`,
            description: `${heures}h supplémentaires à ${pourcentage}% créées.`,
            new_values: { employer_id, navette_id, heures, pourcentage },
        });

        res.status(201).json({ message: 'Heure supplémentaire créée avec succès.', data: newHeure });
    } catch (error) {
        console.error('Erreur lors de la création de l\'heure supplémentaire :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de l\'heure supplémentaire.', error: error.message });
    }
};

exports.updateEmployerHeure = async (req, res) => {
    try {
        const { id } = req.params;
        const { heures, pourcentage } = req.body;

        const heure = await db.EmployerHeure.findByPk(id);

        if (!heure) {
            return res.status(404).json({ message: 'Heure supplémentaire non trouvée.' });
        }

        const oldHeureValues = { heures: heure.heures, pourcentage: heure.pourcentage };

        await heure.update({
            heures,
            pourcentage,
            updated_at: new Date(),
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_heure_sup',
            target_id: heure.id,
            target_label: `Heure sup #${heure.id} - Employé #${heure.employer_id}`,
            description: `Heure supplémentaire mise à jour.`,
            old_values: oldHeureValues,
            new_values: { heures, pourcentage },
        });

        res.status(200).json({ message: 'Heure supplémentaire mise à jour avec succès.', data: heure });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'heure supplémentaire :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'heure supplémentaire.', error: error.message });
    }
};

exports.deleteEmployerHeure = async (req, res) => {
    try {
        const { id } = req.params;

        const heure = await db.EmployerHeure.findByPk(id);

        if (!heure) {
            return res.status(404).json({ message: 'Heure supplémentaire non trouvée.' });
        }

        await heure.destroy();

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_heure_sup',
            target_id: heure.id,
            target_label: `Heure sup #${heure.id} - Employé #${heure.employer_id}`,
            description: `Heure supplémentaire supprimée: ${heure.heures}h à ${heure.pourcentage}%.`,
            old_values: { employer_id: heure.employer_id, heures: heure.heures, pourcentage: heure.pourcentage },
        });

        res.status(200).json({ message: 'Heure supplémentaire supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'heure supplémentaire :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de l\'heure supplémentaire.', error: error.message });
    }
};

exports.createEmployerPrime = async (req, res) => {
    try {
        const { employer_id, navette_id, navette_ligne_id, montant, type_prime } = req.body;

        // Blocage mutation entrante en attente
        const mutBlock = await checkMutationInPending(navette_ligne_id);
        if (mutBlock) return res.status(403).json({ message: mutBlock });

        const newPrime = await db.EmployerPrime.create({
            employer_id,
            navette_id,
            navette_ligne_id,
            montant,
            type_prime,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id, type: 'prime', sous_type: type_prime,
                description: `Prime ${type_prime} - ${montant} FCFA`,
                details: { type_prime, montant },
                montant,
                navette_id, navette_ligne_id,
                reference_id: newPrime.id, reference_table: 'employer_primes',
                created_by: req.user?.id,
            });
        } catch (e) { console.error('History log prime:', e.message); }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_prime',
            target_id: newPrime.id,
            target_label: `Prime ${type_prime} ${montant} FCFA - Employé #${employer_id}`,
            description: `Prime ${type_prime} de ${montant} FCFA créée.`,
            new_values: { employer_id, navette_id, montant, type_prime },
        });

        res.status(201).json({ message: 'Prime créée avec succès.', data: newPrime });
    } catch (error) {
        console.error('Erreur lors de la création de la prime :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de la prime.', error: error.message });
    }
};

exports.updateEmployerPrime = async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, type_prime } = req.body;

        const prime = await db.EmployerPrime.findByPk(id);

        if (!prime) {
            return res.status(404).json({ message: 'Prime non trouvée.' });
        }

        const oldPrimeValues = { montant: prime.montant, type_prime: prime.type_prime };

        await prime.update({
            montant,
            type_prime,
            updated_at: new Date(),
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_prime',
            target_id: prime.id,
            target_label: `Prime #${prime.id} - Employé #${prime.employer_id}`,
            description: `Prime mise à jour.`,
            old_values: oldPrimeValues,
            new_values: { montant, type_prime },
        });

        res.status(200).json({ message: 'Prime mise à jour avec succès.', data: prime });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la prime :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de la prime.', error: error.message });
    }
};

exports.deleteEmployerPrime = async (req, res) => {
    try {
        const { id } = req.params;

        const prime = await db.EmployerPrime.findByPk(id);

        if (!prime) {
            return res.status(404).json({ message: 'Prime non trouvée.' });
        }

        await prime.destroy();

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_prime',
            target_id: prime.id,
            target_label: `Prime #${prime.id} - Employé #${prime.employer_id}`,
            description: `Prime supprimée: ${prime.type_prime} - ${prime.montant} FCFA.`,
            old_values: { employer_id: prime.employer_id, montant: prime.montant, type_prime: prime.type_prime },
        });

        res.status(200).json({ message: 'Prime supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la prime :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la prime.', error: error.message });
    }
};

exports.createEmployerPrimeNuit = async (req, res) => {
    try {
        const { employer_id, navette_id, navette_ligne_id, code_prime_nuit, nb_jour } = req.body;

        // Blocage mutation entrante en attente
        const mutBlock = await checkMutationInPending(navette_ligne_id);
        if (mutBlock) return res.status(403).json({ message: mutBlock });

        const newPrimeNuit = await db.EmployerPrimeNuit.create({
            employer_id,
            navette_id,
            navette_ligne_id,
            code_prime_nuit: code_prime_nuit || 'CL12',
            nb_jour: nb_jour || 0,
            created_at: new Date(),
            updated_at: new Date(),
        });

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id, type: 'prime_nuit', sous_type: newPrimeNuit.code_prime_nuit,
                description: `Prime nuit (${newPrimeNuit.code_prime_nuit || 'N/A'}) - ${newPrimeNuit.nb_jour || 0} jour(s)`,
                details: { code_prime_nuit: newPrimeNuit.code_prime_nuit, nb_jour: newPrimeNuit.nb_jour },
                quantite: newPrimeNuit.nb_jour,
                navette_id, navette_ligne_id,
                reference_id: newPrimeNuit.id, reference_table: 'employer_prime_nuits',
                created_by: req.user?.id,
            });
        } catch (e) { console.error('History log prime nuit:', e.message); }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'create_prime_nuit',
            target_id: newPrimeNuit.id,
            target_label: `Prime nuit ${newPrimeNuit.nb_jour} jour(s) - Employé #${employer_id}`,
            description: `Prime de nuit créée: ${newPrimeNuit.nb_jour || 0} jour(s).`,
            new_values: { employer_id, navette_id, nb_jour },
        });

        res.status(201).json({ message: 'Prime de nuit créée avec succès.', data: newPrimeNuit });
    } catch (error) {
        console.error('Erreur lors de la création de la prime de nuit :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de la prime de nuit.', error: error.message });
    }
};

exports.updateEmployerPrimeNuit = async (req, res) => {
    try {
        const { id } = req.params;
        const { code_prime_nuit, nb_jour } = req.body;

        const primeNuit = await db.EmployerPrimeNuit.findByPk(id);

        if (!primeNuit) {
            return res.status(404).json({ message: 'Prime de nuit non trouvée.' });
        }

        const oldPrimeNuitValues = { code_prime_nuit: primeNuit.code_prime_nuit, nb_jour: primeNuit.nb_jour };

        await primeNuit.update({
            code_prime_nuit: code_prime_nuit || primeNuit.code_prime_nuit,
            nb_jour: nb_jour || 0,
            updated_at: new Date(),
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_prime_nuit',
            target_id: primeNuit.id,
            target_label: `Prime nuit #${primeNuit.id} - Employé #${primeNuit.employer_id}`,
            description: `Prime de nuit mise à jour.`,
            old_values: oldPrimeNuitValues,
            new_values: { code_prime_nuit, nb_jour },
        });

        res.status(200).json({ message: 'Prime de nuit mise à jour avec succès.', data: primeNuit });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la prime de nuit :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de la prime de nuit.', error: error.message });
    }
};

exports.deleteEmployerPrimeNuit = async (req, res) => {
    try {
        const { id } = req.params;

        const primeNuit = await db.EmployerPrimeNuit.findByPk(id);

        if (!primeNuit) {
            return res.status(404).json({ message: 'Prime de nuit non trouvée.' });
        }

        await primeNuit.destroy();

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_prime_nuit',
            target_id: primeNuit.id,
            target_label: `Prime nuit #${primeNuit.id} - Employé #${primeNuit.employer_id}`,
            description: `Prime de nuit supprimée: ${primeNuit.nb_jour || 0} jour(s).`,
            old_values: { employer_id: primeNuit.employer_id, nb_jour: primeNuit.nb_jour },
        });

        res.status(200).json({ message: 'Prime de nuit supprimée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la prime de nuit :', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la prime de nuit.', error: error.message });
    }
};

exports.validateUpdates = async (req, res) => {
    const navetteId = req.params.id;

    try {
        const navette = await Navette.findByPk(navetteId);

        if (!navette) {
            return res.status(404).send({
                message: `Impossible de trouver la navette avec l'id=${navetteId}.`
            });
        }

        if (navette.etat !== "En attente de l'envoi des informations des employés au manager") {
            return res.status(400).send({
                message: `La navette n'est pas dans l'état correct pour la validation (état actuel: ${navette.etat}).`
            });
        }

        await navette.update({
            etat: "En attente de la confirmation des informations des employés par le manager",
            last_update_by : req.user.id,
            date_envoie_manager: new Date()
        });

        const managers = await User.findAll({
            where: {
                service_id: navette.service_id,
                is_manager: true
            }
        });

        if (managers.length > 0) {
            for (const manager of managers) {

                let setGenre = manager.genre === "Homme" ? "monsieur" : "madame";
                const now = new Date();
                const hour = now.getHours();
                let greeting;

                if (hour >= 5 && hour < 18) {
                    greeting = "Bonjour";
                } else {
                    greeting = "Bonsoir";
                }

                const name = `${greeting} ${setGenre} ${manager.prenom} ${manager.nom}`;
                try {
                    await sendNavetteValidatedEmail(manager.mail, name, navette.code);
                } catch (error) {

                }
            }
        }

        // Notification : navette validée (envoyée au manager)
        try {
            await Notification.notifyByService(navette.service_id, ['manager'], {
                title: 'Navette validée par le représentant',
                message: `La navette ${navette.code} a été envoyée pour confirmation.`,
                type: 'navette_validee',
                link: `/navettes/${navette.id}`,
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_validee:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'validate',
            target_id: navette.id,
            target_label: `Navette ${navette.code}`,
            description: `Navette ${navette.code} validée et envoyée au manager pour confirmation.`,
            new_values: { etat: navette.etat },
        });

        res.send({
            message: "Mises à jour de la navette validées avec succès par le manager !",
            navette: navette
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la validation des mises à jour de la navette avec l'id=${navetteId}.` + error.message
        });
    }
};

exports.correction = async (req, res) => {
    const navetteId = req.params.id;

    try {
        const navette = await Navette.findByPk(navetteId);

        if (!navette) {
            return res.status(404).send({
                message: `Impossible de trouver la navette avec l'id=${navetteId}.`
            });
        }

        if (navette.etat !== "En attente de la confirmation des informations des employés par le manager") {
            return res.status(400).send({
                message: `La navette n'est pas dans l'état correct pour la validation (état actuel: ${navette.etat}).`
            });
        }

        await navette.update({
            etat: "En attente de l'envoi des informations des employés au manager",
            last_update_by : req.user.id,
            date_envoie_manager: null
        });

        const representants = await User.findAll({
            where: {
                service_id: navette.service_id,
                is_representant: true
            }
        });

        if (representants.length > 0) {
            for (const representant of representants) {

                let setGenre = representant.genre === "Homme" ? "monsieur" : "madame";
                const now = new Date();
                const hour = now.getHours();
                let greeting;

                if (hour >= 5 && hour < 18) {
                    greeting = "Bonjour";
                } else {
                    greeting = "Bonsoir";
                }

                const name = `${greeting} ${setGenre} ${representant.prenom} ${representant.nom}`;
                try {
                    await sendCorrectionRequestEmail(representant.mail, name, navette.code);
                } catch (error) {

                }
            }
        }

        // Notification : correction demandée
        try {
            await Notification.notifyByService(navette.service_id, ['representant'], {
                title: 'Correction demandée par le manager',
                message: `Le manager a demandé une correction sur la navette ${navette.code}.`,
                type: 'navette_correction',
                link: `/navettes/${navette.id}`,
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_correction:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'correction',
            target_id: navette.id,
            target_label: `Navette ${navette.code}`,
            description: `Correction demandée sur la navette ${navette.code}. Renvoyée au représentant.`,
            new_values: { etat: navette.etat },
        });

        res.send({
            message: "Permission accordée avec succès par le manager !",
            navette: navette
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la validation des mises à jour de la navette avec l'id=${navetteId}.` + error.message
        });
    }
};

exports.signaler = async (req, res) => {
    const navetteId = req.params.id;

    try {
        const navette = await Navette.findByPk(navetteId);

        if (!navette) {
            return res.status(404).send({
                message: `Impossible de trouver la navette avec l'id=${navetteId}.`
            });
        }

        // Logique de validation :
        // On ne peut valider que si l'état est 'En attente de l'enregistrement des informations des employés'
        if (navette.etat !== "En attente du traitement de l'etat navette par la paie") {
            return res.status(400).send({
                message: `La navette n'est pas dans l'état correct pour la validation (état actuel: ${navette.etat}).`
            });
        }

        // Mettre à jour l'état et la date de confirmation manager
        await navette.update({
            etat: "En attente de la confirmation des informations des employés par le manager",
            last_update_by : req.user.id,
            date_envoie_paie: null

        });

        const managers = await User.findAll({
            where: {
                service_id: navette.service_id,
                is_manager: true
            }
        });

        // 3. Envoyer l'e-mail à chaque membre de l'équipe de paie
        if (managers.length > 0) {
            for (const manager of managers) {

                let setGenre = manager.genre === "Homme" ? "monsieur" : "madame";
                const now = new Date();
                const hour = now.getHours();
                let greeting;

                if (hour >= 5 && hour < 18) {
                    greeting = "Bonjour";
                } else {
                    greeting = "Bonsoir";
                }

                const name = `${greeting} ${setGenre} ${manager.prenom} ${manager.nom}`;
                try {
                    await sendCorrectionRequestEmail(manager.mail, name, navette.code);
                } catch (error) {

                }
            }
        }

        // Notification : signalement paie
        try {
            await Notification.notifyByService(navette.service_id, ['manager'], {
                title: 'Signalement de la paie',
                message: `La paie a signalé un problème sur la navette ${navette.code}.`,
                type: 'navette_signalement',
                link: `/navettes/${navette.id}`,
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_signalement:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'signaler',
            target_id: navette.id,
            target_label: `Navette ${navette.code}`,
            description: `Signalement de la paie sur la navette ${navette.code}. Renvoyée au manager.`,
            new_values: { etat: navette.etat },
        });

        res.send({
            message: "Permission accordée avec succès par le manager !",
            navette: navette
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la validation des mises à jour de la navette avec l'id=${navetteId}.` + error.message
        });
    }
};

exports.sendToPayroll = async (req, res) => {
    const navetteId = req.params.id; // L'ID de la navette à envoyer à la paie

    try {
        const navette = await Navette.findByPk(navetteId);

        if (!navette) {
            return res.status(404).send({
                message: `Impossible de trouver la navette avec l'id=${navetteId}.`
            });
        }

        // Logique d'envoi à la paie :
        // On ne peut envoyer à la paie que si l'état est 'En attente de la confirmation des informations des employés par le manager'
        if (navette.etat !== "En attente de la confirmation des informations des employés par le manager") {
            return res.status(400).send({
                message: `La navette n'est pas dans l'état correct pour l'envoi à la paie (état actuel: ${navette.etat}).`
            });
        }
        // Mettre à jour l'état et la date d'envoi à la paie
        await navette.update({
            etat: "En attente du traitement de l'etat navette par la paie",
            date_envoie_paie: new Date()
        });

        const paies = await User.findAll({
            where: {
                service_id: navette.service_id,
                is_paie: true
            }
        });

        // 3. Envoyer l'e-mail à chaque membre de l'équipe de paie
        if (paies.length > 0) {
            for (const paie of paies) {

                let setGenre = paie.genre === "Homme" ? "monsieur" : "madame";
                const now = new Date();
                const hour = now.getHours();
                let greeting;

                if (hour >= 5 && hour < 18) {
                    greeting = "Bonjour";
                } else {
                    greeting = "Bonsoir";
                }

                const name = `${greeting} ${setGenre} ${paie.prenom} ${paie.nom}`;
                try {
                    await sendToPayrollEmail(paie.mail, name, navette.code);
                } catch (error) {

                }
            }
        }

        // Notification : envoi à la paie
        try {
            await Notification.notifyByRole(['paie', 'superadmin'], {
                title: 'Navette envoyée à la paie',
                message: `La navette ${navette.code} a été envoyée pour traitement paie.`,
                type: 'navette_envoi_paie',
                link: `/navettes/${navette.id}`,
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_envoi_paie:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'send_to_payroll',
            target_id: navette.id,
            target_label: `Navette ${navette.code}`,
            description: `Navette ${navette.code} envoyée à la paie pour traitement.`,
            new_values: { etat: navette.etat },
        });

        res.send({
            message: "Navette envoyée à la paie avec succès !",
            navette: navette
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de l'envoi de la navette à la paie avec l'id=${navetteId}.` + error.message
        });
    }
};

exports.closeNavette = async (req, res) => {
    const navetteId = req.params.id; // L'ID de la navette à clôturer

    try {
        const navette = await Navette.findByPk(navetteId);

        if (!navette) {
            return res.status(404).send({
                message: `Impossible de trouver la navette avec l'id=${navetteId}.`
            });
        }

        if (navette.etat !== "En attente du traitement de l'etat navette par la paie") {
            return res.status(400).send({
                message: `La navette n'est pas dans l'état correct pour la clôture (état actuel: ${navette.etat}).`
            });
        }

        await navette.update({
            etat: "Etat navette cloturé",
            status: "Terminé",
            date_cloture: new Date()
        });

        // Notification : navette clôturée
        try {
            await Notification.notifyByService(navette.service_id, ['manager', 'representant'], {
                title: 'Navette clôturée',
                message: `La navette ${navette.code} a été clôturée par la paie.`,
                type: 'navette_cloturee',
                link: `/navettes/${navette.id}`,
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification navette_cloturee:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'close',
            target_id: navette.id,
            target_label: `Navette ${navette.code}`,
            description: `Navette ${navette.code} clôturée par la paie.`,
            new_values: { etat: navette.etat, status: navette.status },
        });

        res.send({
            message: "Navette clôturée avec succès par la paie !",
            navette: navette
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la clôture de la navette avec l'id=${navetteId}.` + error.message
        });
    }
};

exports.depart = async (req, res) => {
    const { date_depart, type_depart, employer_id } = req.body;
    try {
        const employer = await Employer.findByPk(employer_id);
        if (!employer) {
            return res.status(404).send({
                message: `Impossible de trouver l'employé avec l'id=${employer_id}.`
            });
        }

        if (!date_depart || !type_depart) {
            return res.status(404).send({
                message: `les champs date de départ et type sont obligatoire.`
            });
        }

        // Mettre à jour l'état, le status général et la date de clôture
        await employer.update({
            date_depart: date_depart,
            type_depart: type_depart,
            last_update_by : req.user.id,
        });

        res.send({
            message: "Mise à jour réussit !",
            data: employer
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la mise à jour du départ.` + error.message
        });
    }
};

exports.mutation = async (req, res) => {
    const { service_new_id, ligne_navette_id, date_depart, employer_id, user_id } = req.body;
    try {
        const employer = await Employer.findByPk(employer_id);
        if (!employer) {
            return res.status(404).send({
                message: `Impossible de trouver l'employé avec l'id=${employer_id}.`
            });
        }

        if (!date_depart || !type_depart) {
            return res.status(404).send({
                message: `les champs date de départ et type sont obligatoire.`
            });
        }

        // Mettre à jour l'état, le status général et la date de clôture
        await employer.update({
            date_depart: date_depart,
            type_depart: type_depart,
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'depart',
            target_id: employer.id,
            target_label: `Départ Employé #${employer.id}`,
            description: `Départ enregistré pour l'employé #${employer_id}: ${type_depart} le ${date_depart}.`,
            new_values: { employer_id, date_depart, type_depart },
        });

        res.send({
            message: "Mise à jour réussit !",
            data: employer
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la mise à jour du départ.` + error.message
        });
    }
};

exports.departDelete = async (req, res) => {
    const { id } = req.params;
    try {
        const employer = await Employer.findByPk(id);
        if (!employer) {
            return res.status(404).send({
                message: `Impossible de trouver l'employé avec l'id=${id}.`
            });
        }


        const oldDepartValues = { date_depart: employer.date_depart, type_depart: employer.type_depart };

        // Mettre à jour l'état, le status général et la date de clôture
        await employer.update({
            date_depart: null,
            type_depart: null,
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'depart_delete',
            target_id: employer.id,
            target_label: `Annulation départ Employé #${employer.id}`,
            description: `Annulation du départ de l'employé #${id}.`,
            old_values: oldDepartValues,
        });

        res.send({
            message: "Mise à jour réussit !",
            data: employer
        });

    } catch (error) {
        res.status(500).send({
            message: `Erreur lors de la mise à jour du départ.` + error.message
        });
    }
};

// ==========================================
// EXTRACTION SAGE (Excel)
// ==========================================
exports.exportSage = async (req, res) => {
    try {
        const { id } = req.params;

        const navette = await Navette.findByPk(id, {
            include: [
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                {
                    model: NavetteLigne, as: 'navetteLignes',
                    include: [
                        { model: Employer, as: 'employer', attributes: ['id', 'matricule', 'nom', 'prenom', 'is_cadre'] },
                        { model: EmployerAb, as: 'absences' },
                        { model: EmployerAccompte, as: 'acomptes' },
                        { model: EmployerHeure, as: 'heuresSup' },
                        { model: EmployerPrime, as: 'primes' },
                        { model: EmployerPrimeNuit, as: 'primesNuit' },
                    ]
                }
            ]
        });

        if (!navette) {
            return res.status(404).json({ message: "Navette introuvable." });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'PRONAVETTE';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('Extraction Sage');

        // En-têtes
        ws.columns = [
            { header: 'Mlle', key: 'matricule', width: 15 },
            { header: 'Element', key: 'element', width: 12 },
            { header: 'Code', key: 'code', width: 12 },
            { header: 'Valeur', key: 'valeur', width: 15 },
        ];

        // Style de l'en-tête
        ws.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Codes comptables
        const CODE_ABSENCE = {
            ABSENCE_NON_REMUNEREE: "HA10",
            ACCIDENT_DE_TRAVAIL: "HA06",
            ABSENCE_MISE_A_PIEDS: "HA10",
            ABSENCE_CONGES_DE_MATERNITE: "HA08",
            ABSENCE_CONGES_PAYE: "HC02",
            ABSENCE_REMUNEREE: "HC01",
            ABSENCE_PATERNITE: "HA09",
            ABSENCE_MALADIE: "HA05",
            ABSENCE_FORMATION: "HA07",
            ABSENCE_CONGES_A_CALCULER: "HA03",
            ABSENCE_CONGES_SUP_MATERNITE: "HA04"
        };

        const PRIME_CODE_MAP = {
            'PRIME CAISSE': 'CL25',
            'PRIME IMPOSABLE': 'CL19',
            'PRIME ASTREINTE': 'CL04',
            'PRIME DE FRAIS': 'CL24',
            'PRIME TENUE': 'CL15',
            'PRIME INVENTAIRE': 'CL23',
            'PRIME DE PANIER': 'CL06',
            'PRIME DE TRANSPORT': 'CL13',
            'PRIME DE FIN D ANNEE': 'CL20',
            'PRIME FIXE IMPOSABLE': 'CL26',
            'PRIME FIXE NON IMPOSABLE': 'CL21',
            'PRIME DIVERS': 'CL10',
            'PRIME SURSALAIRE': 'CL01',
            'PRIME RAPPEL AUGMENTATION': 'CL02',
            'PRIME SEMESTRIELLE': 'CL08',
            'PRIME DE DEPART': 'CL16',
            'PRIME FRAIS FUNERAIRES': 'CL17',
            'PRIME ASTREINTE PROXIMITE': 'CL53',
            'PRIME CAISSE PROXIMITE': 'CL54',
            'PRIME JOUR SUPPLEMENTAIRE': 'CL64',
            'PRIME VACCINATION': '3631',
            'INDEMNITE PREAVIS': '1800',
            'INDEMNITE AGGRAVATION': '1810',
            'INDEMNITE LICENCIEMENT IMPOSABLE': '1900',
            'INDEMNITE DECES IMPOSABLE': '1910',
            'INDEMNITE RETRAITE IMPOSABLE': '1920',
            'INDEMNITE DEPART CDD IMPOSABLE': '1980',
            'INDEMNITE LICENCIEMENT NON IMPOSABLE': '3150',
            'INDEMNITE DECES NON IMPOSABLE': '3152',
            'INDEMNITE RETRAITE NON IMPOSABLE': '3154',
            'INDEMNITE FIXE DEPART NON IMPOSABLE': '3160',
            'INDEMNITE DEPART CDD NON IMPOSABLE': '3162'
        };

        // Parcourir les lignes navette triées par matricule
        const sortedLines = [...navette.navetteLignes].sort((a, b) => {
            if (!a.employer || !b.employer) return 0;
            return (a.employer.matricule || '').localeCompare(b.employer.matricule || '');
        });

        for (const ligne of sortedLines) {
            const emp = ligne.employer;
            if (!emp) continue;
            const matricule = emp.matricule;

            // --- Absences ---
            if (ligne.absences && ligne.absences.length > 0) {
                for (const abs of ligne.absences) {
                    const code = abs.code_abs || CODE_ABSENCE[abs.type_abs] || '??';
                    ws.addRow({
                        matricule,
                        element: 255,
                        code,
                        valeur: abs.nb_jours
                    });
                }
            }

            // --- Acomptes ---
            if (ligne.acomptes && ligne.acomptes.length > 0) {
                for (const acc of ligne.acomptes) {
                    ws.addRow({
                        matricule,
                        element: 255,
                        code: acc.code_accompte || 'CL30',
                        valeur: acc.somme
                    });
                }
            }

            // --- Heures supplémentaires (valeurs agrégées après distribution) ---
            if (ligne.heure_sup_15 > 0) {
                ws.addRow({
                    matricule,
                    element: 255,
                    code: 'HS01',
                    valeur: ligne.heure_sup_15
                });
            }
            if (ligne.heure_sup_50 > 0) {
                ws.addRow({
                    matricule,
                    element: 255,
                    code: 'HS02',
                    valeur: ligne.heure_sup_50
                });
            }
            if (ligne.heure_sup_75 > 0) {
                ws.addRow({
                    matricule,
                    element: 255,
                    code: 'HS03',
                    valeur: ligne.heure_sup_75
                });
            }

            // --- Primes ---
            if (ligne.primes && ligne.primes.length > 0) {
                for (const p of ligne.primes) {
                    const code = p.code_prime || PRIME_CODE_MAP[p.type_prime] || '??';
                    ws.addRow({
                        matricule,
                        element: 255,
                        code,
                        valeur: p.montant
                    });
                }
            }

            // --- Primes de nuit ---
            if (ligne.primesNuit && ligne.primesNuit.length > 0) {
                for (const pn of ligne.primesNuit) {
                    ws.addRow({
                        matricule,
                        element: 255,
                        code: pn.code_prime_nuit || 'CL12',
                        valeur: pn.nb_jour
                    });
                }
            }
        }

        // Style de bordure sur les données
        ws.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        // Nom du fichier
        const serviceName = navette.service ? navette.service.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Service';
        const periode = new Date(navette.periode_at);
        const mois = String(periode.getMonth() + 1).padStart(2, '0');
        const annee = periode.getFullYear();
        const fileName = `Extraction_Sage_${serviceName}_${mois}_${annee}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Erreur export Sage:', error);
        res.status(500).json({ message: "Erreur lors de l'export Sage : " + error.message });
    }
};

// ==========================================
// TEMPLATE IMPORT EMPLOYÉS (Excel vide)
// ==========================================
exports.downloadEmployerTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'PRONAVETTE';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('Template Employés');

        ws.columns = [
            { header: 'Matricule', key: 'Matricule', width: 15 },
            { header: 'Nom', key: 'Nom', width: 20 },
            { header: 'Prenoms', key: 'Prenoms', width: 20 },
            { header: 'Service', key: 'Service', width: 20 },
            { header: 'Cadre', key: 'Cadre', width: 10 },
            { header: 'Email', key: 'Email', width: 25 },
            { header: 'Poste_occupe', key: 'Poste_occupe', width: 20 },
            { header: 'Genre', key: 'Genre', width: 10 },
            { header: 'Date_embauche', key: 'Date_embauche', width: 15 },
            { header: 'Date_depart', key: 'Date_depart', width: 15 },
            { header: 'Type_depart', key: 'Type_depart', width: 15 },
        ];

        ws.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Ligne d'exemple
        ws.addRow({
            Matricule: 'EMP001',
            Nom: 'DUPONT',
            Prenoms: 'Jean',
            Service: 'LOGISTIQUE',
            Cadre: 'NON',
            Email: 'jean.dupont@exemple.com',
            Poste_occupe: 'Magasinier',
            Genre: 'Homme',
            Date_embauche: '01/01/2020',
            Date_depart: '',
            Type_depart: '',
        });

        ws.getRow(2).eachCell(cell => {
            cell.font = { italic: true, color: { argb: 'FF999999' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Feuille de référence
        const refWs = workbook.addWorksheet('Référence');
        refWs.columns = [
            { header: 'Champ', key: 'champ', width: 20 },
            { header: 'Valeurs acceptées', key: 'valeurs', width: 50 },
            { header: 'Obligatoire', key: 'obligatoire', width: 15 },
        ];
        refWs.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
        });

        const services = await Service.findAll({ attributes: ['name'], order: [['name', 'ASC']] });
        const serviceNames = services.map(s => s.name).join(', ');

        refWs.addRow({ champ: 'Matricule', valeurs: 'Texte unique obligatoire', obligatoire: 'OUI' });
        refWs.addRow({ champ: 'Nom', valeurs: 'Texte', obligatoire: 'OUI' });
        refWs.addRow({ champ: 'Prenoms', valeurs: 'Texte', obligatoire: 'OUI' });
        refWs.addRow({ champ: 'Service', valeurs: serviceNames, obligatoire: 'NON' });
        refWs.addRow({ champ: 'Cadre', valeurs: 'OUI ou NON', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Email', valeurs: 'Adresse email valide', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Poste_occupe', valeurs: 'Texte libre', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Genre', valeurs: 'Homme ou Femme', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Date_embauche', valeurs: 'Format DD/MM/YYYY', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Date_depart', valeurs: 'Format DD/MM/YYYY (vide si actif)', obligatoire: 'NON' });
        refWs.addRow({ champ: 'Type_depart', valeurs: 'DEMISSION, RETRAITE, DECES, LICENCIEMENT', obligatoire: 'NON' });

        const fileName = 'Template_Import_Employes.xlsx';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Erreur template employés:', error);
        res.status(500).json({ message: "Erreur lors de la génération du template : " + error.message });
    }
};

// ==========================================
// GESTION DES CAMPAGNES
// ==========================================

/**
 * Liste toutes les campagnes (navettes groupées par periode_at)
 */
exports.listCampagnes = async (req, res) => {
    try {
        // Récupérer toutes les navettes groupées par periode_at
        const navettes = await Navette.findAll({
            include: [
                { model: Service, as: 'service', attributes: ['id', 'name'] },
            ],
            order: [['periode_at', 'DESC'], ['created_at', 'DESC']],
            attributes: [
                'id', 'name', 'code', 'service_id', 'periode_at',
                'periode_debut_at', 'periode_fin_at', 'status', 'etat',
                'date_creation', 'created_at'
            ],
        });

        // Grouper par periode_at
        const campagnesMap = {};
        for (const nav of navettes) {
            const key = nav.periode_at ? new Date(nav.periode_at).toISOString().slice(0, 10) : 'inconnu';
            if (!campagnesMap[key]) {
                campagnesMap[key] = {
                    periode_at: nav.periode_at,
                    periode_debut_at: nav.periode_debut_at,
                    periode_fin_at: nav.periode_fin_at,
                    date_creation: nav.date_creation || nav.created_at,
                    navettes: [],
                    totalServices: 0,
                    statusCounts: { 'En attente': 0, 'En cours': 0, 'bloqué': 0, 'Terminé': 0 },
                };
            }
            campagnesMap[key].navettes.push(nav);
            campagnesMap[key].totalServices++;
            if (campagnesMap[key].statusCounts[nav.status] !== undefined) {
                campagnesMap[key].statusCounts[nav.status]++;
            }
        }

        // Vérifier l'interaction pour chaque campagne
        const campagnes = [];
        for (const [key, campagne] of Object.entries(campagnesMap)) {
            const navetteIds = campagne.navettes.map(n => n.id);

            // Récupérer les IDs des lignes une seule fois
            const ligneIds = await NavetteLigne.findAll({
                where: { navette_id: { [Op.in]: navetteIds } },
                attributes: ['id'],
                raw: true,
            }).then(r => r.map(l => l.id));

            // Vérifier si des données ont été saisies
            const [absCount, acompteCount, heureCount, primeCount, primeNuitCount] = await Promise.all([
                EmployerAb.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
                EmployerAccompte.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
                ligneIds.length > 0 ? EmployerHeure.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : Promise.resolve(0),
                ligneIds.length > 0 ? EmployerPrime.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : Promise.resolve(0),
                ligneIds.length > 0 ? EmployerPrimeNuit.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : Promise.resolve(0),
            ]);

            const hasInteraction = (absCount + acompteCount + heureCount + primeCount + primeNuitCount) > 0;
            const hasStatusChange = campagne.navettes.some(n => n.status !== 'En attente');

            campagnes.push({
                ...campagne,
                hasInteraction: hasInteraction || hasStatusChange,
                isDeletable: !hasInteraction && !hasStatusChange,
                totalSaisies: absCount + acompteCount + heureCount + primeCount + primeNuitCount,
                navettes: campagne.navettes.map(n => ({
                    id: n.id,
                    name: n.name,
                    code: n.code,
                    status: n.status,
                    etat: n.etat,
                    service: n.service,
                })),
            });
        }

        res.json({
            message: 'Campagnes récupérées avec succès.',
            data: campagnes,
        });
    } catch (error) {
        console.error('Erreur listCampagnes:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des campagnes: ' + error.message });
    }
};

/**
 * Prolonger une campagne (mettre à jour la date de fin)
 * Seule la paie peut modifier les dates, et uniquement pour les campagnes non terminées du mois en cours.
 */
exports.prolongerCampagne = async (req, res) => {
    try {
        const { periode_at, nouvelle_date_fin } = req.body;
        const user_id = req.user.id;

        if (!periode_at || !nouvelle_date_fin) {
            return res.status(400).json({ message: 'La période et la nouvelle date de fin sont obligatoires.' });
        }

        const periodeDate = new Date(periode_at);
        const nouvelleFin = new Date(nouvelle_date_fin);

        // Vérification : seul le mois en cours peut être modifié
        const now = new Date();
        const moisCourantDebut = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodeKey = periodeDate.toISOString().slice(0, 7);
        const moisCourantKey = moisCourantDebut.toISOString().slice(0, 7);

        if (periodeKey !== moisCourantKey) {
            return res.status(400).json({
                message: 'Vous ne pouvez modifier les dates que pour la campagne du mois en cours.'
            });
        }

        // Récupérer les navettes de cette campagne
        const navettes = await Navette.findAll({
            where: { periode_at: periodeDate },
        });

        if (navettes.length === 0) {
            return res.status(404).json({ message: 'Aucune campagne trouvée pour cette période.' });
        }

        // Vérification : campagne non terminée
        const allTerminees = navettes.every(n => n.status === 'Terminé');
        if (allTerminees) {
            return res.status(400).json({
                message: 'Cette campagne est terminée et ne peut plus être modifiée.'
            });
        }

        // Vérifier que la nouvelle date est postérieure à l'ancienne
        const ancienneFin = navettes[0].periode_fin_at;
        if (nouvelleFin <= new Date(ancienneFin)) {
            return res.status(400).json({
                message: 'La nouvelle date de fin doit être postérieure à la date actuelle (' +
                    new Date(ancienneFin).toLocaleDateString('fr-FR') + ').'
            });
        }

        // Mettre à jour toutes les navettes de la campagne
        await Navette.update(
            {
                periode_fin_at: nouvelleFin,
                last_update_by: user_id,
            },
            {
                where: { periode_at: periodeDate },
                individualHooks: false, // pas de hook beforeUpdate pour mise à jour de masse
            }
        );

        // Débloquer les navettes bloquées (si période expirée puis prolongée)
        await Navette.update(
            { status: 'En cours' },
            {
                where: {
                    periode_at: periodeDate,
                    status: 'bloqué',
                },
                individualHooks: false,
            }
        );

        // Notification + Email
        const moisNomsProl = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const periodeLabelProl = `${moisNomsProl[periodeDate.getMonth()]} ${periodeDate.getFullYear()}`;
        const dateDebutProl = navettes[0].periode_debut_at ? new Date(navettes[0].periode_debut_at).toLocaleDateString('fr-FR') : 'N/A';
        const dateFinProl = nouvelleFin.toLocaleDateString('fr-FR');

        try {
            const allUsers = await User.findAll({
                where: {
                    [Op.or]: [
                        { is_manager: true },
                        { is_representant: true },
                        { is_paie: true },
                        { is_admin: true },
                        { is_superadmin: true },
                    ]
                },
                attributes: ['id', 'email'],
            });

            const allUserIds = allUsers.map(u => u.id);
            const allEmails = allUsers.filter(u => u.email).map(u => u.email);

            await Notification.notifyUsers(allUserIds, {
                title: '🔄 Campagne prolongée',
                message: `La campagne navette pour ${periodeLabelProl} a été prolongée jusqu'au ${dateFinProl}.`,
                type: 'campagne_rappel',
                link: '/navette/service',
            });

            await sendCampagneReminderEmail(allEmails, {
                periodeLabel: periodeLabelProl,
                dateFin: dateFinProl,
                joursRestants: Math.ceil((nouvelleFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                type: 'prolongee',
            });
        } catch (notifErr) {
            console.error('Erreur notification prolongation:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'prolonger_campagne',
            target_id: null,
            target_label: `Campagne ${periodeDate.getMonth() + 1}/${periodeDate.getFullYear()}`,
            description: `Campagne prolongée jusqu'au ${nouvelleFin.toLocaleDateString('fr-FR')}. ${navettes.length} navette(s) mises à jour.`,
            old_values: { periode_fin_at: ancienneFin },
            new_values: { periode_fin_at: nouvelle_date_fin },
        });

        res.json({
            message: `Campagne prolongée avec succès. Nouvelle date de fin : ${nouvelleFin.toLocaleDateString('fr-FR')}. ${navettes.length} navette(s) mise(s) à jour.`,
            count: navettes.length,
        });
    } catch (error) {
        console.error('Erreur prolongerCampagne:', error);
        res.status(500).json({ message: 'Erreur lors de la prolongation: ' + error.message });
    }
};

/**
 * Supprimer une campagne (seulement si aucune interaction)
 */
exports.deleteCampagne = async (req, res) => {
    try {
        const { periode_at } = req.body;

        if (!periode_at) {
            return res.status(400).json({ message: 'La période est obligatoire.' });
        }

        const periodeDate = new Date(periode_at);

        // Récupérer les navettes de cette campagne
        const navettes = await Navette.findAll({
            where: { periode_at: periodeDate },
        });

        if (navettes.length === 0) {
            return res.status(404).json({ message: 'Aucune campagne trouvée pour cette période.' });
        }

        const navetteIds = navettes.map(n => n.id);

        // Vérifier si des données ont été saisies
        const ligneIds = await NavetteLigne.findAll({
            where: { navette_id: { [Op.in]: navetteIds } },
            attributes: ['id'],
            raw: true,
        }).then(r => r.map(l => l.id));

        const [absCount, acompteCount, heureCount, primeCount, primeNuitCount] = await Promise.all([
            EmployerAb.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
            EmployerAccompte.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
            ligneIds.length > 0 ? EmployerHeure.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
            ligneIds.length > 0 ? EmployerPrime.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
            ligneIds.length > 0 ? EmployerPrimeNuit.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
        ]);

        const totalSaisies = absCount + acompteCount + heureCount + primeCount + primeNuitCount;

        // Vérifier si des navettes ont changé de statut
        const hasStatusChange = navettes.some(n => n.status !== 'En attente');

        if (totalSaisies > 0 || hasStatusChange) {
            return res.status(400).json({
                message: `Impossible de supprimer cette campagne. ${totalSaisies} saisie(s) ont été effectuées et/ou des navettes ont changé de statut.`,
                totalSaisies,
                hasStatusChange,
            });
        }

        // Supprimer les lignes navettes d'abord
        if (ligneIds.length > 0) {
            await NavetteLigne.destroy({
                where: { navette_id: { [Op.in]: navetteIds } },
                force: true,
            });
        }

        // Supprimer les navettes
        await Navette.destroy({
            where: { periode_at: periodeDate },
            force: true,
        });

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'delete_campagne',
            target_id: null,
            target_label: `Campagne ${periodeDate.getMonth() + 1}/${periodeDate.getFullYear()}`,
            description: `Campagne supprimée. ${navettes.length} navette(s) et ${ligneIds.length} ligne(s) supprimées.`,
        });

        res.json({
            message: `Campagne supprimée avec succès. ${navettes.length} navette(s) et ${ligneIds.length} ligne(s) supprimée(s).`,
        });
    } catch (error) {
        console.error('Erreur deleteCampagne:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression: ' + error.message });
    }
};

/**
 * Modifier les dates d'une campagne (début et/ou fin).
 * Réservé à la paie. Uniquement les campagnes non terminées du mois en cours.
 */
exports.updateCampagneDates = async (req, res) => {
    try {
        const { periode_at, nouvelle_date_debut, nouvelle_date_fin } = req.body;
        const user_id = req.user.id;

        if (!periode_at) {
            return res.status(400).json({ message: 'La période est obligatoire.' });
        }
        if (!nouvelle_date_debut && !nouvelle_date_fin) {
            return res.status(400).json({ message: 'Veuillez fournir au moins une date à modifier.' });
        }

        const periodeDate = new Date(periode_at);

        // Vérification : seul le mois en cours
        const now = new Date();
        const periodeKey = periodeDate.toISOString().slice(0, 7);
        const moisCourantKey = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);

        if (periodeKey !== moisCourantKey) {
            return res.status(400).json({
                message: 'Vous ne pouvez modifier les dates que pour la campagne du mois en cours.'
            });
        }

        // Récupérer les navettes de cette campagne
        const navettes = await Navette.findAll({
            where: { periode_at: periodeDate },
        });

        if (navettes.length === 0) {
            return res.status(404).json({ message: 'Aucune campagne trouvée pour cette période.' });
        }

        // Vérification : pas toutes terminées
        const allTerminees = navettes.every(n => n.status === 'Terminé');
        if (allTerminees) {
            return res.status(400).json({
                message: 'Cette campagne est terminée et ne peut plus être modifiée.'
            });
        }

        // Vérifier si des navettes ont changé de statut ou si des données ont été saisies
        const hasStatusChange = navettes.some(n => n.status !== 'En attente');
        if (hasStatusChange) {
            // Si des navettes ont changé de statut, on ne peut plus modifier la date de début
            if (nouvelle_date_debut) {
                return res.status(400).json({
                    message: 'Impossible de modifier la date de début : des navettes ont déjà changé de statut. Vous pouvez uniquement prolonger la date de fin.'
                });
            }
        }

        // Vérifier si des données ont été saisies (absences, acomptes, etc.)
        const navetteIds = navettes.map(n => n.id);
        const ligneIds = await NavetteLigne.findAll({
            where: { navette_id: { [Op.in]: navetteIds } },
            attributes: ['id'],
            raw: true,
        }).then(r => r.map(l => l.id));

        const [absCount, acompteCount, heureCount, primeCount, primeNuitCount] = await Promise.all([
            EmployerAb.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
            EmployerAccompte.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
            ligneIds.length > 0 ? EmployerHeure.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
            ligneIds.length > 0 ? EmployerPrime.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
            ligneIds.length > 0 ? EmployerPrimeNuit.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
        ]);

        const hasSaisies = (absCount + acompteCount + heureCount + primeCount + primeNuitCount) > 0;
        if (hasSaisies && nouvelle_date_debut) {
            return res.status(400).json({
                message: 'Impossible de modifier la date de début : des données ont déjà été saisies par les utilisateurs. Vous pouvez uniquement prolonger la date de fin.'
            });
        }

        // Construire les champs à mettre à jour
        const updateFields = { last_update_by: user_id };
        if (nouvelle_date_debut && !hasStatusChange && !hasSaisies) updateFields.periode_debut_at = new Date(nouvelle_date_debut);
        if (nouvelle_date_fin) updateFields.periode_fin_at = new Date(nouvelle_date_fin);

        // Valider cohérence des dates
        const dateDebut = nouvelle_date_debut ? new Date(nouvelle_date_debut) : new Date(navettes[0].periode_debut_at);
        const dateFin = nouvelle_date_fin ? new Date(nouvelle_date_fin) : new Date(navettes[0].periode_fin_at);

        if (dateDebut > dateFin) {
            return res.status(400).json({
                message: 'La date de début ne peut pas être postérieure à la date de fin.'
            });
        }

        await Navette.update(updateFields, {
            where: { periode_at: periodeDate },
            individualHooks: false,
        });

        // Débloquer les navettes bloquées si la nouvelle fin est dans le futur
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateFin >= today) {
            await Navette.update(
                { status: 'En cours' },
                {
                    where: {
                        periode_at: periodeDate,
                        status: 'bloqué',
                    },
                    individualHooks: false,
                }
            );
        }

        // Notification + Email
        const moisNomsUpdate = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const periodeLabelUpdate = `${moisNomsUpdate[periodeDate.getMonth()]} ${periodeDate.getFullYear()}`;

        try {
            const allUsers = await User.findAll({
                where: {
                    [Op.or]: [
                        { is_manager: true },
                        { is_representant: true },
                        { is_paie: true },
                        { is_admin: true },
                        { is_superadmin: true },
                    ]
                },
                attributes: ['id', 'email'],
            });

            const allUserIds = allUsers.map(u => u.id);
            const allEmails = allUsers.filter(u => u.email).map(u => u.email);

            await Notification.notifyUsers(allUserIds, {
                title: 'Dates de campagne modifiées',
                message: `Les dates de la campagne ${periodeLabelUpdate} ont été modifiées. Début: ${dateDebut.toLocaleDateString('fr-FR')}, Fin: ${dateFin.toLocaleDateString('fr-FR')}.`,
                type: 'navette_lancee',
                link: '/navette/service',
            });

            await sendCampagneLaunchedEmail(allEmails, {
                periodeLabel: periodeLabelUpdate,
                dateDebut: dateDebut.toLocaleDateString('fr-FR'),
                dateFin: dateFin.toLocaleDateString('fr-FR'),
                action: 'mise à jour',
            });
        } catch (notifErr) {
            console.error('Erreur notification mise à jour campagne:', notifErr);
        }

        await ActivityLog.log(req, {
            module: 'navette',
            action: 'update_campagne_dates',
            target_id: null,
            target_label: `Campagne ${periodeDate.getMonth() + 1}/${periodeDate.getFullYear()}`,
            description: `Dates de campagne mises à jour. ${navettes.length} navette(s) modifiées.`,
            old_values: { periode_debut_at: navettes[0].periode_debut_at, periode_fin_at: navettes[0].periode_fin_at },
            new_values: { nouvelle_date_debut, nouvelle_date_fin },
        });

        res.json({
            message: `Dates de campagne mises à jour avec succès. ${navettes.length} navette(s) modifiée(s).`,
            count: navettes.length,
        });
    } catch (error) {
        console.error('Erreur updateCampagneDates:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour des dates: ' + error.message });
    }
};