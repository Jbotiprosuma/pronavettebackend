//app/middlewares/uploadImages.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/absences');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Mise à jour pour accepter les images ET les fichiers PDF
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers image et PDF sont autorisés!'), false);
    }
};

const uploadAbsenceImages = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 205 * 1024 * 1024 }
}).array('images', 15);

module.exports = uploadAbsenceImages;