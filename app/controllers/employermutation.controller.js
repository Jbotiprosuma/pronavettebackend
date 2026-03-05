// app/controllers/employerMutationController.js
const db = require('../models');
const { NavetteLigne, sequelize } = require('../models');
const EmployerMutation = db.EmployerMutation;
const Service = db.Service;
const Employer = db.Employer;
const Navette = db.Navette;
const EmployerAb = db.EmployerAb;
const { Op, where } = require('sequelize'); // Nécessaire pour les requêtes complexes (OR)
const User = db.User; // Assurez-vous que le modèle User est bien exporté dans db
const { sendMutationNotification } = require('../services/email.service');
const transporter = require('../config/mailer');
const Notification = db.Notification;
const EmployerHistory = db.EmployerHistory;
const ActivityLog = db.ActivityLog;
const moment = require('moment');

const getIncludes = () => {
    const models = db.sequelize.models;

    return [
        { model: models.Employer, as: 'employer' },
        { model: models.Service, as: 'serviceOld' },
        { model: models.Service, as: 'serviceNew' },
        { model: models.Navette, as: 'navette' },
        { model: models.NavetteLigne, as: 'navetteLigne' },
        {
            model: models.User,
            as: 'createdby',
        },
        {
            model: models.User,
            as: 'confirmeby',
        }
        ,
        {
            model: models.User,
            as: 'updatedby',
        }
        ,
        {
            model: models.User,
            as: 'cancelby',
        }
        ,
        {
            model: models.User,
            as: 'rejectby',
        }
        ,
        {
            model: models.User,
            as: 'deletedby',
        }
        ,
        {
            model: models.User,
            as: 'lastupdateby',
        }
    ];
};

/**
 * Retourne les IDs des employés ayant au moins une mutation "En attente".
 * Utilisé par le frontend pour bloquer la sélection/édition.
 */
exports.getPendingEmployerIds = async (req, res) => {
    try {
        const pendingMutations = await EmployerMutation.findAll({
            where: { status: 'En attente' },
            attributes: ['employer_id', 'id', 'service_old_id', 'service_new_id'],
            include: [
                { model: Employer, as: 'employer', attributes: ['id', 'nom', 'prenom', 'matricule'] },
                { model: Service, as: 'serviceOld', attributes: ['id', 'name'] },
                { model: Service, as: 'serviceNew', attributes: ['id', 'name'] },
            ],
            raw: false,
        });

        res.status(200).json({
            message: 'Liste des employés avec mutation en attente.',
            data: pendingMutations,
        });
    } catch (error) {
        console.error('Erreur getPendingEmployerIds:', error);
        res.status(500).json({ message: 'Erreur interne.', error: error.message });
    }
};

exports.getAllMutations = async (req, res) => {
    try {

        const { service_id, is_paie, is_admin, is_superadmin } = req.user;
        let mutations;
        if (is_admin || is_superadmin || is_paie) {
            mutations = await EmployerMutation.findAll({
                include: getIncludes(),
                order: [['created_at', 'DESC']]
            });
        } else {
            mutations = await EmployerMutation.findAll({
                where: {
                    [Op.or]: [
                        { service_old_id: service_id },
                        { service_new_id: service_id }
                    ]
                },
                include: getIncludes(),
                order: [['created_at', 'DESC']]
            });
        }
        res.status(200).json({
            message: 'Mutations récupérées avec succès.',
            data: mutations
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des mutations :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la récupération des mutations.',
            error: error.message
        });
    }
};

exports.getAllMutationByServiceUser = async (req, res) => {
    try {
        // On suppose que l'ID de l'utilisateur est passé en paramètre (ex: /mutations/user/:userId)
        // OU récupéré via le token d'authentification (req.user.id) si vous avez un middleware auth.
        // Ici, j'utilise req.params.userId pour l'exemple explicite.
        const userId = req.user.id;

        // 1. Récupérer l'utilisateur pour connaître son service
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        if (!user.service_id) {
            return res.status(400).json({
                message: 'Cet utilisateur n\'est rattaché à aucun service. Impossible de filtrer les mutations.'
            });
        }

        const userServiceId = user.service_id;

        // 2. Récupérer les mutations où le service de l'utilisateur est impliqué
        // (soit comme service d'origine, soit comme service de destination)
        const mutations = await EmployerMutation.findAll({
            where: {
                [Op.or]: [
                    { service_old_id: userServiceId }, // L'employé part de ce service
                    { service_new_id: userServiceId }  // L'employé arrive dans ce service
                ]
            },
            include: getIncludes(), // On garde les mêmes inclusions (Employer, Navette, etc.)
            order: [
                ['created_at', 'DESC'] // Les plus récentes en premier
            ]
        });

        res.status(200).json({
            message: `Mutations récupérées pour le service #${userServiceId} de l'utilisateur.`,
            count: mutations.length,
            data: mutations
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des mutations par service utilisateur :', error);
        res.status(500).json({
            message: 'Erreur interne lors de la récupération des mutations filtrées.',
            error: error.message
        });
    }
};

exports.getMutationById = async (req, res) => {
    try {
        const { id } = req.params; // On utilise l'ID comme identifiant

        const mutation = await EmployerMutation.findByPk(id, {
            include: getIncludes()
        });

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }
        res.status(200).json({
            message: 'Mutation récupérée avec succès.',
            data: mutation
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la mutation par ID :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la récupération de la mutation.',
            error: error.message
        });
    }
};

exports.createMutation = async (req, res) => {
    try {
        const {
            employer_id,
            service_new_id,
            depart_at,
            arrivee_at,
            periode_at,
            heure_sup_15,
            heure_sup_50,
            heure_sup_75,
            nb_jours_job,
            nb_jour_abs
        } = req.body;

        const existingPendingMutation = await EmployerMutation.findOne({
            where: {
                employer_id: employer_id,
                status: 'En attente'
            }
        });

        if (existingPendingMutation) {
            return res.status(409).json({ // 409 Conflict est approprié ici
                message: 'Erreur ! Une mutation "En attente" existe déjà pour cet employé. Veuillez la valider ou la supprimer avant d\'en créer une nouvelle.'
            });
        }

        const employee = await Employer.findByPk(employer_id);
        const newService = await Service.findByPk(service_new_id);

        // Sécurité: Si les IDs ne correspondent à rien (erreur 404/400)
        if (!employee || !newService) {
            return res.status(400).json({
                message: 'Validation échouée : Employé ou Nouveau Service non trouvé.'
            });
        }

        // Règle 1: Le nouveau service doit être différent de l'ancien
        if (newService.id === employee.service_id) {
            return res.status(400).json({
                message: 'Validation échouée : Veuillez choisir un Nouveau Service différent du service actuel.'
            });
        }

        // --- 2. VÉRIFICATIONS DES DATES ET PÉRIODES ---

        const now = moment().startOf('day');
        if (!depart_at) {
            return res.status(400).json({
                message: 'Validation échouée : La Date de Départ ne peut pas être vide.'
            });
        }

        // Règle 4: Période concernée (periode_at)
        if (periode_at) {
            const periodeMonth = moment(periode_at, 'YYYY-MM');
            const currentMonth = moment().startOf('month');
            const futureLimit = moment().add(12, 'months').startOf('month'); // Ex: Les 12 prochains mois

            // Vérifie que le mois est dans le passé OU dans les 12 prochains mois
            // (Si vous voulez que ce soit le mois en cours ou les prochains mois, on utilise isSameOrAfter(currentMonth))
            if (periodeMonth.isBefore(currentMonth) || periodeMonth.isAfter(futureLimit)) {
                return res.status(400).json({
                    message: 'Validation échouée : La Période concernée doit être le mois en cours ou dans les 12 prochains mois.'
                });
            }
        }

        // --- 3. VÉRIFICATIONS DES CHAMPS NUMÉRIQUES ---

        // Règle 5: Heures supplémentaires (vérification de la limite)
        if (heure_sup_15 > 32) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 15% ne doivent pas dépasser 32.' });
        }
        if (heure_sup_50 > 45) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 50% ne doivent pas dépasser 45.' });
        }
        if (heure_sup_75 > 50) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 75% ne doivent pas dépasser 50.' });
        }

        // Règle 6: Jours Travaillés / Absences
        if (nb_jours_job > 30) {
            return res.status(400).json({ message: 'Validation échouée : Jours Travaillés ne doivent pas dépasser 30.' });
        }
        if (nb_jour_abs > 30) {
            return res.status(400).json({ message: 'Validation échouée : Jours d\'Absence ne doivent pas dépasser 30.' });
        }

        const emailDetails = {
            isUpdate: false,
            employeeName: `${employee.prenom} ${employee.nom} (${employee.matricule})`,
            serviceName: newService.name,
            periodeAt: periode_at,
        };

        // --- 4. CALCUL SERVER-SIDE de nb_jours_job et récupération des données NavetteLigne ---
        const navette_ligne_id = req.body.navette_ligne_id;
        const navette_id = req.body.navette_id;
        const service_old_id = req.body.service_old_id || employee.service_id;

        let serverNbJoursJob = nb_jours_job || 0;
        let serverNbJourAbs = nb_jour_abs || 0;
        let serverAccompte = 0;
        let serverPrimeNuit = 0;
        let serverHeureSup15 = 0;
        let serverHeureSup50 = 0;
        let serverHeureSup75 = 0;

        if (navette_ligne_id) {
            const navetteLigne = await NavetteLigne.findByPk(navette_ligne_id);
            if (navetteLigne) {
                // Récupérer les totaux directement depuis la ligne navette
                serverNbJourAbs = navetteLigne.nb_jour_abs || 0;
                serverAccompte = navetteLigne.accompte || 0;
                serverPrimeNuit = navetteLigne.prime_nuit || 0;
                serverHeureSup15 = navetteLigne.heure_sup_15 || 0;
                serverHeureSup50 = navetteLigne.heure_sup_50 || 0;
                serverHeureSup75 = navetteLigne.heure_sup_75 || 0;

                // Utiliser nb_jour_abs_reduit directement depuis la ligne navette
                if (depart_at && navetteLigne.periode_at) {
                    const absencesReductrices = navetteLigne.nb_jour_abs_reduit || 0;
                    const periodeStart = moment(navetteLigne.periode_at).startOf('month');
                    const departDate = moment(depart_at);
                    const diffDays = departDate.diff(periodeStart, 'days');
                    serverNbJoursJob = Math.min(30, Math.max(0, diffDays - absencesReductrices));
                }
            }
        }

        const info = {
            employer_id,
            service_old_id,
            service_new_id,
            navette_id,
            navette_ligne_id,
            periode_at: periode_at ? periode_at + (periode_at.length === 7 ? '-01' : '') : null,
            depart_at: depart_at || null,
            arrivee_at: arrivee_at === '' ? null : arrivee_at,
            nb_jours_job: serverNbJoursJob,
            nb_jour_abs: serverNbJourAbs,
            accompte: serverAccompte,
            prime_nuit: serverPrimeNuit,
            heure_sup_15: serverHeureSup15,
            heure_sup_50: serverHeureSup50,
            heure_sup_75: serverHeureSup75,
            is_cadre: req.body.is_cadre,
            created_by: req.user.id
        };
        // Création de la mutation
        const newMutation = await EmployerMutation.create(info);

        // A. Utilisateurs responsables du NOUVEAU service (Managers et Représentants)
        const serviceRecipients = await User.findAll({
            where: {
                service_id: service_new_id,
                status: 'Activé',
                [Op.or]: [
                    { is_manager: true },
                    { is_representant: true }
                ]
            },
            attributes: ['email', 'mail', 'nom', 'prenom'], // Ne récupérer que les infos nécessaires
        });

        // B. Utilisateurs de la Paie (quel que soit le service)
        const paieRecipients = await User.findAll({
            where: {
                is_paie: true,
                status: 'Activé',
            },
            attributes: ['email', 'mail', 'nom', 'prenom'],
        });

        // C. Combiner et extraire les adresses email uniques
        const allRecipients = [...serviceRecipients, ...paieRecipients];
        const uniqueEmails = new Set();

        allRecipients.forEach(user => {
            if (user.mail) uniqueEmails.add(user.mail);
        });

        const recipientList = Array.from(uniqueEmails);

        if (recipientList.length > 0) {
            await sendMutationNotification(recipientList, emailDetails, req.user, transporter);
        }

        // Notification in-app : mutation créée
        try {
            await Notification.notifyByRole(['paie', 'superadmin'], {
                title: 'Nouvelle mutation créée',
                message: `Mutation de ${employee.nom} ${employee.prenom} vers un nouveau service.`,
                type: 'mutation_creee',
                link: '/mutations',
            });
        } catch (notifErr) {
            console.error('Erreur envoi notification mutation_creee:', notifErr);
        }

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id: req.body.employer_id,
                type: 'mutation', sous_type: 'En attente',
                description: `Mutation vers ${newService.name} (En attente)`,
                details: { service_old: employee.service_id, service_new: service_new_id, status: 'En attente', depart_at, arrivee_at },
                service_id: service_new_id,
                reference_id: newMutation.id, reference_table: 'employer_mutations',
                periode_at: periode_at || new Date(),
                created_by: req.user.id,
            });
        } catch (e) { console.error('History log mutation:', e.message); }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: 'create',
            target_id: newMutation.id,
            target_label: `Mutation Employé ${employee.nom} ${employee.prenom} → ${newService.name}`,
            description: `Mutation créée pour ${employee.nom} ${employee.prenom} (${employee.matricule}): service ${service_old_id} → ${newService.name}. Date d'effet: ${depart_at || 'N/A'}.`,
            new_values: { employer_id, service_old_id, service_new_id, date_effet: depart_at, motif: req.body.motif },
        });

        // Réponse
        res.status(201).json({
            message: 'Mutation créée avec succès. Les notifications ont été envoyées.',
            data: newMutation
        });

    } catch (error) {
        // Gérer les erreurs de base de données (notNull Violation, etc.)
        console.error('Erreur lors de la création de la mutation ou de l\'envoi du mail :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la création de la mutation.',
            error: error.message
        });
    }
};

exports.updateMutation = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const mutation = await EmployerMutation.findByPk(id);

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }

        // VÉRIFICATION DU STATUT : Seules les mutations 'En attente' peuvent être modifiées.
        if (mutation.status !== 'En attente') {
            return res.status(403).json({
                message: `Mise à jour impossible ! La mutation est en statut "${mutation.status}".`
            });
        }

        // Nettoyage des champs de confirmation/sécurité avant la validation
        delete body.status;
        delete body.is_confirme;
        delete body.confirme_by;
        delete body.confirme_at;
        delete body.employer_id;  // On ne change pas l'employé attaché
        delete body.created_by;
        delete body.is_apply;
        delete body.apply_at;
        delete body.deleted_by;
        delete body.reject_by;
        delete body.cancel_by;

        const info = {
            ...body,
            updated_by: req.user.id,
            last_update_by: req.user.id
        };

        // Définir les valeurs à vérifier (employer_id est immutable)
        const employeeId = mutation.employer_id;
        const serviceNewId = info.service_new_id;
        const serviceOldId = info.service_old_id;
        const departAt = info.depart_at;
        const arriveeAt = info.arrivee_at;
        const periodeAt = info.periode_at;
        const heureSup15 = info.heure_sup_15;
        const heureSup50 = info.heure_sup_50;
        const heureSup75 = info.heure_sup_75;
        const nbJoursJob = info.nb_jours_job;
        const nbJourAbs = info.nb_jour_abs;


        // 1. Récupération de l'Employé et du Nouveau Service pour les validations
        const [employee, newService] = await Promise.all([
            Employer.findByPk(employeeId),
            Service.findByPk(serviceNewId)
        ]);

        if (!employee || !newService) {
            return res.status(400).json({
                message: 'Validation échouée : Employé ou Nouveau Service non trouvé.'
            });
        }

        // Règle A: Le nouveau service est différent de l'ancien
        if (serviceNewId === serviceOldId) {
            return res.status(400).json({
                message: 'Validation échouée : Veuillez choisir un Nouveau Service différent du service d\'origine.'
            });
        }

        // --- VÉRIFICATIONS DES DATES ET PÉRIODES ---

        const now = moment().startOf('day');
        if (!departAt) {
            return res.status(400).json({
                message: 'Validation échouée : La Date de Départ ne peut pas être vide.'
            });
        }

        // Règle D: Période concernée (periode_at)
        if (periodeAt) {
            const periodeMonth = moment(periodeAt, 'YYYY-MM');
            const currentMonth = moment().startOf('month');
            const futureLimit = moment().add(12, 'months').startOf('month');

            if (periodeMonth.isBefore(currentMonth) || periodeMonth.isAfter(futureLimit)) {
                return res.status(400).json({
                    message: 'Validation échouée : La Période concernée doit être le mois en cours ou dans les 12 prochains mois.'
                });
            }
        }

        // --- VÉRIFICATIONS DES CHAMPS NUMÉRIQUES ---

        // Règle E: Heures supplémentaires (limites)
        if (heureSup15 > 32) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 15% ne doivent pas dépasser 32.' });
        }
        if (heureSup50 > 45) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 50% ne doivent pas dépasser 45.' });
        }
        if (heureSup75 > 50) {
            return res.status(400).json({ message: 'Validation échouée : Heures Sup. 75% ne doivent pas dépasser 50.' });
        }

        // Règle F: Jours Travaillés / Absences (limites)
        if (nbJoursJob > 30) {
            return res.status(400).json({ message: 'Validation échouée : Jours Travaillés ne doivent pas dépasser 30.' });
        }
        if (nbJourAbs > 30) {
            return res.status(400).json({ message: 'Validation échouée : Jours d\'Absence ne doivent pas dépasser 30.' });
        }

        const oldMutValues = { service_new_id: mutation.service_new_id, date_effet: mutation.depart_at, motif: mutation.motif };

        const updatedMutation = await mutation.update(info);


        const emailDetails = {
            isUpdate: true,
            employeeName: employee ? `${employee.prenom} ${employee.nom} (${employee.matricule})` : `ID ${employeeId} (Détails manquants)`,
            serviceName: newService ? newService.name : `ID ${serviceNewId} (Détails manquants)`,
            periodeAt: periodeAt || updatedMutation.periode_at,
        };

        const serviceRecipients = await User.findAll({
            where: {
                service_id: serviceNewId,
                status: 'Activé',
                [Op.or]: [
                    { is_manager: true },
                    { is_representant: true }
                ]
            },
            attributes: ['email', 'mail', 'nom', 'prenom'], // Ne récupérer que les infos nécessaires
        });

        // B. Utilisateurs de la Paie (quel que soit le service)
        const paieRecipients = await User.findAll({
            where: {
                is_paie: true,
                status: 'Activé',
            },
            attributes: ['email', 'mail', 'nom', 'prenom'],
        });

        // C. Combiner et extraire les adresses email uniques
        const allRecipients = [...serviceRecipients, ...paieRecipients];
        const uniqueEmails = new Set();

        allRecipients.forEach(user => {
            if (user.mail) uniqueEmails.add(user.mail);
        });

        const recipientList = Array.from(uniqueEmails);

        if (recipientList.length > 0) {
            await sendMutationNotification(recipientList, emailDetails, req.user, transporter);
        }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: 'update',
            target_id: mutation.id,
            target_label: `Mutation #${mutation.id}`,
            description: `Mutation #${mutation.id} mise à jour.`,
            old_values: oldMutValues,
            new_values: req.body,
        });

        res.status(200).json({
            message: 'Mutation mise à jour avec succès. Les notifications ont été envoyées.',
            data: updatedMutation
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la mutation :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la mise à jour de la mutation.',
            error: error.message
        });
    }
}

exports.deleteMutation = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Trouver la mutation et vérifier si elle existe
        const mutation = await EmployerMutation.findByPk(id);

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }

        // 2. VÉRIFICATION DU STATUT : Seules les mutations 'En attente' peuvent être supprimées
        if (mutation.status !== 'En attente') {
            return res.status(403).json({
                message: `Suppression impossible. La mutation est en statut "${mutation.status}".`
            });
        }

        await mutation.update({
            deleted_by: req.user.id,
            last_update_by: req.user.id,
        });

        const deletedRows = await EmployerMutation.destroy({ where: { id: id } });

        if (deletedRows === 0) {

            return res.status(404).json({ message: 'Échec de la suppression de la mutation.' });
        }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: 'delete',
            target_id: mutation.id,
            target_label: `Mutation #${mutation.id}`,
            description: `Mutation #${mutation.id} supprimée. Employé: ${mutation.employer_id}.`,
            old_values: { employer_id: mutation.employer_id, service_old_id: mutation.service_old_id, service_new_id: mutation.service_new_id, status: mutation.status },
        });

        res.status(200).json({
            message: 'Mutation supprimée avec succès (soft delete).'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la mutation :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la suppression de la mutation.',
            error: error.message
        });
    }
};

exports.confirmMutation = async (req, res) => {
    try {
        const { id } = req.params;
        const confirme_by = req.user.id;

        if (!confirme_by) {
            return res.status(400).json({ message: 'L\'ID de l\'utilisateur de confirmation (confirme_by) est requis.' });
        }

        const mutation = await EmployerMutation.findByPk(id, {
            include: [{ model: Employer, as: 'employer', attributes: ['nom', 'prenom'] }]
        });

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }
        if (mutation.status !== 'En attente') {
            return res.status(403).json({
                message: `Confirmation impossible ! La mutation est en statut "${mutation.status}".`
            });
        }
        // Vérification du statut pour éviter une double confirmation
        if (mutation.status === 'Validé' || mutation.is_confirme === 1) {
            return res.status(409).json({ message: 'Cette mutation est déjà confirmée/validée.' });
        }

        const updatedMutation = await mutation.update({
            status: 'Validé',
            is_confirme: 1,
            confirme_by: confirme_by,
            confirme_at: new Date(),
            arrivee_at: mutation.arrivee_at ?? moment().startOf('day').toDate(),
            last_update_by: confirme_by,
        });

        // Notification in-app : mutation confirmée
        try {
            const notifUserIds = [mutation.created_by].filter(Boolean);
            if (notifUserIds.length > 0) {
                await Notification.notifyUsers(notifUserIds, {
                    title: 'Mutation confirmée',
                    message: `La mutation de ${mutation.employer ? mutation.employer.nom : ''} ${mutation.employer ? mutation.employer.prenom : ''} a été validée.`,
                    type: 'mutation_confirmee',
                    link: '/mutations',
                });
            }
        } catch (notifErr) {
            console.error('Erreur envoi notification mutation_confirmee:', notifErr);
        }

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id: mutation.employer_id,
                type: 'mutation', sous_type: 'Validé',
                description: `Mutation validée (confirmée)`,
                details: { status: 'Validé', confirme_by, mutation_id: mutation.id },
                reference_id: mutation.id, reference_table: 'employer_mutations',
                created_by: confirme_by,
            });
        } catch (e) { console.error('History log mutation confirm:', e.message); }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: 'confirm',
            target_id: mutation.id,
            target_label: `Mutation #${mutation.id} confirmée`,
            description: `Mutation #${mutation.id} confirmée. Employé muté de service ${mutation.service_old_id} vers ${mutation.service_new_id}.`,
            new_values: { status: 'Validé', confirmed_by: req.user.id },
        });

        res.status(200).json({
            message: 'Mutation confirmée et validée avec succès.',
            data: updatedMutation
        });
    } catch (error) {
        console.error('Erreur lors de la confirmation de la mutation :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la confirmation de la mutation.',
            error: error.message
        });
    }
};

exports.rejectMutation = async (req, res) => {
    try {
        const { id } = req.params;
        // On utilise l'ID de l'utilisateur qui rejette (par exemple, depuis le token)
        const reject_by = req.user ? req.user.id : null;
        const now = new Date();
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);
        if (!reject_by) {
            return res.status(401).json({ message: 'Authentification requise pour rejeter une mutation.' });
        }

        const mutation = await EmployerMutation.findByPk(id, {
            include: [{ model: Employer, as: 'employer', attributes: ['nom', 'prenom'] }]
        });

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }

        if (mutation.status !== 'En attente') {
            return res.status(403).json({
                message: `Action impossible ! La mutation est en statut "${mutation.status}".`
            });
        }
        // On vérifie que la mutation n'est pas déjà dans un état terminal non modifiable (si nécessaire)
        // Par exemple, si elle est déjà 'Rejeté' ou si elle ne doit pas être rejetée si elle est 'Validé'
        if (mutation.status === 'Rejeté') {
            return res.status(409).json({ message: 'Cette mutation est déjà rejetée.' });
        }

        const result = await sequelize.transaction(async (t) => {

            // A. Mise à jour de l'état de la mutation
            const updatedMutation = await mutation.update(
                {
                    status: 'Rejeté',
                    reject_by: reject_by,
                    last_update_by: reject_by
                },
                { transaction: t }
            );

            const { employer_id, service_old_id, service_new_id } = updatedMutation;

            // B. Recherche de la ligne de navette pour le NOUVEAU service → supprimer
            const navetteLigne_to_delete = await NavetteLigne.findOne({
                where: {
                    employer_id: employer_id,
                    service_id: service_new_id,
                    periode_at: periode_at,
                },
                paranoid: false,
                transaction: t,
            });

            if (navetteLigne_to_delete) {
                await navetteLigne_to_delete.destroy({ transaction: t });
                console.log(`[Reject] Ligne Navette (nouveau service ${service_new_id}) pour employé ${employer_id} supprimée.`);
            }

            // C. Restaurer l'ancienne ligne navette : remettre mutation_out=0
            const navetteLigne_old = await NavetteLigne.findOne({
                where: {
                    employer_id: employer_id,
                    service_id: service_old_id,
                    periode_at: periode_at,
                },
                paranoid: true,
                transaction: t,
            });

            if (navetteLigne_old && navetteLigne_old.mutation_out === 1) {
                await navetteLigne_old.update(
                    { mutation_out: 0, is_mutation: 0 },
                    { transaction: t }
                );
                console.log(`[Reject] Ligne Navette ancienne (service ${service_old_id}) restaurée pour employé ${employer_id}.`);
            }

            return updatedMutation;
        });

        // Notification in-app : mutation rejetée
        try {
            const notifUserIds = [result.created_by].filter(Boolean);
            if (notifUserIds.length > 0) {
                await Notification.notifyUsers(notifUserIds, {
                    title: 'Mutation rejetée',
                    message: `La mutation de ${mutation.employer ? mutation.employer.nom : ''} ${mutation.employer ? mutation.employer.prenom : ''} a été rejetée.`,
                    type: 'mutation_rejetee',
                    link: '/mutations',
                });
            }
        } catch (notifErr) {
            console.error('Erreur envoi notification mutation_rejetee:', notifErr);
        }

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id: result.employer_id,
                type: 'mutation', sous_type: 'Rejeté',
                description: `Mutation rejetée`,
                details: { status: 'Rejeté', reject_by, mutation_id: result.id },
                reference_id: result.id, reference_table: 'employer_mutations',
                created_by: reject_by,
            });
        } catch (e) { console.error('History log mutation reject:', e.message); }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: 'reject',
            target_id: result.id,
            target_label: `Mutation #${result.id} rejetée`,
            description: `Mutation #${result.id} rejetée.`,
            new_values: { status: 'Rejeté'},
        });

        res.status(200).json({
            message: 'Mutation rejetée avec succès.',
            data: result
        });
    } catch (error) {
        console.error('Erreur lors du rejet de la mutation :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors du rejet de la mutation.',
            error: error.message
        });
    }
};

exports.cancelOrResetMutation = async (req, res) => {
    try {
        const { id } = req.params;
        const cancel_by = req.user ? req.user.id : null;

        if (!cancel_by) {
            return res.status(401).json({ message: 'Authentification requise pour annuler une mutation.' });
        }

        const mutation = await EmployerMutation.findByPk(id, {
            include: [{ model: Employer, as: 'employer', attributes: ['nom', 'prenom'] }]
        });

        if (!mutation) {
            return res.status(404).json({ message: 'Mutation non trouvée.' });
        }
        if (mutation.status !== 'En attente') {
            return res.status(403).json({
                message: `Action impossible ! La mutation est en statut "${mutation.status}".`
            });
        }
        const now = new Date();
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);
        const result = await sequelize.transaction(async (t) => {

            // A. Mise à jour de l'état de la mutation
            const updatedMutation = await mutation.update(
                {
                    status: 'Annulé',
                    cancel_by: cancel_by,
                    last_update_by: cancel_by
                },
                { transaction: t }
            );

            const { employer_id, service_old_id, service_new_id } = updatedMutation;

            // B. Recherche de la ligne de navette pour le NOUVEAU service → supprimer
            const navetteLigne_to_delete = await NavetteLigne.findOne({
                where: {
                    employer_id: employer_id,
                    service_id: service_new_id,
                    periode_at: periode_at,
                },
                paranoid: false,
                transaction: t,
            });

            if (navetteLigne_to_delete) {
                await navetteLigne_to_delete.destroy({ transaction: t });
                console.log(`[Cancel] Ligne Navette (nouveau service ${service_new_id}) pour employé ${employer_id} supprimée.`);
            }

            // C. Restaurer l'ancienne ligne navette : remettre mutation_out=0
            const navetteLigne_old = await NavetteLigne.findOne({
                where: {
                    employer_id: employer_id,
                    service_id: service_old_id,
                    periode_at: periode_at,
                },
                paranoid: true,
                transaction: t,
            });

            if (navetteLigne_old && navetteLigne_old.mutation_out === 1) {
                await navetteLigne_old.update(
                    { mutation_out: 0, is_mutation: 0 },
                    { transaction: t }
                );
                console.log(`[Cancel] Ligne Navette ancienne (service ${service_old_id}) restaurée pour employé ${employer_id}.`);
            }

            return updatedMutation;
        });

        // Notification in-app : mutation annulée
        try {
            const notifUserIds = [result.created_by].filter(Boolean);
            if (notifUserIds.length > 0) {
                await Notification.notifyUsers(notifUserIds, {
                    title: 'Mutation annulée',
                    message: `La mutation de ${mutation.employer ? mutation.employer.nom : ''} ${mutation.employer ? mutation.employer.prenom : ''} a été annulée.`,
                    type: 'mutation_annulee',
                    link: '/mutations',
                });
            }
        } catch (notifErr) {
            console.error('Erreur envoi notification mutation_annulee:', notifErr);
        }

        // Historique employé
        try {
            await EmployerHistory.logEvent({
                employer_id: result.employer_id,
                type: 'mutation', sous_type: 'Annulé',
                description: `Mutation annulée`,
                details: { status: 'Annulé', cancel_by, mutation_id: result.id },
                reference_id: result.id, reference_table: 'employer_mutations',
                created_by: cancel_by,
            });
        } catch (e) { console.error('History log mutation cancel:', e.message); }

        await ActivityLog.log(req, {
            module: 'mutation',
            action: result.status === 'Annulé' ? 'cancel' : 'reset',
            target_id: result.id,
            target_label: `Mutation #${result.id} ${result.status === 'Annulé' ? 'annulée' : 'réinitialisée'}`,
            description: `Mutation #${result.id} ${result.status === 'Annulé' ? 'annulée' : 'réinitialisée'}.`,
            new_values: { status: result.status },
        });

        res.status(200).json({
            message: 'Mutation annulée avec succès.',
            data: result
        });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de la mutation :', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de l\'annulation de la mutation.',
            error: error.message
        });
    }
};

// ─── EXPORT EXCEL ───
exports.exportMutationsToExcel = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');

        const mutations = await EmployerMutation.findAll({
            include: getIncludes(),
            order: [['created_at', 'DESC']],
            paranoid: true,
        });

        const wb = new ExcelJS.Workbook();
        wb.creator = 'ProNavette';
        wb.created = new Date();

        const ws = wb.addWorksheet('Mutations');

        ws.columns = [
            { header: '#',              key: 'id',              width: 8  },
            { header: 'Matricule',      key: 'matricule',       width: 14 },
            { header: 'Employé',        key: 'employe',         width: 28 },
            { header: 'Ancien Service', key: 'service_old',     width: 22 },
            { header: 'Nouveau Service',key: 'service_new',     width: 22 },
            { header: 'Cadre',          key: 'cadre',           width: 8  },
            { header: 'Période',        key: 'periode',         width: 12 },
            { header: 'Date Départ',    key: 'depart_at',       width: 14 },
            { header: 'Date Arrivée',   key: 'arrivee_at',      width: 14 },
            { header: 'Jours Trav.',    key: 'nb_jours_job',    width: 10 },
            { header: 'Jours Abs.',     key: 'nb_jour_abs',     width: 10 },
            { header: 'Acompte',        key: 'accompte',        width: 12 },
            { header: 'Prime Nuit',     key: 'prime_nuit',      width: 10 },
            { header: 'H.Sup 15%',      key: 'heure_sup_15',    width: 10 },
            { header: 'H.Sup 50%',      key: 'heure_sup_50',    width: 10 },
            { header: 'H.Sup 75%',      key: 'heure_sup_75',    width: 10 },
            { header: 'Statut',         key: 'status',          width: 12 },
            { header: 'Appliquée',      key: 'is_apply',        width: 10 },
            { header: 'Créé par',       key: 'created_by_name', width: 22 },
            { header: 'Date Création',  key: 'created_at',      width: 16 },
        ];

        // Style en‑tête
        ws.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF405189' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        ws.getRow(1).height = 22;
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
        const fmtMonth = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit' }) : '';

        mutations.forEach((m) => {
            ws.addRow({
                id: m.id,
                matricule: m.employer?.matricule || '',
                employe: `${m.employer?.nom || ''} ${m.employer?.prenom || ''}`.trim(),
                service_old: m.serviceOld?.name || '',
                service_new: m.serviceNew?.name || '',
                cadre: m.is_cadre ? 'OUI' : 'NON',
                periode: fmtMonth(m.periode_at),
                depart_at: fmtDate(m.depart_at),
                arrivee_at: fmtDate(m.arrivee_at),
                nb_jours_job: m.nb_jours_job || 0,
                nb_jour_abs: m.nb_jour_abs || 0,
                accompte: m.accompte || 0,
                prime_nuit: m.prime_nuit || 0,
                heure_sup_15: m.heure_sup_15 || 0,
                heure_sup_50: m.heure_sup_50 || 0,
                heure_sup_75: m.heure_sup_75 || 0,
                status: m.status,
                is_apply: m.is_apply ? 'Oui' : 'Non',
                created_by_name: m.createdby ? `${m.createdby.nom} ${m.createdby.prenom}` : '',
                created_at: fmtDate(m.created_at),
            });
        });

        const buffer = await wb.xlsx.writeBuffer();
        const filename = `mutations_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Erreur export Excel mutations:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'export Excel: ' + error.message,
        });
    }
};