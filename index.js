const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors'); 

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour parser le JSON et les requêtes URL-encoded
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Synchronisation de la base de données
const db = require('./app/models');

db.sequelize.authenticate()
  .then(() => {
    console.log('Connexion à la base de données établie avec succès.');

    // -------------------------------------------------
    // 🔔 CHARGEMENT DU CRON JOB APRES LA CONNEXION SQL
    // -------------------------------------------------
    require('./app/cron/applyScheduledMutations');
    console.log('Cron job des mutations programmé avec succès.');

    require('./app/cron/campagneDeadlineReminder');
    console.log('Cron job des rappels campagne programmé avec succès.');

    require('./app/cron/autoLaunchCampagnes');
    console.log('Cron job auto-launch campagnes programmé avec succès.');

    require('./app/cron/autoCloseNavettes');
    console.log('Cron job auto-close navettes programmé avec succès.');
    // -------------------------------------------------

  })
  .catch(err => {
    console.error('Impossible de se connecter à la base de données :', err);
    process.exit(1);
  });

// --- Importation et utilisation des routes ---
const authRoutes = require('./app/routes/v1/auth.routes'); 
const userRoutes = require('./app/routes/v1/user.routes');
const serviceRoutes = require('./app/routes/v1/service.routes');
const roleRoutes = require('./app/routes/v1/role.routes');
const permissoinRoutes = require('./app/routes/v1/permission.routes');
const employesRoutes = require('./app/routes/v1/employer.routes');
const navetteRoutes = require('./app/routes/v1/navette.routes');
const mutationRoutes = require('./app/routes/v1/employermutation.routes');
const statsRoutes = require('./app/routes/v1/stats.routes');
const notificationRoutes = require('./app/routes/v1/notification.routes');
const employerHistoryRoutes = require('./app/routes/v1/employerhistory.routes');
const campagneRoutes = require('./app/routes/v1/campagne.routes');
const activityLogRoutes = require('./app/routes/v1/activitylog.routes');

// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API PRONAVETTE !');
});

app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissoinRoutes);
app.use('/api/employes', employesRoutes);
app.use('/api/navettes', navetteRoutes);
app.use('/api/mutations', mutationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employer-history', employerHistoryRoutes);
app.use('/api/campagnes', campagneRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur PRONAVETTE démarré sur le port ${port}`);
  console.log(`Accédez à l'API via : http://localhost:${port}`);
  console.log(`Dossier statique servi depuis : ${path.join(__dirname, 'public')}`);
});