// app/controllers/employer.controller.js
const db = require('../models');
const Employer = db.Employer;
const Service = db.Service; // Pour vérifier les services liés
const User = db.User; // Pour vérifier les utilisateurs créateurs ou liés au compte système
const Navette = db.NavetteLigne; // Pour vérifier les navettes liées
const EmployerAccompte = db.EmployerAccompte; // Pour vérifier les acomptes liés
const EmployerAb = db.EmployerAb; // Pour vérifier les absences liées
const EmployerHeure = db.EmployerHeure; // Pour vérifier les heures sup liées
const EmployerPrime = db.EmployerPrime; // Pour vérifier les primes liées
const EmployerPrimeNuit = db.EmployerPrimeNuit; // Pour vérifier les primes de nuit liées
const EmployerMutation = db.EmployerMutation;
const EmployerHistory = db.EmployerHistory;
const EmployerUpdated = db.EmployerUpdated;
const ActivityLog = db.ActivityLog;

const {
  Op,
  where
} = require('sequelize'); // Import Op pour les requêtes complexes
const slugify = require('slugify'); // Assurez-vous d'avoir installé 'slugify': npm install slugify
const xlsx = require('xlsx'); // Pour l'importation Excel
const ExcelJS = require('exceljs'); // Pour l'export avec listes déroulantes
const path = require('path');
const fs = require('fs'); // Pour la gestion des fichiers temporaires si besoin


const includeUserAssociations = () => [
  { model: Service, as: 'service', attributes: ['id', 'name'] },
];
// Configuration pour slugify (peut être externe ou inline)
const slugifyConfig = {
  lower: true, // tout en minuscules
  strict: true, // remplace les caractères non supportés
  locale: 'fr', // support des caractères français
};

// Fonction utilitaire pour générer le slug (peut être réutilisée)
const generateSlug = (name, prenom) => {
  if (!name && !prenom) return null;
  const fullNom = `${prenom || ''} ${name || ''}`.trim();
  if (!fullNom) return null;
  return slugify(fullNom, slugifyConfig);
};


// 1. Lister tous les employés
exports.getAllEmployers = async (req, res) => {
  try {
    const { service_id, is_importer, is_paie, is_admin, is_superadmin } = req.user;
    let employes;
    if (is_admin || is_superadmin || is_importer || is_paie) {
      employes = await Employer.findAll({
        include: includeUserAssociations(),
        order: [['nom', 'ASC']]
      });
    } else {
      employes = await Employer.findAll({
        where: {
          service_id: service_id
        },
        include: includeUserAssociations(),
        order: [['nom', 'ASC']]
      });
    }
    res.status(200).json({
      message: 'Employés récupérés avec succès.',
      data: employes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateur.', error: error.message });
  }
};

// 2. Récupérer un employé par ID ou Slug (avec stats pour page détail)
exports.getEmployerByIdOrSlug = async (req, res) => {
  try {
    const { identifier } = req.params;
    const detailed = req.query.detailed === 'true';

    const includeBase = [
      { model: Service, as: 'service', attributes: ['id', 'name'] },
      { model: User, as: 'creator', attributes: ['id', 'username'] },
    ];

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({ where: { slug: identifier }, include: includeBase });
    } else {
      employer = await Employer.findByPk(identifier, { include: includeBase });
    }

    if (!employer) {
      return res.status(404).json({ message: 'Employé non trouvé.' });
    }

    const response = { message: 'Employé récupéré avec succès.', data: employer };

    // Si le mode détaillé est demandé, ajouter les stats
    if (detailed) {
      const eid = employer.id;

      const [mutations, absences, accomptes, heuresSup, primes, primesNuit, logs, history] = await Promise.all([
        EmployerMutation.count({ where: { employer_id: eid } }),
        EmployerAb.count({ where: { employer_id: eid } }),
        EmployerAccompte.count({ where: { employer_id: eid } }),
        EmployerHeure.count({ where: { employer_id: eid } }),
        EmployerPrime.count({ where: { employer_id: eid } }),
        EmployerPrimeNuit.count({ where: { employer_id: eid } }),
        EmployerUpdated.findAll({
          where: { employer_id: eid },
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
          order: [['created_at', 'DESC']],
          limit: 50,
        }),
        EmployerHistory.findAll({
          where: { employer_id: eid },
          include: [
            { model: Service, as: 'service', attributes: ['id', 'name'] },
            { model: db.User, as: 'creator', attributes: ['id', 'nom', 'prenom'] },
          ],
          order: [['created_at', 'DESC']],
          limit: 100,
        }),
      ]);

      response.stats = {
        mutations, absences, accomptes, heuresSup, primes, primesNuit
      };
      response.logs = logs;
      response.history = history;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'employé par ID ou slug :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors de la récupération de l\'employé.',
      error: error.message
    });
  }
};

exports.createEmployer = async (req, res) => {
  try {
    const body = req.body;
    const { service_id, is_importer, is_paie, is_admin, is_superadmin } = req.user;

    if (!is_admin && !is_superadmin && !is_importer && !is_paie && service_id != body.service_id) {
      return res.status(400).json({
        message: 'Permissions réfusée ! Vous ne pouvez pas créer un employé pour un autre service.'
      });
    }

    // -- 1. Validation des Champs Requis --
    if (!body.matricule || !body.nom || !body.prenom) {
      return res.status(400).json({
        message: 'Le matricule, le nom et le prénom sont obligatoires pour la création.'
      });
    }

    // -- 2. Vérification de l'Unicité --

    // Vérification du matricule
    let existingEmployer = await Employer.findOne({
      where: { matricule: body.matricule },
      paranoid: false
    });

    if (existingEmployer) {
      return res.status(409).json({ message: `Le matricule ${body.matricule} existe déjà.` });
    }

    // Vérification de l'email (si fourni)
    if (body.email) {
      existingEmployer = await Employer.findOne({
        where: { email: body.email },
        paranoid: false
      });
      if (existingEmployer) {
        return res.status(409).json({ message: `L'email ${body.email} est déjà utilisé.` });
      }
    }

    // -- 3. Préparation des Données --

    // Le slug sera généré et rendu unique par les hooks du modèle (avantCreate)

    // Conversion de is_cadre au format booléen si elle vient d'une chaîne ('on' ou 'true')
    const isCadre = body.is_cadre === 'true' || body.is_cadre === true;

    // Définition de l'utilisateur créateur
    const created_by_user_id = req.user ? req.user.id : null;

    // Nettoyage et compilation des données pour la création
    const employerData = {
      matricule: body.matricule,
      nom: body.nom,
      prenom: body.prenom,
      email: body.email || null,
      service_id: body.service_id || null,
      poste_occupe: body.poste_occupe || null,
      genre: body.genre || 'Homme',
      is_cadre: isCadre,
      date_embauche: body.date_embauche || null,
      date_depart: body.date_depart || null,
      type_depart: body.type_depart || null,
      created_by: created_by_user_id,
      created_at: new Date(),
      updated_at: new Date()
      // Les champs 'slug', 'created_at', 'updated_at' seront gérés par Sequelize/hooks
    };

    // -- 4. Création --
    const newEmployer = await Employer.create(employerData);

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'create',
            target_id: newEmployer.id,
            target_label: `${newEmployer.nom} ${newEmployer.prenom} (${newEmployer.matricule})`,
            description: `Employé créé: ${newEmployer.nom} ${newEmployer.prenom}, matricule ${newEmployer.matricule}, service #${newEmployer.service_id}.`,
            new_values: { matricule: newEmployer.matricule, nom: newEmployer.nom, prenom: newEmployer.prenom, service_id: newEmployer.service_id },
        });

    // 5. Réponse
    res.status(201).json({
      message: 'Employé créé avec succès.',
      data: newEmployer
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'employé :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors de la création de l\'employé.',
      error: error.message
    });
  }
};
// 4. Mettre à jour un employé existant
exports.updateEmployer = async (req, res) => {
  try {
    const {
      identifier
    } = req.params; // ID ou SLUG
    const {
      matricule,
      nom,
      prenom,
      email,
      poste_occupe,
      genre,
      service_id,
      is_cadre,
      date_embauche,
      date_depart,
      type_depart,
      last_update_by,
    } = req.body;

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({
        where: {
          [Op.or]: [
            { slug: identifier },
            { matricule: identifier } // Permet de trouver l'employé par slug ou matricule
          ]
        }
      });
    } else {
      employer = await Employer.findByPk(identifier);
    }

    if (!employer) {
      return res.status(404).json({
        message: 'Employé non trouvé.'
      });
    }

    // Vérifier l'unicité du matricule (si modifié et différent de l'actuel)
    if (matricule && matricule !== employer.matricule) {
      const existingEmployerByMatricule = await Employer.findOne({
        where: {
          matricule: matricule,
          id: {
            [Op.ne]: employer.id
          }
        }
      });
      if (existingEmployerByMatricule) {
        return res.status(409).json({
          message: 'Ce matricule est déjà utilisé par un autre employé.'
        });
      }
    }

    // Vérifier l'unicité de l'email (si modifié et différent de l'actuel, et si fourni)
    if (email && email !== employer.email) {
      const existingEmployerByEmail = await Employer.findOne({
        where: {
          email: email,
          id: {
            [Op.ne]: employer.id
          }
        }
      });
      if (existingEmployerByEmail) {
        return res.status(409).json({
          message: 'Cet email est déjà utilisé par un autre employé.'
        });
      }
    }

    // Vérifier si le service_id existe si fourni et différent
    if (service_id && service_id !== employer.service_id) {
      const serviceExists = await Service.findByPk(service_id);
      if (!serviceExists) {
        return res.status(400).json({
          message: 'Le service spécifié n\'existe pas.'
        });
      }
    }

    const oldEmpValues = { nom: employer.nom, prenom: employer.prenom, matricule: employer.matricule, service_id: employer.service_id };

    // Mettre à jour les champs
    employer.matricule = matricule !== undefined ? matricule : employer.matricule;
    employer.nom = nom !== undefined ? nom : employer.nom;
    employer.prenom = prenom !== undefined ? prenom : employer.prenom;
    employer.email = email !== undefined ? email : employer.email;
    employer.poste_occupe = poste_occupe !== undefined ? poste_occupe : employer.poste_occupe;
    employer.genre = genre !== undefined ? genre : employer.genre;
    employer.service_id = service_id !== undefined ? service_id : employer.service_id;
    employer.is_cadre = is_cadre !== undefined ? is_cadre : employer.is_cadre;
    employer.date_embauche = date_embauche !== undefined ? date_embauche : employer.date_embauche;
    employer.date_depart = date_depart !== undefined ? date_depart : employer.date_depart;
    employer.type_depart = type_depart !== undefined ? type_depart : employer.type_depart;
    employer.last_update_by = last_update_by !== undefined ? last_update_by : employer.last_update_by;

    // Le slug sera mis à jour automatiquement par le hook `beforeUpdate` du modèle s'il y a un changement de nom/prénom.

    await employer.save();

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'update',
            target_id: employer.id,
            target_label: `${employer.nom} ${employer.prenom} (${employer.matricule})`,
            description: `Employé #${employer.id} mis à jour.`,
            old_values: oldEmpValues,
            new_values: req.body,
        });

    res.status(200).json({
      message: 'Employé mis à jour avec succès.',
      data: employer
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'employé :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors de la mise à jour de l\'employé.',
      error: error.message
    });
  }
};

// 5. Supprimer un employé (soft delete)
exports.deleteEmployer = async (req, res) => {
  try {
    const { identifier } = req.params;

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({ where: { slug: identifier } });
    } else {
      employer = await Employer.findByPk(identifier);
    }

    if (!employer) {
      return res.status(404).json({ message: 'Employé non trouvé.' });
    }

    await employer.destroy(); // Soft delete via paranoid (met deleted_at = NOW())

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'delete',
            target_id: employer.id,
            target_label: `${employer.nom} ${employer.prenom} (${employer.matricule})`,
            description: `Employé ${employer.nom} ${employer.prenom} supprimé (soft delete).`,
        });

    res.status(200).json({ message: 'Employé supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'employé :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors de la suppression de l\'employé.',
      error: error.message
    });
  }
};

// 5b. Suppression multiple (soft delete)
exports.bulkDeleteEmployers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Aucun ID fourni.' });
    }

    const deleted = await Employer.destroy({ where: { id: { [Op.in]: ids } } });

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'bulk_delete',
            target_id: null,
            target_label: `${ids.length} employé(s)`,
            description: `Suppression en masse de ${ids.length} employé(s). IDs: ${ids.join(', ')}.`,
            old_values: { ids },
        });

    res.status(200).json({
      message: `${deleted} employé(s) supprimé(s) avec succès.`,
      count: deleted
    });
  } catch (error) {
    console.error('Erreur bulk delete:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 5c. Lister les employés supprimés (corbeille)
exports.getTrashedEmployers = async (req, res) => {
  try {
    const employes = await Employer.findAll({
      where: { deleted_at: { [Op.ne]: null } },
      include: includeUserAssociations(),
      order: [['deleted_at', 'DESC']],
      paranoid: false, // Important: inclure les soft-deleted
    });

    res.status(200).json({
      message: 'Employés supprimés récupérés avec succès.',
      data: employes
    });
  } catch (error) {
    console.error('Erreur corbeille:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 5d. Restaurer un employé depuis la corbeille
exports.restoreEmployer = async (req, res) => {
  try {
    const { identifier } = req.params;

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({
        where: { slug: identifier },
        paranoid: false
      });
    } else {
      employer = await Employer.findByPk(identifier, { paranoid: false });
    }

    if (!employer) {
      return res.status(404).json({ message: 'Employé non trouvé.' });
    }

    if (!employer.deleted_at) {
      return res.status(400).json({ message: 'Cet employé n\'est pas supprimé.' });
    }

    await employer.restore();

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'restore',
            target_id: employer.id,
            target_label: `${employer.nom} ${employer.prenom}`,
            description: `Employé ${employer.nom} ${employer.prenom} restauré.`,
        });

    res.status(200).json({
      message: 'Employé restauré avec succès.',
      data: employer
    });
  } catch (error) {
    console.error('Erreur restore:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 5e. Restauration multiple
exports.bulkRestoreEmployers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Aucun ID fourni.' });
    }

    await Employer.restore({ where: { id: { [Op.in]: ids } } });

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'bulk_restore',
            target_id: null,
            target_label: `${ids.length} employé(s)`,
            description: `Restauration en masse de ${ids.length} employé(s). IDs: ${ids.join(', ')}.`,
            new_values: { ids },
        });

    res.status(200).json({ message: `${ids.length} employé(s) restauré(s) avec succès.` });
  } catch (error) {
    console.error('Erreur bulk restore:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 5f. Suppression définitive (force delete)
exports.forceDeleteEmployer = async (req, res) => {
  try {
    const { identifier } = req.params;

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({ where: { slug: identifier }, paranoid: false });
    } else {
      employer = await Employer.findByPk(identifier, { paranoid: false });
    }

    if (!employer) {
      return res.status(404).json({ message: 'Employé non trouvé.' });
    }

    // Vérifier s'il a des données liées avant suppression définitive
    const [lignes, accomptes, absences, heures, primes, primesNuit] = await Promise.all([
      Navette.count({ where: { employer_id: employer.id }, paranoid: false }),
      EmployerAccompte.count({ where: { employer_id: employer.id }, paranoid: false }),
      EmployerAb.count({ where: { employer_id: employer.id }, paranoid: false }),
      EmployerHeure.count({ where: { employer_id: employer.id }, paranoid: false }),
      EmployerPrime.count({ where: { employer_id: employer.id }, paranoid: false }),
      EmployerPrimeNuit.count({ where: { employer_id: employer.id }, paranoid: false }),
    ]);

    const total = lignes + accomptes + absences + heures + primes + primesNuit;
    if (total > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer définitivement : ${total} donnée(s) associée(s) existent.`
      });
    }

    await employer.destroy({ force: true }); // Suppression physique

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'force_delete',
            target_id: parseInt(req.params.identifier),
            target_label: `Employé #${req.params.identifier}`,
            description: `Employé #${req.params.identifier} supprimé définitivement.`,
        });

    res.status(200).json({ message: 'Employé supprimé définitivement.' });
  } catch (error) {
    console.error('Erreur force delete:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 6. Basculer le statut d'un employé (Activé/Désactivé)
exports.toggleEmployerStatus = async (req, res) => {
  try {
    const {
      identifier
    } = req.params; // ID ou SLUG

    let employer;
    if (isNaN(identifier)) {
      employer = await Employer.findOne({
        where: {
          slug: identifier
        }
      });
    } else {
      employer = await Employer.findByPk(identifier);
    }

    if (!employer) {
      return res.status(404).json({
        message: 'Employé non trouvé.'
      });
    }

    // Inverse le statut actuel
    employer.status = employer.status === 'Activé' ? 'Désactivé' : 'Activé';
    await employer.save();

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'toggle_status',
            target_id: employer.id,
            target_label: `${employer.nom} ${employer.prenom}`,
            description: `Statut de l'employé ${employer.nom} ${employer.prenom} changé en ${employer.status}.`,
            new_values: { status: employer.status },
        });

    res.status(200).json({
      message: `Statut de l'employé mis à jour avec succès en '${employer.status}'.`,
      data: employer
    });
  } catch (error) {
    console.error('Erreur lors du basculement du statut de l\'employé :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors du basculement du statut de l\'employé.',
      error: error.message
    });
  }
};

exports.importEmployersFromExcel = async (req, res) => {
  try {
    const { service_id, is_importer, is_paie, is_admin, is_superadmin } = req.user;
    if (!req.file) {
      return res.status(400).json({
        message: 'Aucun fichier n\'a été uploadé.'
      });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Utilise raw: false pour forcer xlsx à convertir les dates et les nombres.
    // dateNF: 'DD/MM/YYYY' aide à la lisibilité des dates si elles sont retournées comme chaînes.
    const data = xlsx.utils.sheet_to_json(sheet, { raw: false, dateNF: 'DD/MM/YYYY' });

    const results = {
      created: 0,
      updated: 0,
      errors: [],    // lignes bloquées (matricule manquant, erreur technique)
      warnings: [],  // lignes traitées mais avec champs ignorés
    };

    const created_by_user_id = req.user ? req.user.id : null;

    // -- 2. Pré-chargement des Services (Optimisation) --
    // Recherche des services une seule fois pour éviter N requêtes SQL
    const allServices = await Service.findAll({ attributes: ['id', 'name'] });
    const serviceMap = new Map(allServices.map(s => [s.name.toUpperCase().trim(), s.id])); // Stocke Nom -> ID

    // Regex email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation d'une date — retourne null si invalide, jamais d'exception
    const parseDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    // Trim safe
    const trim = (val) => (typeof val === 'string' ? val.trim() : String(val || '').trim());

    // -- 3. Traitement Ligne par Ligne --
    for (const row of data) {
      const warnings = []; // avertissements non-bloquants pour cette ligne
      try {
        // -- MAPPING --
        const matricule = trim(row.Matricule);
        const nom       = trim(row.Nom);
        const prenom    = trim(row.Prenoms);

        // Le matricule est le seul champ obligatoire
        if (!matricule) {
          results.errors.push({ matricule: '—', message: 'Colonne Matricule absente ou vide. Ligne ignorée.' });
          continue;
        }

        // -- Champs optionnels — validation souple --

        // Service
        let parsedServiceId = null;
        const service_nom = trim(row.Service);
        if (service_nom) {
          parsedServiceId = serviceMap.get(service_nom.toUpperCase());
          if (!parsedServiceId) {
            warnings.push(`Service "${service_nom}" introuvable — champ ignoré`);
          }
        }

        // Email — format validé, sinon ignoré
        let parsedEmail = null;
        const emailRaw = trim(row.Email);
        if (emailRaw) {
          if (emailRegex.test(emailRaw)) {
            parsedEmail = emailRaw;
          } else {
            warnings.push(`Email "${emailRaw}" invalide — champ ignoré`);
          }
        }

        // Genre — ENUM strict, sinon ignoré
        let parsedGenre = null;
        const genreRaw = trim(row.Genre);
        if (genreRaw) {
          const g = genreRaw.toUpperCase();
          if (g === 'HOMME' || g === 'H' || g === 'M') parsedGenre = 'Homme';
          else if (g === 'FEMME' || g === 'F') parsedGenre = 'Femme';
          else warnings.push(`Genre "${genreRaw}" non reconnu — champ ignoré`);
        }

        // Type départ — ENUM strict, sinon ignoré
        const VALID_DEPARTS = ['DEMISSION', 'RETRAITE', 'DECES', 'LICENCIEMENT'];
        let parsedTypeDepart = null;
        const typeDepartRaw = trim(row.Type_depart);
        if (typeDepartRaw) {
          if (VALID_DEPARTS.includes(typeDepartRaw.toUpperCase())) {
            parsedTypeDepart = typeDepartRaw.toUpperCase();
          } else {
            warnings.push(`Type_depart "${typeDepartRaw}" non reconnu — champ ignoré`);
          }
        }

        // Cadre
        const cadreRaw = trim(row.Cadre);
        const is_cadre_bool = cadreRaw ? cadreRaw.toUpperCase() === 'OUI' : undefined;

        // Dates — invalides => ignorées
        const parsedDateEmbauche = parseDate(row.Date_embauche);
        const parsedDateDepart   = parseDate(row.Date_depart);
        if (row.Date_embauche && !parsedDateEmbauche) warnings.push(`Date_embauche "${row.Date_embauche}" invalide — champ ignoré`);
        if (row.Date_depart   && !parsedDateDepart)   warnings.push(`Date_depart "${row.Date_depart}" invalide — champ ignoré`);

        // Poste
        const poste_occupe = trim(row.Poste_occupe) || null;

        // -- Recherche employé existant --
        let employer = await Employer.findOne({ where: { matricule }, paranoid: false });

        if (!is_admin && !is_superadmin && !is_importer && !is_paie && parsedServiceId && service_id != parsedServiceId) {
          continue; // pas de droit sur ce service
        }

        if (employer) {
          // ── MISE À JOUR : on ne touche QUE les champs non vides du fichier ──
          const updateData = { updated_at: new Date() };

          if (nom)                                     updateData.nom           = nom;
          if (prenom)                                  updateData.prenom        = prenom;
          if (parsedServiceId)                         updateData.service_id    = parsedServiceId;
          if (cadreRaw)                                updateData.is_cadre      = is_cadre_bool;
          if (parsedGenre)                             updateData.genre         = parsedGenre;
          if (poste_occupe)                            updateData.poste_occupe  = poste_occupe;
          if (parsedDateEmbauche)                      updateData.date_embauche = parsedDateEmbauche;
          if (parsedDateDepart)                        updateData.date_depart   = parsedDateDepart;
          if (parsedTypeDepart)                        updateData.type_depart   = parsedTypeDepart;

          // Email : vérification unicité seulement si fourni et différent
          if (parsedEmail && parsedEmail !== employer.email) {
            const emailTaken = await Employer.findOne({
              where: { email: parsedEmail, id: { [Op.ne]: employer.id } },
              paranoid: false
            });
            if (emailTaken) {
              warnings.push(`Email "${parsedEmail}" déjà utilisé par un autre employé — champ ignoré`);
            } else {
              updateData.email = parsedEmail;
            }
          }

          // Restaurer si soft-deleted
          if (employer.deleted_at) await employer.restore();

          await employer.update(updateData);
          results.updated++;

        } else {
          // ── CRÉATION : tous les champs valides, created_at obligatoire ──

          // Email : vérification unicité
          if (parsedEmail) {
            const emailTaken = await Employer.findOne({ where: { email: parsedEmail }, paranoid: false });
            if (emailTaken) {
              warnings.push(`Email "${parsedEmail}" déjà utilisé — champ ignoré`);
              parsedEmail = null;
            }
          }

          await Employer.create({
            matricule,
            nom:           nom           || null,
            prenom:        prenom        || null,
            email:         parsedEmail,
            poste_occupe:  poste_occupe,
            genre:         parsedGenre,
            service_id:    parsedServiceId,
            is_cadre:      is_cadre_bool !== undefined ? is_cadre_bool : false,
            date_embauche: parsedDateEmbauche,
            date_depart:   parsedDateDepart,
            type_depart:   parsedTypeDepart,
            created_by:    created_by_user_id,
            created_at:    new Date(),
            updated_at:    new Date(),
          });
          results.created++;
        }

        // Enregistrer les avertissements s'il y en a (ligne traitée mais avec champs ignorés)
        if (warnings.length > 0) {
          results.warnings.push({
            matricule,
            message: warnings.join(' | ')
          });
        }

      } catch (innerError) {
        console.error(`Erreur import matricule ${row.Matricule || '—'}:`, innerError);
        results.errors.push({
          matricule: row.Matricule || '—',
          message: `Erreur : ${innerError.message}`
        });
      }
    } // Fin boucle

    // -- 6. Nettoyage et Réponse --

    // Supprimer le fichier temporaire après traitement
    fs.unlink(filePath, (err) => {
      if (err) console.error('Erreur lors de la suppression du fichier temporaire :', err);
    });

        await ActivityLog.log(req, {
            module: 'employe',
            action: 'import_excel',
            target_id: null,
            target_label: `Import Excel`,
            description: `Import Excel: ${results.created} employé(s) créé(s), ${results.updated} mis à jour, ${results.errors.length} erreur(s).`,
            new_values: { created: results.created, updated: results.updated, errors: results.errors.length },
        });

    const totalIssues = results.errors.length + results.warnings.length;
    res.status(200).json({
      message: 'Importation des employés terminée.',
      summary: `Créés: ${results.created}, Mis à jour: ${results.updated}, Ignorés: ${results.errors.length}, Avertissements: ${results.warnings.length}`,
      details: totalIssues > 0 ? [
        ...results.errors.map(e => ({ ...e, type: 'erreur' })),
        ...results.warnings.map(w => ({ ...w, type: 'avertissement' })),
      ] : undefined,
    });

  } catch (error) {
    console.error('Erreur globale lors de l\'importation des employés :', error);
    res.status(500).json({
      message: 'Erreur interne du serveur lors de l\'importation des employés.',
      error: error.message
    });
  }
};

// ================================================
// EXPORT EXCEL — Liste complète des employés
// ================================================
exports.exportEmployersToExcel = async (req, res) => {
  try {
    // Charger employés ET services en parallèle
    const [employers, services] = await Promise.all([
      Employer.findAll({
        include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
        order: [['nom', 'ASC']],
      }),
      Service.findAll({ attributes: ['name'], order: [['name', 'ASC']] }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ProNavette';
    wb.created = new Date();

    /* ── Feuille cachée "Listes" avec les noms de services ── */
    const wsListes = wb.addWorksheet('Listes', { state: 'veryHidden' });
    wsListes.getCell('A1').value = 'Services';
    services.forEach((s, i) => {
      wsListes.getCell(`A${i + 2}`).value = s.name;
    });
    const serviceListRange = `Listes!$A$2:$A$${services.length + 1}`;

    /* ── Feuille principale "Employés" ── */
    const ws = wb.addWorksheet('Employés');

    // Définition des colonnes
    ws.columns = [
      { header: 'Matricule',    key: 'matricule',    width: 14 },
      { header: 'Nom',          key: 'nom',          width: 22 },
      { header: 'Prenoms',      key: 'prenom',       width: 24 },
      { header: 'Service',      key: 'service',      width: 26 },
      { header: 'Poste_occupe', key: 'poste_occupe', width: 26 },
      { header: 'Genre',        key: 'genre',        width: 10 },
      { header: 'Cadre',        key: 'cadre',        width: 8  },
      { header: 'Email',        key: 'email',        width: 28 },
      { header: 'Statut',       key: 'statut',       width: 12 },
      { header: 'Date_embauche',key: 'date_embauche',width: 16 },
      { header: 'Date_depart',  key: 'date_depart',  width: 16 },
      { header: 'Type_depart',  key: 'type_depart',  width: 16 },
    ];

    // Style de l'en-tête
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF2E4057' } },
      };
    });
    ws.getRow(1).height = 22;

    // Remplissage des données
    employers.forEach((emp) => {
      ws.addRow({
        matricule:    emp.matricule || '',
        nom:          emp.nom || '',
        prenom:       emp.prenom || '',
        service:      emp.service?.name || '',
        poste_occupe: emp.poste_occupe || '',
        genre:        emp.genre || '',
        cadre:        emp.is_cadre ? 'OUI' : 'NON',
        email:        emp.email || '',
        statut:       emp.status || '',
        date_embauche: emp.date_embauche
          ? new Date(emp.date_embauche).toLocaleDateString('fr-FR')
          : '',
        date_depart: emp.date_depart
          ? new Date(emp.date_depart).toLocaleDateString('fr-FR')
          : '',
        type_depart: emp.type_depart || '',
      });
    });

    // Plage de validation (lignes 2 à max 5000 pour couvrir les ajouts manuels)
    const maxRow = 5000;

    // Colonne D — Service : liste déroulante depuis feuille cachée
    if (services.length > 0) {
      ws.dataValidations.add(`D2:D${maxRow}`, {
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Service non reconnu',
        error: 'Veuillez choisir un service dans la liste ou laisser vide.',
        formulae: [serviceListRange],
      });
    }

    // Colonne F — Genre
    ws.dataValidations.add(`F2:F${maxRow}`, {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Genre invalide',
      error: 'Valeur attendue : Homme ou Femme.',
      formulae: ['"Homme,Femme"'],
    });

    // Colonne G — Cadre
    ws.dataValidations.add(`G2:G${maxRow}`, {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Cadre invalide',
      error: 'Valeur attendue : OUI ou NON.',
      formulae: ['"OUI,NON"'],
    });

    // Colonne L — Type_depart
    ws.dataValidations.add(`L2:L${maxRow}`, {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Type de départ invalide',
      error: 'Valeur attendue : DEMISSION, RETRAITE, DECES ou LICENCIEMENT.',
      formulae: ['"DEMISSION,RETRAITE,DECES,LICENCIEMENT"'],
    });

    // Figer la ligne d'en-tête
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Générer le buffer
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `employes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Erreur export Excel employés:', error);
    res.status(500).json({
      message: 'Erreur lors de l\'export Excel: ' + error.message,
    });
  }
};