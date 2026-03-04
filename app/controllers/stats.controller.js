// app/controllers/stats.controller.js
const db = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const Employer = db.Employer;
const EmployerAb = db.EmployerAb;
const EmployerAccompte = db.EmployerAccompte;
const EmployerHeure = db.EmployerHeure;
const EmployerPrime = db.EmployerPrime;
const EmployerPrimeNuit = db.EmployerPrimeNuit;
const EmployerMutation = db.EmployerMutation;
const NavetteLigne = db.NavetteLigne;
const Navette = db.Navette;
const Service = db.Service;

// ==========================================
// Utilitaire : construire le filtre de période
// ==========================================
const buildPeriodFilter = (query, dateField = 'created_at') => {
    const where = {};
    if (query.date_from && query.date_to) {
        where[dateField] = { [Op.between]: [new Date(query.date_from), new Date(query.date_to)] };
    } else if (query.date_from) {
        where[dateField] = { [Op.gte]: new Date(query.date_from) };
    } else if (query.date_to) {
        where[dateField] = { [Op.lte]: new Date(query.date_to) };
    }
    return where;
};

// ==========================================
// 1. STATISTIQUES DES ABSENCES
// ==========================================
exports.getAbsenceStats = async (req, res) => {
    try {
        const periodFilter = buildPeriodFilter(req.query);
        const { service_id, matricule } = req.query;

        // Filtre sur NavetteLigne pour service/matricule
        const ligneWhere = {};
        if (service_id) ligneWhere.service_id = service_id;

        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };

        // Totaux par type d'absence
        const byType = await EmployerAb.findAll({
            attributes: [
                'type_abs',
                [fn('COUNT', col('EmployerAb.id')), 'count'],
                [fn('SUM', col('EmployerAb.nb_jours')), 'total_jours'],
            ],
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: [],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [{
                    model: Employer,
                    as: 'employer',
                    attributes: [],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                }]
            }],
            group: ['type_abs'],
            raw: true,
        });

        // Totaux par mois
        const byMonth = await EmployerAb.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('EmployerAb.created_at'), '%Y-%m'), 'mois'],
                [fn('SUM', col('EmployerAb.nb_jours')), 'total_jours'],
                [fn('COUNT', col('EmployerAb.id')), 'count'],
            ],
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: [],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [{
                    model: Employer,
                    as: 'employer',
                    attributes: [],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                }]
            }],
            group: [fn('DATE_FORMAT', col('EmployerAb.created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('EmployerAb.created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Top employés absentéistes
        const topEmployees = await EmployerAb.findAll({
            attributes: [
                'employer_id',
                [col('employer.matricule'), 'matricule'],
                [col('employer.nom'), 'nom'],
                [col('employer.prenom'), 'prenom'],
                [fn('SUM', col('EmployerAb.nb_jours')), 'total_jours'],
                [fn('COUNT', col('EmployerAb.id')), 'count'],
            ],
            where: periodFilter,
            include: [{
                model: Employer,
                as: 'employer',
                attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: ['employer_id', 'employer.matricule', 'employer.nom', 'employer.prenom'],
            order: [[fn('SUM', col('EmployerAb.nb_jours')), 'DESC']],
            limit: 10,
            raw: true,
            subQuery: false,
        });

        // Détails (liste paginée)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const details = await EmployerAb.findAndCountAll({
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: ['id', 'service_id', 'periode_at'],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [
                    { model: Employer, as: 'employer', attributes: ['id', 'matricule', 'nom', 'prenom'], where: Object.keys(employerWhere).length ? employerWhere : undefined },
                    { model: Service, as: 'service', attributes: ['id', 'name'] },
                ]
            }],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });

        res.json({
            byType,
            byMonth,
            topEmployees,
            details: details.rows,
            totalCount: details.count,
            page,
            totalPages: Math.ceil(details.count / limit),
        });
    } catch (error) {
        console.error('Erreur stats absences:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des statistiques d\'absences: ' + error.message });
    }
};

// ==========================================
// 2. STATISTIQUES DES AVANCES SUR SALAIRE
// ==========================================
exports.getAccompteStats = async (req, res) => {
    try {
        const periodFilter = buildPeriodFilter(req.query);
        const { service_id, matricule } = req.query;

        const ligneWhere = {};
        if (service_id) ligneWhere.service_id = service_id;
        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };

        // Total global
        const totals = await EmployerAccompte.findAll({
            attributes: [
                [fn('COUNT', col('EmployerAccompte.id')), 'count'],
                [fn('SUM', col('somme')), 'total_somme'],
                [fn('AVG', col('somme')), 'avg_somme'],
            ],
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: [],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [{
                    model: Employer, as: 'employer', attributes: [],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                }]
            }],
            raw: true,
        });

        // Par mois
        const byMonth = await EmployerAccompte.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('EmployerAccompte.created_at'), '%Y-%m'), 'mois'],
                [fn('SUM', col('somme')), 'total_somme'],
                [fn('COUNT', col('EmployerAccompte.id')), 'count'],
            ],
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: [],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [{
                    model: Employer, as: 'employer', attributes: [],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                }]
            }],
            group: [fn('DATE_FORMAT', col('EmployerAccompte.created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('EmployerAccompte.created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Top employés
        const topEmployees = await EmployerAccompte.findAll({
            attributes: [
                'employer_id',
                [col('employer.matricule'), 'matricule'],
                [col('employer.nom'), 'nom'],
                [col('employer.prenom'), 'prenom'],
                [fn('SUM', col('somme')), 'total_somme'],
                [fn('COUNT', col('EmployerAccompte.id')), 'count'],
            ],
            where: periodFilter,
            include: [{
                model: Employer,
                as: 'employer',
                attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: ['employer_id', 'employer.matricule', 'employer.nom', 'employer.prenom'],
            order: [[fn('SUM', col('somme')), 'DESC']],
            limit: 10,
            raw: true,
            subQuery: false,
        });

        // Détails paginés
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const details = await EmployerAccompte.findAndCountAll({
            where: periodFilter,
            include: [{
                model: NavetteLigne,
                as: 'navette_ligne',
                attributes: ['id', 'service_id', 'periode_at'],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [
                    { model: Employer, as: 'employer', attributes: ['id', 'matricule', 'nom', 'prenom'], where: Object.keys(employerWhere).length ? employerWhere : undefined },
                    { model: Service, as: 'service', attributes: ['id', 'name'] },
                ]
            }],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });

        res.json({
            totals: totals[0],
            byMonth,
            topEmployees,
            details: details.rows,
            totalCount: details.count,
            page,
            totalPages: Math.ceil(details.count / limit),
        });
    } catch (error) {
        console.error('Erreur stats acomptes:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des statistiques d\'acomptes: ' + error.message });
    }
};

// ==========================================
// 3. STATISTIQUES DES DÉPARTS
// ==========================================
exports.getDepartStats = async (req, res) => {
    try {
        const { service_id, matricule, date_from, date_to } = req.query;

        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };
        if (service_id) employerWhere.service_id = service_id;
        // Filtre sur date_depart
        if (date_from && date_to) {
            employerWhere.date_depart = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            employerWhere.date_depart = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            employerWhere.date_depart = { [Op.lte]: new Date(date_to) };
        }
        // Seulement ceux qui ont un départ
        employerWhere.date_depart = { ...employerWhere.date_depart, [Op.ne]: null };

        // Par type de départ
        const byType = await Employer.findAll({
            attributes: [
                'type_depart',
                [fn('COUNT', col('id')), 'count'],
            ],
            where: employerWhere,
            group: ['type_depart'],
            raw: true,
        });

        // Par mois
        const byMonth = await Employer.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('date_depart'), '%Y-%m'), 'mois'],
                [fn('COUNT', col('id')), 'count'],
            ],
            where: employerWhere,
            group: [fn('DATE_FORMAT', col('date_depart'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('date_depart'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Par service
        const byService = await Employer.findAll({
            attributes: [
                [fn('COUNT', col('Employer.id')), 'count'],
            ],
            where: employerWhere,
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
            group: ['service_id'],
            raw: true,
        });

        // Total actifs vs partis
        const totalActifs = await Employer.count({ where: { date_depart: null } });
        const totalDeparts = await Employer.count({ where: { date_depart: { [Op.ne]: null } } });

        // Liste détaillée
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const details = await Employer.findAndCountAll({
            where: employerWhere,
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
            order: [['date_depart', 'DESC']],
            attributes: ['id', 'matricule', 'nom', 'prenom', 'date_depart', 'type_depart', 'service_id'],
            limit,
            offset,
        });

        res.json({
            byType,
            byMonth,
            byService,
            totalActifs,
            totalDeparts,
            tauxDepart: totalDeparts > 0 ? ((totalDeparts / (totalActifs + totalDeparts)) * 100).toFixed(2) : 0,
            details: details.rows,
            totalCount: details.count,
            page,
            totalPages: Math.ceil(details.count / limit),
        });
    } catch (error) {
        console.error('Erreur stats départs:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des statistiques de départs: ' + error.message });
    }
};

// ==========================================
// 4. STATISTIQUES HEURES SUP & NUIT
// ==========================================
exports.getHeuresStats = async (req, res) => {
    try {
        const { service_id, matricule, date_from, date_to } = req.query;

        const ligneWhere = {};
        if (service_id) ligneWhere.service_id = service_id;
        if (date_from && date_to) {
            ligneWhere.periode_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            ligneWhere.periode_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            ligneWhere.periode_at = { [Op.lte]: new Date(date_to) };
        }
        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };

        // Heures sup agrégées par période
        const heureSup = await NavetteLigne.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('NavetteLigne.periode_at'), '%Y-%m'), 'mois'],
                [fn('SUM', col('heure_sup_15')), 'total_hs15'],
                [fn('SUM', col('heure_sup_50')), 'total_hs50'],
                [fn('SUM', col('heure_sup_75')), 'total_hs75'],
            ],
            where: ligneWhere,
            include: [{
                model: Employer, as: 'employer', attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: [fn('DATE_FORMAT', col('NavetteLigne.periode_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('NavetteLigne.periode_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Primes de nuit par mois
        const primesNuit = await EmployerPrimeNuit.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('EmployerPrimeNuit.created_at'), '%Y-%m'), 'mois'],
                [fn('SUM', col('nb_jour')), 'total_jours_nuit'],
                [fn('COUNT', col('EmployerPrimeNuit.id')), 'count'],
            ],
            where: buildPeriodFilter(req.query),
            include: [{
                model: NavetteLigne, as: 'navette_ligne', attributes: [],
                where: Object.keys(ligneWhere).length ? ligneWhere : undefined,
                include: [{
                    model: Employer, as: 'employer', attributes: [],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                }]
            }],
            group: [fn('DATE_FORMAT', col('EmployerPrimeNuit.created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('EmployerPrimeNuit.created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Top employés heures sup
        const topHeureSup = await NavetteLigne.findAll({
            attributes: [
                'employer_id',
                [col('employer.matricule'), 'matricule'],
                [col('employer.nom'), 'nom'],
                [col('employer.prenom'), 'prenom'],
                [fn('SUM', literal('heure_sup_15 + heure_sup_50 + heure_sup_75')), 'total_heures'],
            ],
            where: ligneWhere,
            include: [{
                model: Employer, as: 'employer', attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: ['employer_id', 'employer.matricule', 'employer.nom', 'employer.prenom'],
            order: [[fn('SUM', literal('heure_sup_15 + heure_sup_50 + heure_sup_75')), 'DESC']],
            limit: 10,
            raw: true,
            subQuery: false,
        });

        res.json({
            heureSup,
            primesNuit,
            topHeureSup,
        });
    } catch (error) {
        console.error('Erreur stats heures:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des statistiques heures: ' + error.message });
    }
};

// ==========================================
// 5. STATISTIQUES DES MUTATIONS
// ==========================================
exports.getMutationStats = async (req, res) => {
    try {
        const { service_id, matricule, date_from, date_to } = req.query;

        const mutWhere = {};
        if (date_from && date_to) {
            mutWhere.created_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            mutWhere.created_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            mutWhere.created_at = { [Op.lte]: new Date(date_to) };
        }
        if (service_id) {
            mutWhere[Op.or] = [
                { service_old_id: service_id },
                { service_new_id: service_id },
            ];
        }

        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };

        // Par statut
        const byStatus = await EmployerMutation.findAll({
            attributes: [
                'status',
                [fn('COUNT', col('EmployerMutation.id')), 'count'],
            ],
            where: mutWhere,
            include: [{
                model: Employer, as: 'employer', attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: ['status'],
            raw: true,
        });

        // Par mois
        const byMonth = await EmployerMutation.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('EmployerMutation.created_at'), '%Y-%m'), 'mois'],
                [fn('COUNT', col('EmployerMutation.id')), 'count'],
            ],
            where: mutWhere,
            include: [{
                model: Employer, as: 'employer', attributes: [],
                where: Object.keys(employerWhere).length ? employerWhere : undefined,
            }],
            group: [fn('DATE_FORMAT', col('EmployerMutation.created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('EmployerMutation.created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        // Flux entre services (service_old → service_new)
        const flux = await EmployerMutation.findAll({
            attributes: [
                'service_old_id',
                'service_new_id',
                [fn('COUNT', col('EmployerMutation.id')), 'count'],
            ],
            where: { ...mutWhere, status: { [Op.in]: ['Validé', 'En attente'] } },
            include: [
                { model: Service, as: 'serviceOld', attributes: ['id', 'name'] },
                { model: Service, as: 'serviceNew', attributes: ['id', 'name'] },
                { model: Employer, as: 'employer', attributes: [], where: Object.keys(employerWhere).length ? employerWhere : undefined },
            ],
            group: ['service_old_id', 'service_new_id'],
            raw: true,
        });

        // Historique détaillé (paginé)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const details = await EmployerMutation.findAndCountAll({
            where: mutWhere,
            include: [
                { model: Employer, as: 'employer', attributes: ['id', 'matricule', 'nom', 'prenom'], where: Object.keys(employerWhere).length ? employerWhere : undefined },
                { model: Service, as: 'serviceOld', attributes: ['id', 'name'] },
                { model: Service, as: 'serviceNew', attributes: ['id', 'name'] },
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });

        res.json({
            byStatus,
            byMonth,
            flux,
            details: details.rows,
            totalCount: details.count,
            page,
            totalPages: Math.ceil(details.count / limit),
        });
    } catch (error) {
        console.error('Erreur stats mutations:', error);
        res.status(500).json({ message: 'Erreur lors du chargement des statistiques de mutations: ' + error.message });
    }
};

// ==========================================
// 6. TABLEAU DE BORD GLOBAL (dashboard)
// ==========================================
exports.getDashboard = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Mois précédent (pour calcul évolutions)
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // === Filtrage par service pour les non-admin/paie ===
        const { is_admin, is_superadmin, is_paie } = req.user;
        const isGlobal = is_admin || is_superadmin || is_paie;
        const svcId = !isGlobal ? req.user.service_id : null;

        // Filtres conditionnels par type de modèle
        const empFilter = svcId ? { service_id: svcId } : {};
        const navFilter = svcId ? { service_id: svcId } : {};
        const nlFilter = svcId ? { service_id: svcId } : {};
        const mutFilter = svcId ? { [Op.or]: [{ service_old_id: svcId }, { service_new_id: svcId }] } : {};

        // Pour modèles liés via employer_id (EmployerAb, EmployerAccompte, EmployerPrimeNuit)
        const empInclude = svcId
            ? [{ model: Employer, as: 'employer', where: { service_id: svcId }, attributes: [], required: true }]
            : [];

        const [
            totalEmployes,
            totalDeparts,
            totalMutationsMois,
            totalMutationsMoisPrecedent,
            totalAbsencesMois,
            totalAbsencesMoisPrecedent,
            totalJoursAbsMois,
            totalAccomptesMois,
            totalAccomptesMoisPrecedent,
            navettesEnCours,
            navettesTerminees,
            navettesTotal,
            totalMutationsEnAttente,
            totalMutationsValidees,
            totalMutationsRejetees,
            totalHeureSup15Mois,
            totalHeureSup50Mois,
            totalHeureSup75Mois,
            totalPrimesNuitMois,
            departsMois,
            topAbsents,
            recentMutations,
        ] = await Promise.all([
            Employer.count({ where: { date_depart: null, ...empFilter } }),
            Employer.count({ where: { date_depart: { [Op.ne]: null }, ...empFilter } }),
            EmployerMutation.count({ where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] }, ...mutFilter } }),
            EmployerMutation.count({ where: { created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] }, ...mutFilter } }),
            EmployerAb.count({ where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }, include: empInclude }),
            EmployerAb.count({ where: { created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] } }, include: empInclude }),
            EmployerAb.sum('nb_jours', { where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }, include: empInclude }),
            EmployerAccompte.sum('somme', { where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }, include: empInclude }),
            EmployerAccompte.sum('somme', { where: { created_at: { [Op.between]: [startOfLastMonth, endOfLastMonth] } }, include: empInclude }),
            Navette.count({ where: { status: { [Op.ne]: 'Terminé' }, ...navFilter } }),
            Navette.count({ where: { status: 'Terminé', ...navFilter } }),
            Navette.count({ where: navFilter }),
            EmployerMutation.count({ where: { status: 'En attente', ...mutFilter } }),
            EmployerMutation.count({ where: { status: 'Validé', ...mutFilter } }),
            EmployerMutation.count({ where: { status: 'Rejeté', ...mutFilter } }),
            NavetteLigne.sum('heure_sup_15', { where: { periode_at: { [Op.between]: [startOfMonth, endOfMonth] }, ...nlFilter } }),
            NavetteLigne.sum('heure_sup_50', { where: { periode_at: { [Op.between]: [startOfMonth, endOfMonth] }, ...nlFilter } }),
            NavetteLigne.sum('heure_sup_75', { where: { periode_at: { [Op.between]: [startOfMonth, endOfMonth] }, ...nlFilter } }),
            EmployerPrimeNuit.sum('nb_jour', { where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } }, include: empInclude }),
            Employer.count({ where: { date_depart: { [Op.between]: [startOfMonth, endOfMonth] }, ...empFilter } }),

            // Top 5 employés les plus absents ce mois
            EmployerAb.findAll({
                attributes: [
                    'employer_id',
                    [fn('SUM', col('EmployerAb.nb_jours')), 'total_jours'],
                    [fn('COUNT', col('EmployerAb.id')), 'nb_absences'],
                ],
                where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } },
                include: [{
                    model: Employer, as: 'employer',
                    attributes: ['matricule', 'nom', 'prenom'],
                    where: { ...empFilter },
                    required: true,
                }],
                group: ['employer_id', 'employer.id', 'employer.matricule', 'employer.nom', 'employer.prenom'],
                order: [[fn('SUM', col('EmployerAb.nb_jours')), 'DESC']],
                limit: 5,
                raw: true,
                subQuery: false,
            }),

            // 5 dernières mutations
            EmployerMutation.findAll({
                attributes: ['id', 'status', 'created_at'],
                where: { ...mutFilter },
                include: [
                    { model: Employer, as: 'employer', attributes: ['matricule', 'nom', 'prenom'] },
                    { model: Service, as: 'serviceOld', attributes: ['name'] },
                    { model: Service, as: 'serviceNew', attributes: ['name'] },
                ],
                order: [['created_at', 'DESC']],
                limit: 5,
            }),
        ]);

        // Calcul évolutions (%)
        const evolMutations = totalMutationsMoisPrecedent > 0
            ? (((totalMutationsMois - totalMutationsMoisPrecedent) / totalMutationsMoisPrecedent) * 100).toFixed(1)
            : totalMutationsMois > 0 ? 100 : 0;
        const evolAbsences = totalAbsencesMoisPrecedent > 0
            ? (((totalAbsencesMois - totalAbsencesMoisPrecedent) / totalAbsencesMoisPrecedent) * 100).toFixed(1)
            : totalAbsencesMois > 0 ? 100 : 0;
        const evolAccomptes = totalAccomptesMoisPrecedent > 0
            ? ((((totalAccomptesMois || 0) - (totalAccomptesMoisPrecedent || 0)) / totalAccomptesMoisPrecedent) * 100).toFixed(1)
            : (totalAccomptesMois || 0) > 0 ? 100 : 0;

        const totalEffectif = totalEmployes + totalDeparts;
        const tauxDepart = totalEffectif > 0 ? ((totalDeparts / totalEffectif) * 100).toFixed(2) : 0;

        res.json({
            // Contexte
            isFiltered: !!svcId,
            serviceName: svcId ? req.user.service : null,

            // Effectifs
            totalEmployes,
            totalDeparts,
            tauxDepart,
            departsMois,

            // Navettes
            navettesEnCours,
            navettesTerminees,
            navettesTotal,

            // Mutations (mois en cours)
            totalMutationsMois,
            totalMutationsEnAttente,
            totalMutationsValidees,
            totalMutationsRejetees,
            evolMutations,

            // Absences (mois en cours)
            totalAbsencesMois,
            totalJoursAbsMois: totalJoursAbsMois || 0,
            evolAbsences,

            // Avances (mois en cours)
            totalAccomptesMois: totalAccomptesMois || 0,
            evolAccomptes,

            // Heures sup (mois en cours)
            totalHeureSup15Mois: totalHeureSup15Mois || 0,
            totalHeureSup50Mois: totalHeureSup50Mois || 0,
            totalHeureSup75Mois: totalHeureSup75Mois || 0,
            totalHeureSupMois: (totalHeureSup15Mois || 0) + (totalHeureSup50Mois || 0) + (totalHeureSup75Mois || 0),

            // Primes nuit
            totalPrimesNuitMois: totalPrimesNuitMois || 0,

            // Enrichissements
            topAbsents: (topAbsents || []).map(r => ({
                matricule: r['employer.matricule'] || r.matricule,
                nom: r['employer.nom'] || r.nom,
                prenom: r['employer.prenom'] || r.prenom,
                total_jours: parseInt(r.total_jours) || 0,
                nb_absences: parseInt(r.nb_absences) || 0,
            })),
            recentMutations: (recentMutations || []).map(m => ({
                id: m.id,
                status: m.status,
                created_at: m.created_at,
                employe: m.employer ? `${m.employer.nom} ${m.employer.prenom}` : '—',
                matricule: m.employer ? m.employer.matricule : '—',
                de: m.serviceOld ? m.serviceOld.name : '—',
                vers: m.serviceNew ? m.serviceNew.name : '—',
            })),

            // Période
            moisCourant: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        });
    } catch (error) {
        console.error('Erreur dashboard:', error);
        res.status(500).json({ message: 'Erreur dashboard: ' + error.message });
    }
};
