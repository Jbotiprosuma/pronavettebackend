// app/controllers/campagne.controller.js
const db = require('../models');
const { Op } = require('sequelize');
const Campagne = db.Campagne;
const Navette = db.Navette;
const NavetteLigne = db.NavetteLigne;
const Service = db.Service;
const Employer = db.Employer;
const User = db.User;
const Notification = db.Notification;
const EmployerAb = db.EmployerAb;
const EmployerAccompte = db.EmployerAccompte;
const EmployerHeure = db.EmployerHeure;
const EmployerPrime = db.EmployerPrime;
const EmployerPrimeNuit = db.EmployerPrimeNuit;
const ActivityLog = db.ActivityLog;
const { sendCampagneLaunchedEmail } = require('../services/email.service');

const MOIS_NOMS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ── Inclusion navettes ──
const includeNavetteAssociations = () => [
    { model: Service, as: 'service', attributes: ['id', 'name'] },
];

/**
 * Logique d'exécution d'une campagne (créer les navettes pour tous les services)
 * Utilisée par le lancement manuel ET par le cron auto-launch
 */
const executeCampagne = async (campagne, userId) => {
    const mois = campagne.mois;
    const annee = campagne.annee;
    const periode_at = new Date(annee, mois - 1, 1);
    const periode_debut_at = campagne.periode_debut_at;
    const periode_fin_at = campagne.periode_fin_at;

    const services = await Service.findAll({ attributes: ['id', 'name'] });
    const navettesCreated = [];

    for (const service of services) {
        let navette = await Navette.findOne({
            where: { service_id: service.id, periode_at },
            paranoid: true
        });

        if (!navette) {
            navette = await Navette.create({
                name: `Etat Navette ${service.name} ${mois} ${annee}`,
                service_id: service.id,
                periode_at,
                periode_debut_at,
                periode_fin_at,
                date_creation: new Date(),
                created_by: userId,
                created_at: new Date(),
                updated_at: new Date()
            });

            const employers = await Employer.findAll({
                where: { service_id: service.id, date_depart: null },
                attributes: ['id', 'is_cadre']
            });

            const navetteLigneData = employers.map(employer => ({
                employer_id: employer.id,
                navette_id: navette.id,
                service_id: service.id,
                status: employer.is_cadre ? 'Cadre' : 'Non cadre',
                created_by: userId,
                periode_at,
                created_at: new Date(),
                updated_at: new Date()
            }));

            if (navetteLigneData.length > 0) {
                await NavetteLigne.bulkCreate(navetteLigneData);
            }
        }

        navettesCreated.push(navette);
    }

    // Mettre à jour la campagne
    await campagne.update({
        status: 'active',
        is_executed: true,
        executed_at: new Date(),
    });

    // Notifications
    const periodeLabel = `${MOIS_NOMS[mois - 1]} ${annee}`;
    const dateDebutFormatted = periode_debut_at ? new Date(periode_debut_at).toLocaleDateString('fr-FR') : 'N/A';
    const dateFinFormatted = periode_fin_at ? new Date(periode_fin_at).toLocaleDateString('fr-FR') : 'N/A';

    try {
        const allUsers = await User.findAll({
            where: {
                [Op.or]: [
                    { is_manager: true }, { is_representant: true },
                    { is_paie: true }, { is_admin: true }, { is_superadmin: true },
                ]
            },
            attributes: ['id', 'email'],
        });

        const allUserIds = allUsers.map(u => u.id);
        const allEmails = allUsers.filter(u => u.email).map(u => u.email);

        await Notification.notifyUsers(allUserIds, {
            title: 'Nouvelle campagne navette lancée',
            message: `La campagne navette pour ${periodeLabel} a été lancée. Période du ${dateDebutFormatted} au ${dateFinFormatted}.`,
            type: 'navette_lancee',
            link: '/navette/service',
        });

        await sendCampagneLaunchedEmail(allEmails, {
            periodeLabel,
            dateDebut: dateDebutFormatted,
            dateFin: dateFinFormatted,
            action: 'lancée',
        });
    } catch (notifErr) {
        console.error('Erreur envoi notification campagne:', notifErr);
    }

    return navettesCreated;
};

// ══════════════════════════════════════════════
// Lister toutes les campagnes (programmées + exécutées)
// ══════════════════════════════════════════════
exports.listAll = async (req, res) => {
    try {
        const campagnes = await Campagne.findAll({
            order: [['annee', 'DESC'], ['mois', 'DESC']],
            include: [{ model: User, as: 'creator', attributes: ['id', 'email'] }],
        });

        // Pour chaque campagne exécutée, enrichir avec les données navettes
        const result = [];
        for (const camp of campagnes) {
            const data = camp.toJSON();

            if (camp.is_executed) {
                const periode_at = new Date(camp.annee, camp.mois - 1, 1);
                const navettes = await Navette.findAll({
                    where: { periode_at },
                    include: includeNavetteAssociations(),
                    attributes: ['id', 'name', 'code', 'service_id', 'periode_at', 'periode_debut_at', 'periode_fin_at', 'status', 'etat', 'date_creation', 'created_at'],
                });

                const statusCounts = { 'En attente': 0, 'En cours': 0, 'bloqué': 0, 'Terminé': 0 };
                navettes.forEach(n => { if (statusCounts[n.status] !== undefined) statusCounts[n.status]++; });

                // Vérifier les saisies
                const navetteIds = navettes.map(n => n.id);
                let totalSaisies = 0;
                let isDeletable = true;

                if (navetteIds.length > 0) {
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
                    totalSaisies = absCount + acompteCount + heureCount + primeCount + primeNuitCount;
                    const hasStatusChange = navettes.some(n => n.status !== 'En attente');
                    isDeletable = totalSaisies === 0 && !hasStatusChange;
                }

                data.navettes = navettes.map(n => ({
                    id: n.id, name: n.name, code: n.code,
                    status: n.status, etat: n.etat, service: n.service,
                }));
                data.totalServices = navettes.length;
                data.statusCounts = statusCounts;
                data.totalSaisies = totalSaisies;
                data.isDeletable = isDeletable;
            } else {
                data.navettes = [];
                data.totalServices = 0;
                data.statusCounts = { 'En attente': 0, 'En cours': 0, 'bloqué': 0, 'Terminé': 0 };
                data.totalSaisies = 0;
                data.isDeletable = true;
            }

            result.push(data);
        }

        res.json({ message: 'Campagnes récupérées avec succès.', data: result });
    } catch (error) {
        console.error('Erreur listAll campagnes:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des campagnes: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Statut du mois courant (pour savoir si on peut lancer)
// ══════════════════════════════════════════════
exports.currentMonthStatus = async (req, res) => {
    try {
        const now = new Date();
        const mois = now.getMonth() + 1;
        const annee = now.getFullYear();

        const campagne = await Campagne.findOne({
            where: { mois, annee },
        });

        res.json({
            data: {
                hasActiveCampagne: !!campagne && (campagne.status === 'active' || campagne.status === 'terminee'),
                hasScheduledCampagne: !!campagne && campagne.status === 'programmee',
                campagne: campagne || null,
            }
        });
    } catch (error) {
        console.error('Erreur currentMonthStatus:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Lancer manuellement une campagne (mois courant)
// ══════════════════════════════════════════════
exports.launch = async (req, res) => {
    try {
        const { periode_debut_at, periode_fin_at } = req.body;
        const user_id = req.user.id;

        if (!periode_debut_at || !periode_fin_at) {
            return res.status(400).json({ message: 'Les dates de début et de fin sont obligatoires.' });
        }
        if (new Date(periode_debut_at) > new Date(periode_fin_at)) {
            return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin.' });
        }

        const now = new Date();
        const mois = now.getMonth() + 1;
        const annee = now.getFullYear();

        // Vérifier si une campagne existe déjà pour ce mois
        let campagne = await Campagne.findOne({
            where: { mois, annee, status: { [Op.in]: ['active', 'terminee'] } },
        });
        if (campagne) {
            return res.status(400).json({
                message: `Une campagne a déjà été lancée pour ${MOIS_NOMS[mois - 1]} ${annee}. Une seule campagne par mois est autorisée.`
            });
        }

        // Vérifier si une campagne programmée existe → la réutiliser
        campagne = await Campagne.findOne({
            where: { mois, annee, status: 'programmee' },
        });

        if (campagne) {
            // Mettre à jour les dates si fournies
            await campagne.update({
                periode_debut_at,
                periode_fin_at,
            });
        } else {
            // Créer la campagne
            campagne = await Campagne.create({
                mois,
                annee,
                periode_debut_at,
                periode_fin_at,
                status: 'programmee', // sera passée à 'active' par executeCampagne
                is_executed: false,
                created_by: user_id,
            });
        }

        // Exécuter (créer les navettes)
        const navettesCreated = await executeCampagne(campagne, user_id);

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'launch',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[mois - 1]} ${annee}`,
            description: `Lancement de la campagne ${MOIS_NOMS[mois - 1]} ${annee}. ${navettesCreated.length} navette(s) créée(s).`,
            new_values: { periode_debut_at, periode_fin_at, navettes_count: navettesCreated.length },
        });

        res.status(200).json({
            message: `Campagne ${MOIS_NOMS[mois - 1]} ${annee} lancée avec succès.`,
            data: navettesCreated,
            campagne,
        });
    } catch (error) {
        console.error('Erreur launch campagne:', error);
        res.status(500).json({ message: 'Erreur lors du lancement: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Programmer une ou plusieurs campagnes futures
// ══════════════════════════════════════════════
exports.schedule = async (req, res) => {
    try {
        const { moisList, periode_debut_jour, periode_fin_jour } = req.body;
        // moisList: tableau de numéros de mois (ex: [3, 4, 5])
        // periode_debut_jour: jour du mois pour le début (ex: 1)
        // periode_fin_jour: jour du mois pour la fin (ex: 25)
        const user_id = req.user.id;

        if (!moisList || !Array.isArray(moisList) || moisList.length === 0) {
            return res.status(400).json({ message: 'Veuillez sélectionner au moins un mois.' });
        }
        if (!periode_debut_jour || !periode_fin_jour) {
            return res.status(400).json({ message: 'Les jours de début et fin de période sont obligatoires.' });
        }

        const now = new Date();
        const anneeCourante = now.getFullYear();
        const moisCourant = now.getMonth() + 1;

        const created = [];
        const errors = [];

        for (const mois of moisList) {
            // Validation: mois dans l'année courante et pas antérieur
            if (mois < 1 || mois > 12) {
                errors.push(`Mois ${mois} invalide.`);
                continue;
            }
            if (mois < moisCourant) {
                errors.push(`${MOIS_NOMS[mois - 1]} est passé, impossible de programmer.`);
                continue;
            }

            // Vérifier si une campagne existe déjà pour ce mois
            const existing = await Campagne.findOne({
                where: { mois, annee: anneeCourante },
            });

            if (existing) {
                if (existing.status === 'active' || existing.status === 'terminee') {
                    errors.push(`${MOIS_NOMS[mois - 1]} a déjà une campagne active/terminée.`);
                } else if (existing.status === 'programmee') {
                    errors.push(`${MOIS_NOMS[mois - 1]} a déjà une campagne programmée.`);
                } else if (existing.status === 'desactivee') {
                    // Réactiver
                    const debutDate = new Date(anneeCourante, mois - 1, periode_debut_jour);
                    const lastDay = new Date(anneeCourante, mois, 0).getDate();
                    const finJour = Math.min(periode_fin_jour, lastDay);
                    const finDate = new Date(anneeCourante, mois - 1, finJour);

                    await existing.update({
                        status: 'programmee',
                        periode_debut_at: debutDate.toISOString().split('T')[0],
                        periode_fin_at: finDate.toISOString().split('T')[0],
                        is_executed: false,
                        executed_at: null,
                    });
                    created.push(existing);
                }
                continue;
            }

            // Calculer les dates
            const debutDate = new Date(anneeCourante, mois - 1, periode_debut_jour);
            const lastDay = new Date(anneeCourante, mois, 0).getDate();
            const finJour = Math.min(periode_fin_jour, lastDay);
            const finDate = new Date(anneeCourante, mois - 1, finJour);

            const campagne = await Campagne.create({
                mois,
                annee: anneeCourante,
                periode_debut_at: debutDate.toISOString().split('T')[0],
                periode_fin_at: finDate.toISOString().split('T')[0],
                status: 'programmee',
                is_executed: false,
                created_by: user_id,
            });

            created.push(campagne);
        }

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'schedule',
            target_id: null,
            target_label: `${created.length} campagne(s)`,
            description: `Programmation de ${created.length} campagne(s). Mois: ${moisList.join(', ')}. Jours: ${periode_debut_jour}-${periode_fin_jour}.`,
            new_values: { moisList, periode_debut_jour, periode_fin_jour, created_count: created.length },
        });

        res.json({
            message: `${created.length} campagne(s) programmée(s) avec succès.${errors.length > 0 ? ' Erreurs: ' + errors.join(' ') : ''}`,
            data: created,
            errors,
        });
    } catch (error) {
        console.error('Erreur schedule campagne:', error);
        res.status(500).json({ message: 'Erreur lors de la programmation: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Modifier une campagne programmée
// ══════════════════════════════════════════════
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { periode_debut_at, periode_fin_at } = req.body;

        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });

        if (campagne.is_executed) {
            return res.status(400).json({ message: 'Cette campagne a déjà été exécutée et ne peut plus être modifiée par ici.' });
        }

        const updates = {};
        if (periode_debut_at) updates.periode_debut_at = periode_debut_at;
        if (periode_fin_at) updates.periode_fin_at = periode_fin_at;

        if (updates.periode_debut_at && updates.periode_fin_at) {
            if (new Date(updates.periode_debut_at) > new Date(updates.periode_fin_at)) {
                return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin.' });
            }
        }

        const oldDebutAt = campagne.periode_debut_at;
        const oldFinAt = campagne.periode_fin_at;
        await campagne.update(updates);

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'update',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Modification de la campagne programmée ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}.`,
            old_values: { periode_debut_at: oldDebutAt, periode_fin_at: oldFinAt },
            new_values: updates,
        });

        res.json({ message: 'Campagne programmée mise à jour.', data: campagne });
    } catch (error) {
        console.error('Erreur update campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Supprimer une campagne programmée (non exécutée)
// ══════════════════════════════════════════════
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });

        if (campagne.is_executed) {
            return res.status(400).json({ message: 'Impossible de supprimer une campagne déjà exécutée.' });
        }

        await campagne.destroy({ force: true });

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'delete',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Suppression de la campagne programmée ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}.`,
        });

        res.json({ message: 'Campagne programmée supprimée.' });
    } catch (error) {
        console.error('Erreur remove campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Activer / Désactiver une campagne programmée
// ══════════════════════════════════════════════
exports.toggle = async (req, res) => {
    try {
        const { id } = req.params;
        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });

        if (campagne.is_executed) {
            return res.status(400).json({ message: 'Impossible de modifier le statut d\'une campagne déjà exécutée.' });
        }

        const newStatus = campagne.status === 'programmee' ? 'desactivee' : 'programmee';
        await campagne.update({ status: newStatus });

        await ActivityLog.log(req, {
            module: 'campagne',
            action: newStatus === 'programmee' ? 'activate' : 'deactivate',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Campagne ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee} ${newStatus === 'programmee' ? 'activée' : 'désactivée'}.`,
            new_values: { status: newStatus },
        });

        res.json({
            message: `Campagne ${newStatus === 'programmee' ? 'activée' : 'désactivée'} avec succès.`,
            data: campagne,
        });
    } catch (error) {
        console.error('Erreur toggle campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Supprimer une campagne exécutée (avec ses navettes) - même logique que l'ancien deleteCampagne
// ══════════════════════════════════════════════
exports.deleteExecuted = async (req, res) => {
    try {
        const { id } = req.params;
        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });

        if (!campagne.is_executed) {
            return res.status(400).json({ message: 'Utilisez la route de suppression standard pour les campagnes non exécutées.' });
        }

        const periode_at = new Date(campagne.annee, campagne.mois - 1, 1);
        const navettes = await Navette.findAll({ where: { periode_at } });
        const navetteIds = navettes.map(n => n.id);

        if (navetteIds.length > 0) {
            const ligneIds = await NavetteLigne.findAll({
                where: { navette_id: { [Op.in]: navetteIds } },
                attributes: ['id'], raw: true,
            }).then(r => r.map(l => l.id));

            const [absCount, acompteCount, heureCount, primeCount, primeNuitCount] = await Promise.all([
                EmployerAb.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
                EmployerAccompte.count({ where: { navette_id: { [Op.in]: navetteIds } } }),
                ligneIds.length > 0 ? EmployerHeure.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
                ligneIds.length > 0 ? EmployerPrime.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
                ligneIds.length > 0 ? EmployerPrimeNuit.count({ where: { navette_ligne_id: { [Op.in]: ligneIds } } }) : 0,
            ]);
            const totalSaisies = absCount + acompteCount + heureCount + primeCount + primeNuitCount;
            const hasStatusChange = navettes.some(n => n.status !== 'En attente');

            if (totalSaisies > 0 || hasStatusChange) {
                return res.status(400).json({
                    message: `Impossible de supprimer. ${totalSaisies} saisie(s) effectuée(s) et/ou des navettes ont changé de statut.`,
                    totalSaisies, hasStatusChange,
                });
            }

            // Supprimer les lignes puis les navettes
            if (ligneIds.length > 0) {
                await NavetteLigne.destroy({ where: { navette_id: { [Op.in]: navetteIds } }, force: true });
            }
            await Navette.destroy({ where: { periode_at }, force: true });
        }

        // Supprimer la campagne
        await campagne.destroy({ force: true });

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'delete_executed',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Suppression de la campagne exécutée ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee} et ${navettes.length} navette(s).`,
        });

        res.json({
            message: `Campagne et ${navettes.length} navette(s) supprimées avec succès.`,
        });
    } catch (error) {
        console.error('Erreur deleteExecuted campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Prolonger une campagne exécutée
// ══════════════════════════════════════════════
exports.extend = async (req, res) => {
    try {
        const { id } = req.params;
        const { nouvelle_date_fin } = req.body;
        const user_id = req.user.id;

        if (!nouvelle_date_fin) {
            return res.status(400).json({ message: 'La nouvelle date de fin est obligatoire.' });
        }

        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });
        if (!campagne.is_executed) return res.status(400).json({ message: 'Seules les campagnes exécutées peuvent être prolongées.' });

        const nouvelleFin = new Date(nouvelle_date_fin);

        // Vérifier que la nouvelle date est postérieure à l'ancienne
        if (campagne.periode_fin_at && nouvelleFin <= new Date(campagne.periode_fin_at)) {
            return res.status(400).json({
                message: `La nouvelle date de fin (${nouvelleFin.toLocaleDateString('fr-FR')}) doit être postérieure à la date actuelle (${new Date(campagne.periode_fin_at).toLocaleDateString('fr-FR')}).`
            });
        }

        // Vérifier que la nouvelle date est dans le même mois que la campagne
        if (nouvelleFin.getMonth() + 1 !== campagne.mois || nouvelleFin.getFullYear() !== campagne.annee) {
            return res.status(400).json({
                message: `La prolongation doit rester dans le mois de la campagne (${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}).`
            });
        }

        const periode_at = new Date(campagne.annee, campagne.mois - 1, 1);

        // Mettre à jour les navettes
        await Navette.update(
            { periode_fin_at: nouvelleFin, last_update_by: user_id },
            { where: { periode_at }, individualHooks: false }
        );

        // Débloquer les navettes bloquées
        await Navette.update(
            { status: 'En cours' },
            { where: { periode_at, status: 'bloqué' }, individualHooks: false }
        );

        // Mettre à jour la campagne
        const oldFinAt = campagne.periode_fin_at;
        await campagne.update({ periode_fin_at: nouvelle_date_fin });

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'extend',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Prolongation de la campagne ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee} jusqu'au ${nouvelleFin.toLocaleDateString('fr-FR')}.`,
            old_values: { periode_fin_at: oldFinAt },
            new_values: { periode_fin_at: nouvelle_date_fin },
        });

        res.json({
            message: `Campagne prolongée jusqu'au ${nouvelleFin.toLocaleDateString('fr-FR')}.`,
        });
    } catch (error) {
        console.error('Erreur extend campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ══════════════════════════════════════════════
// Modifier les dates d'une campagne exécutée
// ══════════════════════════════════════════════
exports.updateDates = async (req, res) => {
    try {
        const { id } = req.params;
        const { nouvelle_date_debut, nouvelle_date_fin } = req.body;
        const user_id = req.user.id;

        if (!nouvelle_date_debut && !nouvelle_date_fin) {
            return res.status(400).json({ message: 'Veuillez fournir au moins une date à modifier.' });
        }

        const campagne = await Campagne.findByPk(id);
        if (!campagne) return res.status(404).json({ message: 'Campagne introuvable.' });
        if (!campagne.is_executed) return res.status(400).json({ message: 'Seules les campagnes exécutées peuvent avoir leurs dates modifiées ici.' });

        const periode_at = new Date(campagne.annee, campagne.mois - 1, 1);
        const navettes = await Navette.findAll({ where: { periode_at } });

        if (navettes.length === 0) {
            return res.status(404).json({ message: 'Aucune navette trouvée pour cette campagne.' });
        }

        const allTerminees = navettes.every(n => n.status === 'Terminé');
        if (allTerminees) {
            return res.status(400).json({ message: 'Cette campagne est terminée et ne peut plus être modifiée.' });
        }

        // Bloquer la MODIFICATION si au moins un service a déjà fait avancer son état navette
        // (statut différent de "En attente" = le service a interagi avec sa navette)
        const hasStartedNavette = navettes.some(n => n.status !== 'En attente');
        if (hasStartedNavette) {
            const nbStarted = navettes.filter(n => n.status !== 'En attente').length;
            return res.status(400).json({
                message: `Impossible de modifier les deux dates. ${nbStarted} service(s) ont déjà commencé à saisir leur état navette. Utilisez la prolongation pour modifier uniquement la date de fin.`,
            });
        }

        // Construire les champs à mettre à jour
        const updateFields = { last_update_by: user_id };
        const campagneUpdate = {};

        if (nouvelle_date_debut) {
            updateFields.periode_debut_at = new Date(nouvelle_date_debut);
            campagneUpdate.periode_debut_at = nouvelle_date_debut;
        }
        if (nouvelle_date_fin) {
            updateFields.periode_fin_at = new Date(nouvelle_date_fin);
            campagneUpdate.periode_fin_at = nouvelle_date_fin;
        }

        // Valider cohérence
        const dateDebut = nouvelle_date_debut ? new Date(nouvelle_date_debut) : new Date(campagne.periode_debut_at);
        const dateFin = nouvelle_date_fin ? new Date(nouvelle_date_fin) : new Date(campagne.periode_fin_at);
        if (dateDebut > dateFin) {
            return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin.' });
        }

        await Navette.update(updateFields, { where: { periode_at }, individualHooks: false });

        // Débloquer si prolongation
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (dateFin >= today) {
            await Navette.update({ status: 'En cours' }, { where: { periode_at, status: 'bloqué' }, individualHooks: false });
        }

        const oldDebutAt = campagne.periode_debut_at;
        const oldFinAt = campagne.periode_fin_at;
        if (Object.keys(campagneUpdate).length > 0) {
            await campagne.update(campagneUpdate);
        }

        await ActivityLog.log(req, {
            module: 'campagne',
            action: 'update_dates',
            target_id: campagne.id,
            target_label: `${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}`,
            description: `Modification des dates de la campagne ${MOIS_NOMS[campagne.mois - 1]} ${campagne.annee}. ${navettes.length} navette(s) mises à jour.`,
            old_values: { periode_debut_at: oldDebutAt, periode_fin_at: oldFinAt },
            new_values: campagneUpdate,
        });

        res.json({
            message: `Dates mises à jour. ${navettes.length} navette(s) modifiée(s).`,
        });
    } catch (error) {
        console.error('Erreur updateDates campagne:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// Exporter executeCampagne pour le cron
exports.executeCampagne = executeCampagne;
