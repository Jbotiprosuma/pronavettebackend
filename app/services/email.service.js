const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
});

// Ancien email pour la création de compte
const sendAccountCreationEmail = async (userEmail, email, name) => {
    let emailContent = `
        <p>${name},</p>
        <p>Votre compte a été créé avec succès sur <strong>PRONAVETTE</strong>.</p>
        <p>Votre email de connexion est : <strong>${email}</strong></p>
        <p>Votre mot de passe est celui de votre profil <strong> PROSUMA</strong></p>
    `;
    emailContent += `<p>Si vous rencontrez des difficultés, veuillez contacter sos@prosuma.ci pour une assistance.</p>`;
    emailContent += `<div style="display:flex;justify-content:center;align-items:center;width:100%;" ><a style="padding:20px;text-decoration:none;" href="http://pronavette">Se connecter</a></div>`;
    emailContent += `<p>Cordialement,</p>
                     <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>`;
    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: userEmail,
            subject: 'Création de compte utilisateur',
            html: emailContent,
        });
        console.log(`Email de création de compte envoyé à ${userEmail}`);
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${userEmail}:`, error);
    }
};

// NOUVELLE FONCTION: E-mail de validation de navette
const sendNavetteValidatedEmail = async (managerEmail, name, navetteId) => {
    const emailContent = `
        <p>${name},</p>
        <p>La navette avec l'ID <strong>${navetteId}</strong>, vous a été envoyée pour vérification et confirmation des informations.</p>
        <p>Veuillez vous connecter pour avoir plus d'informations sur cette navette.</p>
        <div style="display:flex;justify-content:center;align-items:center;width:100%;" ><a style="padding:20px;text-decoration:none;" href="http://pronavette">Se connecter</a></div>
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;
    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: managerEmail,
            subject: `Navette #${navetteId} en attente de confirmation du manager`,
            html: emailContent,
        });
        console.log(`Email de validation de navette envoyé à ${managerEmail}`);
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${managerEmail}:`, error);
    }
};

// NOUVELLE FONCTION: E-mail de demande de correction
const sendCorrectionRequestEmail = async (managerEmail, name, navetteId) => {
    const emailContent = `
        <p>${name},</p>
        <p>Des corrections sont nécessaires pour la navette avec l'ID <strong>${navetteId}</strong>.</p>
        <p>Veuillez vérifier les détails et apporter les modifications nécessaires.</p>
        <div style="display:flex;justify-content:center;align-items:center;width:100%;" ><a style="padding:20px;text-decoration:none;" href="http://pronavette">Se connecter</a></div>
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;
    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: managerEmail,
            subject: `Demande de correction pour la navette #${navetteId}`,
            html: emailContent,
        });
        console.log(`Email de correction demandé pour la navette #${navetteId} et envoyé à ${managerEmail}`);
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${managerEmail}:`, error);
    }
};

const sendToPayrollEmail = async (payrollEmail, name, navetteId) => {
    const emailContent = `
        <p>${name},</p>
        <p>La navette avec l'ID <strong>${navetteId}</strong> a été envoyée à votre équipe pour traitement.</p>
        <p>Veuillez prendre les mesures nécessaires pour clôturer cette demande.</p>
        <div style="display:flex;justify-content:center;align-items:center;width:100%;" ><a style="padding:20px;text-decoration:none;" href="http://pronavette">Se connecter</a></div>
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;
    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: payrollEmail,
            subject: `Navette #${navetteId} en attente de traitement`,
            html: emailContent,
        });
        console.log(`Email d'envoi à la paie pour la navette #${navetteId} a été envoyé`);
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${payrollEmail}:`, error);
    }
};

const sendMutationNotification = async (recipientList, emailDetails, user, transporter) => {

    if (recipientList.length === 0) {
        // ...
        return;
    }

    const { employeeName, serviceName, periodeAt, isUpdate = false } = emailDetails; // <-- Récupère isUpdate
    const creatorName = `${user.nom} ${user.prenom}`;

    // Ajuster le verbe et le sujet
    const action = isUpdate ? 'Mise à Jour' : 'Nouvelle';
    const actionVerb = isUpdate ? 'a été mise à jour' : 'a été enregistrée';
    const subject = `[ACTION REQUISE] ${action} Mutation: ${employeeName}`;

    // --- Contenu HTML mis à jour ---
    const emailContent = `
        <p>Bonjour,</p>
        
        <p>Une ${action.toLowerCase()} mutation ${actionVerb} dans le système et nécessite votre attention :</p>
        
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 5px;"><strong>Employé concerné</strong> : ${employeeName}</li>
            <li style="margin-bottom: 5px;"><strong>Nouveau Service</strong> : ${serviceName}</li>
            <li style="margin-bottom: 5px;"><strong>Action effectuée par</strong> : ${creatorName}</li>
            <li style="margin-bottom: 5px;"><strong>Période concernée</strong> : ${periodeAt}</li>
        </ul>
        
        <p>Veuillez vous connecter à l'application pour examiner les modifications et valider cette mutation.</p>
        
        <div style="display:flex;justify-content:center;align-items:center;width:100%;" >
            <a style="padding:15px 30px; text-decoration:none;color:#007bff; font-weight:bold;" href="http://pronavette">
                Se connecter à PRONAVETTE
            </a>
        </div>
        
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;

    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: recipientList.join(','),
            subject: subject,
            html: emailContent,
        });

        console.log(`Notification de mutation (${action}) envoyée à ${recipientList.length} destinataires.`);
    } catch (error) {
        console.error(`Échec de l'envoi de l'email de notification de mutation:`, error);
    }
};

/**
 * Email de lancement / prolongation de campagne navette
 * @param {string[]} recipientEmails - Liste d'emails
 * @param {object} details - { periodeLabel, dateDebut, dateFin, action ('lancée'|'prolongée') }
 */
const sendCampagneLaunchedEmail = async (recipientEmails, details) => {
    if (!recipientEmails || recipientEmails.length === 0) return;

    const { periodeLabel, dateDebut, dateFin, action = 'lancée' } = details;
    const subject = `[PRONAVETTE] Campagne navette ${action} — ${periodeLabel}`;

    const emailContent = `
        <p>Bonjour,</p>
        <p>La campagne navette pour la période <strong>${periodeLabel}</strong> a été <strong>${action}</strong>.</p>
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 5px;"><strong>Période</strong> : ${periodeLabel}</li>
            <li style="margin-bottom: 5px;"><strong>Date de début</strong> : ${dateDebut}</li>
            <li style="margin-bottom: 5px;"><strong>Date de fin</strong> : ${dateFin}</li>
        </ul>
        <p>Veuillez vous connecter à l'application pour consulter et saisir les informations de vos employés.</p>
        <div style="display:flex;justify-content:center;align-items:center;width:100%;">
            <a style="padding:15px 30px; text-decoration:none; color:#007bff; font-weight:bold;" href="http://pronavette">
                Se connecter à PRONAVETTE
            </a>
        </div>
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;

    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: recipientEmails.join(','),
            subject: subject,
            html: emailContent,
        });
        console.log(`Email campagne ${action} envoyé à ${recipientEmails.length} destinataires.`);
    } catch (error) {
        console.error(`Erreur envoi email campagne ${action}:`, error);
    }
};

/**
 * Email de rappel de délai de campagne navette
 * @param {string[]} recipientEmails
 * @param {object} details - { periodeLabel, dateFin, joursRestants, type ('rappel_3j'|'fin'|'prolongee') }
 */
const sendCampagneReminderEmail = async (recipientEmails, details) => {
    if (!recipientEmails || recipientEmails.length === 0) return;

    const { periodeLabel, dateFin, joursRestants, type = 'rappel_3j' } = details;

    let subject, intro;
    if (type === 'rappel_3j') {
        subject = `[PRONAVETTE] ⏰ Rappel : ${joursRestants} jour(s) restant(s) — Campagne ${periodeLabel}`;
        intro = `Il ne reste plus que <strong>${joursRestants} jour(s)</strong> avant la fin de la campagne navette pour la période <strong>${periodeLabel}</strong>.`;
    } else if (type === 'fin') {
        subject = `[PRONAVETTE] 🔴 Fin de campagne — ${periodeLabel}`;
        intro = `La campagne navette pour la période <strong>${periodeLabel}</strong> est arrivée à échéance aujourd'hui (<strong>${dateFin}</strong>).`;
    } else if (type === 'prolongee') {
        subject = `[PRONAVETTE] 🔄 Campagne prolongée — ${periodeLabel}`;
        intro = `La campagne navette pour la période <strong>${periodeLabel}</strong> a été prolongée. Nouvelle date de fin : <strong>${dateFin}</strong>.`;
    }

    const emailContent = `
        <p>Bonjour,</p>
        <p>${intro}</p>
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 5px;"><strong>Période</strong> : ${periodeLabel}</li>
            <li style="margin-bottom: 5px;"><strong>Date de fin</strong> : ${dateFin}</li>
        </ul>
        <p>Veuillez vous connecter à l'application pour compléter vos saisies dans les délais impartis.</p>
        <div style="display:flex;justify-content:center;align-items:center;width:100%;">
            <a style="padding:15px 30px; text-decoration:none; color:#007bff; font-weight:bold;" href="http://pronavette">
                Se connecter à PRONAVETTE
            </a>
        </div>
        <p>Cordialement,</p>
        <p>L'équipe support de <strong>PRONAVETTE</strong>.</p>
    `;

    try {
        await transporter.sendMail({
            from: `PRONAVETTE <${process.env.EMAIL_FROM}>`,
            to: recipientEmails.join(','),
            subject: subject,
            html: emailContent,
        });
        console.log(`Email rappel campagne (${type}) envoyé à ${recipientEmails.length} destinataires.`);
    } catch (error) {
        console.error(`Erreur envoi email rappel campagne (${type}):`, error);
    }
};

module.exports = {
    sendAccountCreationEmail,
    sendNavetteValidatedEmail,
    sendCorrectionRequestEmail,
    sendToPayrollEmail,
    sendMutationNotification,
    sendCampagneLaunchedEmail,
    sendCampagneReminderEmail,
};