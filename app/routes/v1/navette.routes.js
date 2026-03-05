// app/routes/navette.routes.js
const express = require('express');
const router = express.Router(); // Création d'une instance de Router
const controller = require("../../controllers/navette.controller"); // Assurez-vous que le chemin vers le contrôleur est correct
const { authenticateToken, authorize } = require('../../middlewares/auth.middleware');
const uploadAbsenceImages  = require('../../middlewares/uploadImages.middleware');

// --- Routes existantes pour la gestion des navettes ---
router.post("/", authenticateToken, authorize(['system.config','navette.manage', 'mutation.edit','navette.edit']), controller.createNavette);
router.get("/", authenticateToken, authorize(['system.config','navette.read', 'mutation.edit','navette.edit']), controller.navettes);
router.get("/historique", authenticateToken, authorize(['system.config','navette.read', 'mutation.edit','navette.edit']), controller.navettesHistorique);
router.get("/all", authenticateToken, controller.navetteAlls);
router.get("/detail/:id", authenticateToken, authorize(['system.config','navette.read', 'mutation.edit','navette.edit']), controller.getNavetteById);
router.get("/service", authenticateToken, authorize(['system.config','navette.edit']), controller.getNavetteByServiceUser);

router.put("/:id/validate-updates", authenticateToken, authorize(['system.config', 'navette.edit']), controller.validateUpdates); 
router.put("/:id/correction", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit','navette.edit']), controller.correction); 
router.put("/:id/signaler", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit','navette.edit']), controller.signaler); 
router.put("/:id/send-to-payroll", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit','navette.edit']), controller.sendToPayroll);    
router.put("/:id/close", authenticateToken, authorize(['system.config', 'navette.read', 'mutation.edit','navette.edit']), controller.closeNavette); 

// --- Nouvelles routes pour EmployerAb (déjà présentes dans votre contrôleur) ---
// Vous pourriez vouloir ajuster les permissions selon qui peut créer/modifier/supprimer des absences
router.post("/absences", authenticateToken, authorize(['system.config', 'navette.edit']), uploadAbsenceImages,controller.createEmployerAb);
router.put("/absences/:id", authenticateToken, authorize(['system.config', 'navette.edit']),uploadAbsenceImages, controller.updateEmployerAb);
router.delete("/absences/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.deleteEmployerAb);

// --- Nouvelles routes pour EmployerAccompte ---
router.post("/acomptes", authenticateToken, authorize(['system.config', 'navette.edit']), controller.createEmployerAccompte);
router.put("/acomptes/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.updateEmployerAccompte);
router.delete("/acomptes/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.deleteEmployerAccompte);

// --- Nouvelles routes pour EmployerHeure ---
router.post("/heures-sup", authenticateToken, authorize(['system.config', 'navette.edit']), controller.createEmployerHeure);
router.put("/heures-sup/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.updateEmployerHeure);
router.delete("/heures-sup/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.deleteEmployerHeure);

// --- Nouvelles routes pour EmployerPrime ---
router.post("/primes", authenticateToken, authorize(['system.config', 'navette.edit']), controller.createEmployerPrime);
router.put("/primes/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.updateEmployerPrime);
router.delete("/primes/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.deleteEmployerPrime);

// --- Nouvelles routes pour EmployerPrimeNuit ---
router.post("/primes-nuit", authenticateToken, authorize(['system.config', 'navette.edit']), controller.createEmployerPrimeNuit);
router.put("/primes-nuit/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.updateEmployerPrimeNuit);
router.delete("/primes-nuit/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.deleteEmployerPrimeNuit);


//depart 
router.post("/depart", authenticateToken, authorize(['system.config', 'navette.edit']), controller.depart);
router.delete("/depart/:id", authenticateToken, authorize(['system.config', 'navette.edit']), controller.departDelete);

// --- Campagnes ---
router.get("/campagnes", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit']), controller.listCampagnes);
router.put("/campagnes/prolonger", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit']), controller.prolongerCampagne);
router.put("/campagnes/dates", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit']), controller.updateCampagneDates);
router.delete("/campagnes", authenticateToken, authorize(['system.config', 'navette.manage', 'mutation.edit']), controller.deleteCampagne);

// --- Template import employés (AVANT les routes avec :id) ---
router.get("/template-employes", authenticateToken, controller.downloadEmployerTemplate);

// --- Export Sage ---
router.get("/:id/export-sage", authenticateToken, authorize(['system.config', 'navette.manage']), controller.exportSage);

module.exports = router;