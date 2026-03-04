// app/cron/autoLaunchCampagnes.js
const cron = require('node-cron');
const { Campagne } = require('../models');
const { executeCampagne } = require('../controllers/campagne.controller');

/**
 * Cron qui tourne tous les jours à 00:05.
 * Vérifie s'il existe une campagne programmée pour le mois courant
 * et la lance automatiquement si son mois est arrivé.
 */
cron.schedule('5 0 * * *', async () => {
    console.log('⏳ Cron auto-launch campagnes: vérification…');

    try {
        const now = new Date();
        const moisCourant = now.getMonth() + 1;
        const anneeCourante = now.getFullYear();

        // Chercher une campagne programmée pour le mois courant, non encore exécutée
        const campagne = await Campagne.findOne({
            where: {
                mois: moisCourant,
                annee: anneeCourante,
                status: 'programmee',
                is_executed: false,
            },
        });

        if (!campagne) {
            console.log('✔️ Aucune campagne programmée à lancer pour ce mois.');
            return;
        }

        console.log(`🚀 Lancement automatique de la campagne ${moisCourant}/${anneeCourante}…`);

        // Utiliser l'ID du créateur de la campagne, ou 1 par défaut (admin système)
        const userId = campagne.created_by || 1;

        const navettes = await executeCampagne(campagne, userId);

        console.log(`✅ Campagne auto-lancée: ${navettes.length} navette(s) créée(s).`);
    } catch (error) {
        console.error('❌ Erreur cron auto-launch campagne:', error);
    }
});
