// app/middlewares/uploadExcel.middleware.js (ou un nom similaire)
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Pour s'assurer que le dossier d'upload existe

// Chemin du dossier de destination pour les fichiers Excel temporaires
const UPLOAD_DIR = 'public/employers/'; // Créez un dossier spécifique

// Assurez-vous que le dossier d'upload existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuration du stockage de Multer pour les fichiers Excel
const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Crée un nom de fichier unique pour éviter les conflits
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `employers-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Filtre pour n'accepter que les fichiers Excel
const excelFileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté. Seuls les fichiers Excel (.xls, .xlsx) sont autorisés.'), false);
    }
};

// Initialisation de Multer pour les fichiers Excel
const uploadExcel = multer({
    storage: excelStorage,
    fileFilter: excelFileFilter,
    limits: { fileSize: 1000 * 1024 * 1024 } 
});

module.exports = uploadExcel;