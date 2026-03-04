// app/middlewares/upload.middleware.js
const multer = require('multer');
const path = require('path');

// Configuration du stockage de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Le dossier où les fichiers seront stockés
        // Assurez-vous que ce dossier existe ou créez-le
        cb(null, 'public/avatars/'); 
    },
    filename: (req, file, cb) => {
        // Crée un nom de fichier unique pour éviter les conflits
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté. Seules les images JPEG, JPG et PNG sont autorisées.'), false);
    }
};

// Initialisation de Multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } 
});

module.exports = upload;