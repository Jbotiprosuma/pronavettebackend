// app/cron/autoCloseNavettes.js
const cron = require('node-cron');
const { Navette, Service, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * ══════════════════════════════════════════════════════════════
 *  CRON — Clôture automatique des navettes du mois précédent
 * ══════════════════════════════════════════════════════════════
 *
 * Exécuté tous les jours à 01:00.
 *
 * Logique :
 *  - Trouve toutes les navettes dont la période (periode_at) correspond
 *    au mois précédent et dont le status est encore "En attente" ou "En cours".
 *  - Passe leur status à "Terminé".
 *  - Détermine `status_force` :
 *      • true  → le manager n'a PAS envoyé la navette à la paie
 *                 (etat < "En attente du traitement de l'etat navette par la paie")
 *      • false → le manager a envoyé mais la paie n'a pas finalisé
 *                 (etat = "En attente du traitement de l'etat navette par la paie")
 *
 * Cela permet aux stats d'identifier les services qui ne terminent pas
 * leurs navettes à temps (status_force = true) vs ceux où seule la paie
 * n'a pas clôturé (status_force = false).
 */

// Les étapes d'etat AVANT l'envoi au manager → considérées comme "non traitées"
const ETATS_NON_ENVOYES = [
    "En attente de l'enregistrement des informations des employés",
    "En attente de l'envoi des informations des employés au manager",
    "En attente de la confirmation des informations des employés par le manager",
];

cron.schedule('0 1 * * *', async () => {
    console.log('⏳ Cron auto-close navettes: vérification…');

    try {
        const now = new Date();

        // Calculer le 1er jour du mois précédent
        const moisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Calculer le 1er jour du mois courant (borne haute exclusive)
        const moisCourant = new Date(now.getFullYear(), now.getMonth(), 1);

        // Trouver les navettes du mois précédent qui ne sont pas "Terminé"
        const navettes = await Navette.findAll({
            where: {
                periode_at: {
                    [Op.gte]: moisPrecedent,
                    [Op.lt]: moisCourant,
                },
                status: {
                    [Op.in]: ['En attente', 'En cours'],
                },
            },
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
            paranoid: true,
        });

        if (navettes.length === 0) {
            console.log('✔️ Aucune navette du mois précédent à clôturer automatiquement.');
            return;
        }

        console.log(`🔍 ${navettes.length} navette(s) du mois précédent à clôturer…`);

        let countForced = 0;
        let countNonForced = 0;

        for (const navette of navettes) {
            try {
                // Déterminer si le manager a fait sa part
                // Si l'etat est "En attente du traitement de l'etat navette par la paie"
                // ou "Etat navette cloturé", le manager a envoyé → pas de sanction
                const managerNaPasEnvoye = ETATS_NON_ENVOYES.includes(navette.etat);

                const updateData = {
                    status: 'Terminé',
                    etat: 'Etat navette cloturé',
                    status_force: managerNaPasEnvoye,
                    date_cloture: now,
                };

                await navette.update(updateData, { isSystemUpdate: true });

                if (managerNaPasEnvoye) {
                    countForced++;
                    console.log(
                        `  ⚠️ Navette ${navette.code} (${navette.service?.name || 'N/A'}) → ` +
                        `Terminé (forcé — manager n'a pas envoyé, etat: "${navette.etat}")`
                    );
                } else {
                    countNonForced++;
                    console.log(
                        `  ✅ Navette ${navette.code} (${navette.service?.name || 'N/A'}) → ` +
                        `Terminé (paie n'a pas finalisé, etat: "${navette.etat}")`
                    );
                }
            } catch (err) {
                console.error(`  ❌ Erreur clôture navette ${navette.id}:`, err.message);
            }
        }

        console.log(
            `✔️ Cron auto-close terminé: ${countForced + countNonForced} navette(s) clôturée(s) ` +
            `(${countForced} forcée(s), ${countNonForced} paie non finalisée(s)).`
        );
    } catch (error) {
        console.error('❌ Erreur cron auto-close navettes:', error);
    }
});
