'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Ajout de la valeur 'campagne_rappel' à l'ENUM 'type' de la table notifications
        await queryInterface.sequelize.query(
            "ALTER TABLE notifications MODIFY COLUMN type ENUM('navette_lancee','navette_validee','navette_correction','navette_envoi_paie','navette_signalement','navette_cloturee','mutation_creee','mutation_confirmee','mutation_rejetee','mutation_annulee','employe_importe','campagne_rappel','general') DEFAULT 'general';"
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(
            "ALTER TABLE notifications MODIFY COLUMN type ENUM('navette_lancee','navette_validee','navette_correction','navette_envoi_paie','navette_signalement','navette_cloturee','mutation_creee','mutation_confirmee','mutation_rejetee','mutation_annulee','employe_importe','general') DEFAULT 'general';"
        );
    },
};
