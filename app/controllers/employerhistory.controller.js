// app/controllers/employerhistory.controller.js
const db = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const EmployerHistory = db.EmployerHistory;
const Employer = db.Employer;
const Service = db.Service;

// ==========================================
// 1. Historique d'un employé (avec filtres)
// ==========================================
exports.getEmployerHistory = async (req, res) => {
    try {
        const { employer_id } = req.params;
        const { type, sous_type, date_from, date_to, page: p, limit: l } = req.query;

        const page = parseInt(p) || 1;
        const limit = parseInt(l) || 30;
        const offset = (page - 1) * limit;

        // Vérifier que l'employé existe
        const employer = await Employer.findByPk(employer_id, {
            attributes: ['id', 'matricule', 'nom', 'prenom', 'service_id'],
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
        });

        if (!employer) {
            return res.status(404).json({ message: 'Employé introuvable.' });
        }

        // Construire le filtre
        const where = { employer_id };

        if (type) where.type = type;
        if (sous_type) where.sous_type = { [Op.like]: `%${sous_type}%` };

        if (date_from && date_to) {
            where.periode_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            where.periode_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            where.periode_at = { [Op.lte]: new Date(date_to) };
        }

        // Récupérer l'historique paginé
        const { rows, count } = await EmployerHistory.findAndCountAll({
            where,
            include: [
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                { model: db.User, as: 'creator', attributes: ['id', 'nom', 'prenom'] },
            ],
            order: [['periode_at', 'DESC'], ['created_at', 'DESC']],
            limit,
            offset,
        });

        // Résumé par type pour cet employé (avec les mêmes filtres de date)
        const dateFilter = {};
        if (date_from && date_to) {
            dateFilter.periode_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            dateFilter.periode_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            dateFilter.periode_at = { [Op.lte]: new Date(date_to) };
        }

        const resume = await EmployerHistory.findAll({
            attributes: [
                'type',
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('montant')), 'total_montant'],
                [fn('SUM', col('quantite')), 'total_quantite'],
            ],
            where: { employer_id, ...dateFilter },
            group: ['type'],
            raw: true,
        });

        res.json({
            employer,
            resume,
            data: rows,
            totalCount: count,
            page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Erreur getEmployerHistory:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// 2. Recherche globale dans l'historique
// ==========================================
exports.searchHistory = async (req, res) => {
    try {
        const { type, sous_type, service_id, matricule, date_from, date_to, page: p, limit: l } = req.query;

        const page = parseInt(p) || 1;
        const limit = parseInt(l) || 30;
        const offset = (page - 1) * limit;

        const where = {};
        if (type) where.type = type;
        if (sous_type) where.sous_type = { [Op.like]: `%${sous_type}%` };
        if (service_id) where.service_id = service_id;

        if (date_from && date_to) {
            where.periode_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            where.periode_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            where.periode_at = { [Op.lte]: new Date(date_to) };
        }

        const employerWhere = {};
        if (matricule) employerWhere.matricule = { [Op.like]: `%${matricule}%` };

        const { rows, count } = await EmployerHistory.findAndCountAll({
            where,
            include: [
                {
                    model: Employer, as: 'employer',
                    attributes: ['id', 'matricule', 'nom', 'prenom'],
                    where: Object.keys(employerWhere).length ? employerWhere : undefined,
                },
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                { model: db.User, as: 'creator', attributes: ['id', 'nom', 'prenom'] },
            ],
            order: [['periode_at', 'DESC'], ['created_at', 'DESC']],
            limit,
            offset,
        });

        res.json({
            data: rows,
            totalCount: count,
            page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Erreur searchHistory:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// 3. Statistiques historique d'un employé
// ==========================================
exports.getEmployerStats = async (req, res) => {
    try {
        const { employer_id } = req.params;
        const { date_from, date_to } = req.query;

        const employer = await Employer.findByPk(employer_id, {
            attributes: ['id', 'matricule', 'nom', 'prenom', 'service_id', 'is_cadre', 'date_embauche', 'date_depart', 'type_depart'],
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
        });

        if (!employer) {
            return res.status(404).json({ message: 'Employé introuvable.' });
        }

        const dateFilter = {};
        if (date_from && date_to) {
            dateFilter.periode_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
        } else if (date_from) {
            dateFilter.periode_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            dateFilter.periode_at = { [Op.lte]: new Date(date_to) };
        }

        const baseWhere = { employer_id, ...dateFilter };

        // Résumés par type
        const [
            absencesResume,
            primesResume,
            acomptesResume,
            heuresSupResume,
            primesNuitResume,
            mutationsResume,
            // Timeline mensuelle
            timeline,
        ] = await Promise.all([
            // Absences par sous-type
            EmployerHistory.findAll({
                attributes: [
                    'sous_type',
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('quantite')), 'total_jours'],
                ],
                where: { ...baseWhere, type: 'absence' },
                group: ['sous_type'],
                raw: true,
            }),
            // Primes par sous-type
            EmployerHistory.findAll({
                attributes: [
                    'sous_type',
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('montant')), 'total_montant'],
                ],
                where: { ...baseWhere, type: 'prime' },
                group: ['sous_type'],
                raw: true,
            }),
            // Acomptes
            EmployerHistory.findAll({
                attributes: [
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('montant')), 'total_montant'],
                    [fn('AVG', col('montant')), 'moyenne_montant'],
                ],
                where: { ...baseWhere, type: 'acompte' },
                raw: true,
            }),
            // Heures sup par sous-type (pourcentage)
            EmployerHistory.findAll({
                attributes: [
                    'sous_type',
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('quantite')), 'total_heures'],
                ],
                where: { ...baseWhere, type: 'heure_sup' },
                group: ['sous_type'],
                raw: true,
            }),
            // Primes nuit
            EmployerHistory.findAll({
                attributes: [
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('quantite')), 'total_jours'],
                ],
                where: { ...baseWhere, type: 'prime_nuit' },
                raw: true,
            }),
            // Mutations
            EmployerHistory.findAll({
                attributes: [
                    'sous_type',
                    [fn('COUNT', col('id')), 'count'],
                ],
                where: { ...baseWhere, type: 'mutation' },
                group: ['sous_type'],
                raw: true,
            }),
            // Timeline mensuelle (évolution)
            EmployerHistory.findAll({
                attributes: [
                    [fn('DATE_FORMAT', col('periode_at'), '%Y-%m'), 'mois'],
                    'type',
                    [fn('COUNT', col('id')), 'count'],
                    [fn('SUM', col('montant')), 'total_montant'],
                    [fn('SUM', col('quantite')), 'total_quantite'],
                ],
                where: baseWhere,
                group: [fn('DATE_FORMAT', col('periode_at'), '%Y-%m'), 'type'],
                order: [[fn('DATE_FORMAT', col('periode_at'), '%Y-%m'), 'ASC']],
                raw: true,
            }),
        ]);

        // Totaux généraux
        const totals = await EmployerHistory.findAll({
            attributes: [
                'type',
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('montant')), 'total_montant'],
                [fn('SUM', col('quantite')), 'total_quantite'],
            ],
            where: baseWhere,
            group: ['type'],
            raw: true,
        });

        res.json({
            employer,
            totals,
            absences: absencesResume,
            primes: primesResume,
            acomptes: acomptesResume[0] || { count: 0, total_montant: 0, moyenne_montant: 0 },
            heuresSup: heuresSupResume,
            primesNuit: primesNuitResume[0] || { count: 0, total_jours: 0 },
            mutations: mutationsResume,
            timeline,
        });
    } catch (error) {
        console.error('Erreur getEmployerStats:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// 4. Liste des employés avec résumé rapide
// ==========================================
exports.listEmployeesWithSummary = async (req, res) => {
    try {
        const { service_id, search, page: p, limit: l } = req.query;

        const page = parseInt(p) || 1;
        const limit = parseInt(l) || 20;
        const offset = (page - 1) * limit;

        const employerWhere = { date_depart: null }; // Actifs par défaut
        if (service_id) employerWhere.service_id = service_id;
        if (search) {
            employerWhere[Op.or] = [
                { matricule: { [Op.like]: `%${search}%` } },
                { nom: { [Op.like]: `%${search}%` } },
                { prenom: { [Op.like]: `%${search}%` } },
            ];
        }

        if (req.query.include_departed === 'true') {
            delete employerWhere.date_depart;
        }

        const { rows, count } = await Employer.findAndCountAll({
            where: employerWhere,
            attributes: ['id', 'matricule', 'nom', 'prenom', 'service_id', 'is_cadre', 'date_embauche', 'date_depart', 'type_depart'],
            include: [
                { model: Service, as: 'service', attributes: ['id', 'name'] },
            ],
            order: [['nom', 'ASC'], ['prenom', 'ASC']],
            limit,
            offset,
        });

        // Pour chaque employé, compter les événements par type
        const employeesWithSummary = await Promise.all(rows.map(async (emp) => {
            const summary = await EmployerHistory.findAll({
                attributes: [
                    'type',
                    [fn('COUNT', col('id')), 'count'],
                ],
                where: { employer_id: emp.id },
                group: ['type'],
                raw: true,
            });

            const summaryMap = {};
            summary.forEach(s => { summaryMap[s.type] = parseInt(s.count); });

            return {
                ...emp.toJSON(),
                summary: summaryMap,
                totalEvents: summary.reduce((acc, s) => acc + parseInt(s.count), 0),
            };
        }));

        res.json({
            data: employeesWithSummary,
            totalCount: count,
            page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Erreur listEmployeesWithSummary:', error);
        res.status(500).json({ message: 'Erreur: ' + error.message });
    }
};

// ==========================================
// 5. Alimenter l'historique depuis les données existantes (migration one-shot)
// ==========================================
exports.syncHistory = async (req, res) => {
    try {
        let totalInserted = 0;

        // 1. Absences
        const absences = await db.EmployerAb.findAll({
            include: [{ model: db.NavetteLigne, as: 'navette_ligne', attributes: ['service_id', 'periode_at'] }],
            raw: true,
            nest: true,
        });
        if (absences.length > 0) {
            const absEvents = absences.map(a => ({
                employer_id: a.employer_id,
                type: 'absence',
                sous_type: a.type_abs,
                description: `Absence ${a.type_abs} - ${a.nb_jours} jour(s) - ${a.motif || ''}`,
                details: { type_abs: a.type_abs, code_abs: a.code_abs, nb_jours: a.nb_jours, motif: a.motif, images: a.images },
                quantite: a.nb_jours,
                service_id: a.navette_ligne?.service_id || null,
                navette_id: a.navette_id,
                navette_ligne_id: a.navette_ligne_id,
                reference_id: a.id,
                reference_table: 'employer_abs',
                periode_at: a.navette_ligne?.periode_at || a.created_at,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(absEvents);
            totalInserted += absEvents.length;
        }

        // 2. Primes
        const primes = await db.EmployerPrime.findAll({
            include: [{ model: db.NavetteLigne, as: 'navette_ligne', attributes: ['service_id', 'periode_at'] }],
            raw: true,
            nest: true,
        });
        if (primes.length > 0) {
            const primeEvents = primes.map(p => ({
                employer_id: p.employer_id,
                type: 'prime',
                sous_type: p.type_prime,
                description: `Prime ${p.type_prime} - ${p.montant} FCFA`,
                details: { type_prime: p.type_prime, code_prime: p.code_prime, montant: p.montant },
                montant: p.montant,
                service_id: p.navette_ligne?.service_id || null,
                navette_id: p.navette_id,
                navette_ligne_id: p.navette_ligne_id,
                reference_id: p.id,
                reference_table: 'employer_primes',
                periode_at: p.navette_ligne?.periode_at || p.created_at,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(primeEvents);
            totalInserted += primeEvents.length;
        }

        // 3. Acomptes
        const acomptes = await db.EmployerAccompte.findAll({
            include: [{ model: db.NavetteLigne, as: 'navette_ligne', attributes: ['service_id', 'periode_at'] }],
            raw: true,
            nest: true,
        });
        if (acomptes.length > 0) {
            const acompteEvents = acomptes.map(a => ({
                employer_id: a.employer_id,
                type: 'acompte',
                sous_type: null,
                description: `Acompte de ${a.somme} FCFA${a.motif ? ' - ' + a.motif : ''}`,
                details: { code_accompte: a.code_accompte, somme: a.somme, motif: a.motif },
                montant: a.somme,
                service_id: a.navette_ligne?.service_id || null,
                navette_id: a.navette_id,
                navette_ligne_id: a.navette_ligne_id,
                reference_id: a.id,
                reference_table: 'employer_accomptes',
                periode_at: a.navette_ligne?.periode_at || a.created_at,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(acompteEvents);
            totalInserted += acompteEvents.length;
        }

        // 4. Heures sup
        const heures = await db.EmployerHeure.findAll({
            include: [{ model: db.NavetteLigne, as: 'navette_ligne', attributes: ['service_id', 'periode_at'] }],
            raw: true,
            nest: true,
        });
        if (heures.length > 0) {
            const heureEvents = heures.map(h => ({
                employer_id: h.employer_id,
                type: 'heure_sup',
                sous_type: `${h.pourcentage}%`,
                description: `${h.heures}h supplémentaires à ${h.pourcentage}%`,
                details: { heures: h.heures, pourcentage: h.pourcentage, code_heure: h.code_heure },
                quantite: h.heures,
                service_id: h.navette_ligne?.service_id || null,
                navette_id: h.navette_id,
                navette_ligne_id: h.navette_ligne_id,
                reference_id: h.id,
                reference_table: 'employer_heures',
                periode_at: h.navette_ligne?.periode_at || h.created_at,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(heureEvents);
            totalInserted += heureEvents.length;
        }

        // 5. Primes nuit
        const primesNuit = await db.EmployerPrimeNuit.findAll({
            include: [{ model: db.NavetteLigne, as: 'navette_ligne', attributes: ['service_id', 'periode_at'] }],
            raw: true,
            nest: true,
        });
        if (primesNuit.length > 0) {
            const pnEvents = primesNuit.map(pn => ({
                employer_id: pn.employer_id,
                type: 'prime_nuit',
                sous_type: pn.code_prime_nuit,
                description: `Prime nuit (${pn.code_prime_nuit}) - ${pn.nb_jour} jour(s)`,
                details: { code_prime_nuit: pn.code_prime_nuit, nb_jour: pn.nb_jour },
                quantite: pn.nb_jour,
                service_id: pn.navette_ligne?.service_id || null,
                navette_id: pn.navette_id,
                navette_ligne_id: pn.navette_ligne_id,
                reference_id: pn.id,
                reference_table: 'employer_prime_nuits',
                periode_at: pn.navette_ligne?.periode_at || pn.created_at,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(pnEvents);
            totalInserted += pnEvents.length;
        }

        // 6. Mutations
        const mutations = await db.EmployerMutation.findAll({
            include: [
                { model: db.Service, as: 'serviceOld', attributes: ['id', 'name'] },
                { model: db.Service, as: 'serviceNew', attributes: ['id', 'name'] },
            ],
            raw: true,
            nest: true,
        });
        if (mutations.length > 0) {
            const mutEvents = mutations.map(m => ({
                employer_id: m.employer_id,
                type: 'mutation',
                sous_type: m.status,
                description: `Mutation ${m.serviceOld?.name || '?'} → ${m.serviceNew?.name || '?'} (${m.status})`,
                details: {
                    status: m.status,
                    service_old: m.serviceOld?.name,
                    service_new: m.serviceNew?.name,
                    nb_jours_job: m.nb_jours_job,
                    nb_jour_abs: m.nb_jour_abs,
                    accompte: m.accompte,
                    prime_nuit: m.prime_nuit,
                    heure_sup_15: m.heure_sup_15,
                    heure_sup_50: m.heure_sup_50,
                    heure_sup_75: m.heure_sup_75,
                    date_effective: m.date_effective,
                    motif: m.motif,
                },
                service_id: m.service_new_id,
                navette_id: m.navette_id,
                navette_ligne_id: m.navette_ligne_id,
                reference_id: m.id,
                reference_table: 'employer_mutations',
                periode_at: m.date_effective || m.created_at,
                created_by: m.created_by,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            await EmployerHistory.bulkCreate(mutEvents);
            totalInserted += mutEvents.length;
        }

        res.json({
            message: `Synchronisation terminée. ${totalInserted} événement(s) ajouté(s) à l'historique.`,
            totalInserted,
        });
    } catch (error) {
        console.error('Erreur syncHistory:', error);
        res.status(500).json({ message: 'Erreur synchronisation: ' + error.message });
    }
};
