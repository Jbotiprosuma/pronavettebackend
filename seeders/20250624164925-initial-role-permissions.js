'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Récupérer tous les rôles et permissions
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id, name FROM roles;`
    );
    const [permissions] = await queryInterface.sequelize.query(
      `SELECT id, name FROM permissions;`
    );

    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });

    const permissionMap = {};
    permissions.forEach(permission => {
      permissionMap[permission.name] = permission.id;
    });

    // 2. Définir les associations Rôles-Permissions
    const role_permissions = [];

    // Fonction utilitaire pour ajouter une permission à un rôle
    const addPermissionToRole = (roleName, permissionName) => {
      if (roleMap[roleName] && permissionMap[permissionName]) {
        role_permissions.push({
          role_id: roleMap[roleName],
          permission_id: permissionMap[permissionName],
          created_at: new Date(),
          updated_at: new Date()
        });
      } else {
        console.warn(`[WARNING] Role or Permission not found for: ${roleName} - ${permissionName}`);
        console.warn(`[WARNING] Role or Permission not found for: ${roleMap[roleName]} - ${permissionMap[permissionName]}`);
      }
    };

    // --- SuperAdmin (Accès complet) ---
    // Attribuer toutes les permissions au SuperAdmin
    permissions.forEach(p => addPermissionToRole('superadmin', p.name));

    // --- Admin ---
    // L'admin gère les utilisateurs de base, les campagnes principales, prix
    addPermissionToRole('admin', 'user.manage');
    addPermissionToRole('admin', 'navette.manage');
    addPermissionToRole('admin', 'navette.edit');
    addPermissionToRole('admin', 'navette.read');
    addPermissionToRole('admin', 'employers.manage');
    addPermissionToRole('admin', 'mutation.manage');
    addPermissionToRole('admin', 'mutation.service.manage');
    addPermissionToRole('admin', 'employers.service.manage');
    addPermissionToRole('admin', 'employers.service.edit');
    addPermissionToRole('admin', 'import.manage');
   

    // Admin n'a pas accès à la suppression de campagne ou à la gestion des rôles/permissions.

    // --- manager ---
    addPermissionToRole('manager', 'navette.manage');
    addPermissionToRole('manager', 'navette.edit');
    addPermissionToRole('manager', 'navette.read');
    addPermissionToRole('manager', 'mutation.service.manage');
    addPermissionToRole('manager', 'employers.service.manage');

    // --- representant ---
    addPermissionToRole('representant', 'navette.edit');
    addPermissionToRole('representant', 'employers.service.edit');
    addPermissionToRole('representant', 'mutation.service.edit');

    // --- paie ---
    addPermissionToRole('paie', 'import.manage');
    addPermissionToRole('paie', 'navette.read');
    addPermissionToRole('paie', 'employers.manage');
    addPermissionToRole('paie', 'navette.manage');
    addPermissionToRole('paie', 'mutation.manage');

    // --- importer ---
    addPermissionToRole('importer', 'import.manage');
    addPermissionToRole('importer', 'employers.manage');

    // 3. Insérer les associations dans la table role_permissions
    await queryInterface.bulkInsert('role_permissions', role_permissions, {});
  },

  async down(queryInterface, Sequelize) {
    // Supprimer toutes les associations en cas de rollback du seeder
    await queryInterface.bulkDelete('role_permissions', null, {});
  }
};