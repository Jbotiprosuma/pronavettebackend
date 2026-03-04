// utils/avatarGenerator.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Génère une image avatar PNG avec les initiales.
 * @param {string} nom
 * @param {string} prenom
 * @param {string} username
 * @returns {string} Le chemin relatif du fichier généré
 */
function generateAvatarImage(nom, prenom, username) {
 const initials = `${(prenom?.[0] || '')}${(nom?.[0] || '')}`.toUpperCase();
 const canvas = createCanvas(128, 128);
 const ctx = canvas.getContext('2d');

 // Couleur de fond aléatoire
 const bgColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
 ctx.fillStyle = bgColor;
 ctx.fillRect(0, 0, 128, 128);

 // Texte (initiales)
 ctx.font = '64px Arial';
 ctx.fillStyle = '#ffffff';
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText(initials, 64, 64);

 // Dossier et nom du fichier
 const filename = `${username || Date.now()}.png`;
 const folderPath = path.join(__dirname, '..', 'public', 'avatars');
 const outputPath = path.join(folderPath, filename);

 // Création du dossier si nécessaire
 if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath, { recursive: true });
 }

 // Sauvegarde image
 const buffer = canvas.toBuffer('image/png');
 fs.writeFileSync(outputPath, buffer);

 return `/avatars/${filename}`;
}

module.exports = { generateAvatarImage };
