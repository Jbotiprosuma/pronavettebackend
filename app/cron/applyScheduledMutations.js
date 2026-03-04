const cron = require('node-cron');
const {
    EmployerMutation, Navette, NavetteLigne, Employer,
    EmployerAb, EmployerAccompte, EmployerHeure,
    EmployerPrime, EmployerPrimeNuit,
    sequelize,
} = require('../models');
const { Op } = require('sequelize');

// Toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ Cron mutation: démarrage…');
    const now = new Date();
    const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);

    const mutations = await EmployerMutation.findAll({
        where: {
            status: { [Op.or]: ['En attente', 'Validé'] },
            depart_at: { [Op.lte]: now },
            is_apply: 0,
        },
        paranoid: true,
    });

    if (mutations.length === 0) {
        console.log('✔️ Aucune mutation à appliquer.');
        return;
    }

    console.log(`🔍 ${mutations.length} mutation(s) à appliquer…`);

    for (const mutation of mutations) {
        try {
            await sequelize.transaction(async (t) => {
                const txOpts = { transaction: t };

                const {
                    employer_id, service_old_id, service_new_id,
                    nb_jours_job, nb_jour_abs, accompte, prime_nuit,
                    heure_sup_15, heure_sup_50, heure_sup_75,
                } = mutation;

                const employer = await Employer.findByPk(employer_id, txOpts);
                const is_cadre = employer ? employer.is_cadre : false;

                // Navettes OLD + NEW
                const [navette_old, navette_new] = await Promise.all([
                    Navette.findOne({ where: { service_id: service_old_id, periode_at }, paranoid: true, ...txOpts }),
                    Navette.findOne({ where: { service_id: service_new_id, periode_at }, paranoid: true, ...txOpts }),
                ]);

                if (!navette_old || !navette_new) {
                    console.log(`⚠️ Mutation ${mutation.id}: navette introuvable (old: ${!!navette_old}, new: ${!!navette_new}).`);
                    return;
                }

                // Lignes OLD + NEW
                const [navetteLigne_old, navetteLigne_new] = await Promise.all([
                    NavetteLigne.findOne({ where: { employer_id, service_id: service_old_id, periode_at }, paranoid: true, ...txOpts }),
                    NavetteLigne.findOne({ where: { employer_id, service_id: service_new_id, periode_at }, paranoid: true, ...txOpts }),
                ]);

                if (!navetteLigne_old || navetteLigne_new) {
                    console.log(`⚠️ Mutation ${mutation.id}: incohérence des lignes (old: ${!!navetteLigne_old}, new_exists: ${!!navetteLigne_new}).`);
                    return;
                }

                // 🔄 Mise à jour de l'ancienne ligne navette
                await navetteLigne_old.update(
                    { mutation_out: 1, mutation_in: 0, is_mutation: 0 },
                    { ...txOpts, isSystemUpdate: true }
                );

                // ➕ Création de la nouvelle ligne navette
                const newNavetteLigne = await NavetteLigne.create({
                    employer_id,
                    service_id: service_new_id,
                    navette_id: navette_new.id,
                    mutation_in: 1,
                    is_mutation: 1,
                    nb_jours: navetteLigne_old.nb_jours,
                    periode_at,
                    status: is_cadre ? 'Cadre' : 'Non cadre',
                    nb_jours_job, nb_jour_abs, accompte, prime_nuit,
                    heure_sup_15, heure_sup_50, heure_sup_75,
                    created_at: new Date(),
                    updated_at: new Date(),
                }, txOpts);

                // 📋 Copier les enregistrements enfants de l'ancienne ligne vers la nouvelle
                const copyChildren = async (Model, mapFn) => {
                    const items = await Model.findAll({ where: { navette_ligne_id: navetteLigne_old.id }, paranoid: true, ...txOpts });
                    if (items.length > 0) {
                        await Model.bulkCreate(items.map(item => mapFn(item)), txOpts);
                    }
                    return items.length;
                };

                // Absences
                await copyChildren(EmployerAb, (a) => ({
                    employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                    nb_jours: a.nb_jours, type_abs: a.type_abs, code_abs: a.code_abs,
                    motif: a.motif, created_at: new Date(), updated_at: new Date()
                }));

                // Acomptes
                await copyChildren(EmployerAccompte, (a) => ({
                    employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                    code_accompte: a.code_accompte, somme: a.somme, motif: a.motif,
                    created_at: new Date(), updated_at: new Date()
                }));

                // Heures supplémentaires
                await copyChildren(EmployerHeure, (h) => ({
                    employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                    heures: h.heures, pourcentage: h.pourcentage, code_heure: h.code_heure,
                    created_at: new Date(), updated_at: new Date()
                }));

                // Primes
                await copyChildren(EmployerPrime, (p) => ({
                    employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                    montant: p.montant, type_prime: p.type_prime, code_prime: p.code_prime,
                    created_at: new Date(), updated_at: new Date()
                }));

                // Primes de nuit
                await copyChildren(EmployerPrimeNuit, (pn) => ({
                    employer_id, navette_id: navette_new.id, navette_ligne_id: newNavetteLigne.id,
                    code_prime_nuit: pn.code_prime_nuit, nb_jour: pn.nb_jour,
                    created_at: new Date(), updated_at: new Date()
                }));

                // ✔️ Marquer la mutation comme appliquée
                await mutation.update(
                    { is_apply: 1, apply_at: now },
                    { ...txOpts, isSystemUpdate: true }
                );

                console.log(`✅ Mutation ${mutation.id} appliquée (avec enfants copiés).`);
            });
        } catch (error) {
            console.error(`❌ ERREUR mutation ${mutation.id}`, error);
        }
    }

    console.log('✔️ Cron mutation terminé.');
});
