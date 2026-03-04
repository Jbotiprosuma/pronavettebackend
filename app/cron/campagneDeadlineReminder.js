const cron = require('node-cron');
const { Navette, User, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendCampagneReminderEmail } = require('../services/email.service');

const MOIS_NOMS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Récupère tous les utilisateurs concernés par les notifications de campagne
 */
const getAllCampagneUsers = async () => {
    return User.findAll({
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
};

/**
 * Cron qui tourne tous les jours à 8h00.
 * - 3 jours avant la fin de la campagne → notification + email de rappel
 * - Le jour de la fin de la campagne → notification + email de fin
 */
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Cron campagne deadline: vérification des délais…');

    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const periode_at = new Date(now.getFullYear(), now.getMonth(), 1);

        // Récupérer les navettes actives du mois courant
        const navettes = await Navette.findAll({
            where: {
                periode_at,
                status: { [Op.notIn]: ['Terminé'] },
            },
            attributes: ['id', 'periode_at', 'periode_debut_at', 'periode_fin_at', 'status'],
        });

        if (navettes.length === 0) {
            console.log('✔️ Aucune campagne active à vérifier.');
            return;
        }

        // Utiliser les dates de la première navette (elles partagent les mêmes dates)
        const dateFin = navettes[0].periode_fin_at ? new Date(navettes[0].periode_fin_at) : null;
        if (!dateFin) {
            console.log('⚠️ Pas de date de fin définie pour la campagne.');
            return;
        }

        const dateFinNorm = new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate());
        const diffMs = dateFinNorm.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const periodeLabel = `${MOIS_NOMS[periode_at.getMonth()]} ${periode_at.getFullYear()}`;
        const dateFinStr = dateFinNorm.toLocaleDateString('fr-FR');

        let shouldNotify = false;
        let notifType = '';
        let notifTitle = '';
        let notifMessage = '';

        if (diffDays === 3) {
            // 3 jours avant la fin
            shouldNotify = true;
            notifType = 'rappel_3j';
            notifTitle = '⏰ Rappel : 3 jours restants';
            notifMessage = `Il ne reste plus que 3 jours avant la fin de la campagne navette ${periodeLabel} (échéance le ${dateFinStr}). Pensez à finaliser vos saisies.`;
        } else if (diffDays === 2) {
            shouldNotify = true;
            notifType = 'rappel_3j';
            notifTitle = '⏰ Rappel : 2 jours restants';
            notifMessage = `Il ne reste plus que 2 jours avant la fin de la campagne navette ${periodeLabel} (échéance le ${dateFinStr}).`;
        } else if (diffDays === 1) {
            shouldNotify = true;
            notifType = 'rappel_3j';
            notifTitle = '⚠️ Dernier jour demain !';
            notifMessage = `Demain est le dernier jour de la campagne navette ${periodeLabel}. Date de fin : ${dateFinStr}.`;
        } else if (diffDays === 0) {
            // Jour de la fin
            shouldNotify = true;
            notifType = 'fin';
            notifTitle = '🔴 Fin de campagne';
            notifMessage = `La campagne navette ${periodeLabel} arrive à échéance aujourd'hui (${dateFinStr}). Veuillez finaliser vos dernières saisies.`;
        }

        if (!shouldNotify) {
            console.log(`✔️ Pas de rappel aujourd'hui (${diffDays} jour(s) restant(s)).`);
            return;
        }

        // Récupérer les utilisateurs
        const users = await getAllCampagneUsers();
        const userIds = users.map(u => u.id);
        const emails = users.filter(u => u.email).map(u => u.email);

        // Envoyer la notification en base
        await Notification.notifyUsers(userIds, {
            title: notifTitle,
            message: notifMessage,
            type: 'campagne_rappel',
            link: '/navette/service',
        });

        // Envoyer l'email de rappel
        await sendCampagneReminderEmail(emails, {
            periodeLabel,
            dateFin: dateFinStr,
            joursRestants: diffDays,
            type: notifType,
        });

        console.log(`📧 Rappel campagne (${notifType}) envoyé à ${users.length} utilisateurs. ${diffDays} jour(s) restant(s).`);

    } catch (error) {
        console.error('❌ Erreur cron campagne deadline:', error);
    }
});

console.log('📅 Cron campagne deadline reminders initialisé (tous les jours à 8h).');
