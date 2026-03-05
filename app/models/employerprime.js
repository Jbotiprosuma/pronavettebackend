// models/employerprime.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  // Mapping type ENUM -> Code CLxx
  const PRIME_CODE_MAP = {
    'PRIME CAISSE': 'CL25',
    'PRIME IMPOSABLE': 'CL19',
    'PRIME ASTREINTE': 'CL04',
    'PRIME DE FRAIS': 'CL24',
    'PRIME TENUE': 'CL15',
    'PRIME INVENTAIRE': 'CL23',
    'PRIME DE PANIER': 'CL06',
    'PRIME DE TRANSPORT': 'CL13',
    'PRIME DE FIN D ANNEE': 'CL20',
    'PRIME FIXE IMPOSABLE': 'CL26',
    'PRIME FIXE NON IMPOSABLE': 'CL21',
    'PRIME DIVERS': 'CL10',
    'PRIME SURSALAIRE': 'CL01',
    'PRIME RAPPEL AUGMENTATION': 'CL02',
    'PRIME SEMESTRIELLE': 'CL08',
    'PRIME DE DEPART': 'CL16',
    'PRIME FRAIS FUNERAIRES': 'CL17',
    'PRIME ASTREINTE PROXIMITE': 'CL53',
    'PRIME CAISSE PROXIMITE': 'CL54',
    'PRIME JOUR SUPPLEMENTAIRE': 'CL64',
    'PRIME VACCINATION': '3631',
    'INDEMNITE PREAVIS': '1800',
    'INDEMNITE AGGRAVATION': '1810',
    'INDEMNITE LICENCIEMENT IMPOSABLE': '1900',
    'INDEMNITE DECES IMPOSABLE': '1910',
    'INDEMNITE RETRAITE IMPOSABLE': '1920',
    'INDEMNITE DEPART CDD IMPOSABLE': '1980',
    'INDEMNITE LICENCIEMENT NON IMPOSABLE': '3150',
    'INDEMNITE DECES NON IMPOSABLE': '3152',
    'INDEMNITE RETRAITE NON IMPOSABLE': '3154',
    'INDEMNITE FIXE DEPART NON IMPOSABLE': '3160',
    'INDEMNITE DEPART CDD NON IMPOSABLE': '3162'
  };


  class EmployerPrime extends Model {
    static associate(models) {
      EmployerPrime.belongsTo(models.Employer, {
        foreignKey: 'employer_id',
        as: 'employer'
      });
      EmployerPrime.belongsTo(models.Navette, {
        foreignKey: 'navette_id',
        as: 'navette'
      });
      EmployerPrime.belongsTo(models.NavetteLigne, {
        foreignKey: 'navette_ligne_id',
        as: 'navette_ligne'
      });
    }
  }

  EmployerPrime.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    employer_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    navette_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    navette_ligne_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    montant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    type_prime: {
      type: DataTypes.ENUM(
        'PRIME CAISSE',
        'PRIME IMPOSABLE',
        'PRIME ASTREINTE',
        'PRIME DE FRAIS',
        'PRIME TENUE',
        'PRIME INVENTAIRE',
        'PRIME DE PANIER',
        'PRIME DE TRANSPORT',
        'PRIME DE FIN D ANNEE',
        'PRIME FIXE IMPOSABLE',
        'PRIME FIXE NON IMPOSABLE',
        'PRIME DIVERS',
        'PRIME SURSALAIRE',
        'PRIME RAPPEL AUGMENTATION',
        'PRIME SEMESTRIELLE',
        'PRIME DE DEPART',
        'PRIME FRAIS FUNERAIRES',
        'PRIME ASTREINTE PROXIMITE',
        'PRIME CAISSE PROXIMITE',
        'PRIME JOUR SUPPLEMENTAIRE',
        'PRIME VACCINATION',
        'INDEMNITE PREAVIS',
        'INDEMNITE AGGRAVATION',
        'INDEMNITE LICENCIEMENT IMPOSABLE',
        'INDEMNITE DECES IMPOSABLE',
        'INDEMNITE RETRAITE IMPOSABLE',
        'INDEMNITE DEPART CDD IMPOSABLE',
        'INDEMNITE LICENCIEMENT NON IMPOSABLE',
        'INDEMNITE DECES NON IMPOSABLE',
        'INDEMNITE RETRAITE NON IMPOSABLE',
        'INDEMNITE FIXE DEPART NON IMPOSABLE',
        'INDEMNITE DEPART CDD NON IMPOSABLE'
      ),
      allowNull: false
    },
    code_prime: {
      type: DataTypes.STRING,
      allowNull: true
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'EmployerPrime',
    tableName: 'employer_primes',
    timestamps: true,
    paranoid: true,
    underscored: true,
    hooks: {
      beforeCreate: (prime, options) => {
        prime.code_prime = PRIME_CODE_MAP[prime.type_prime];
      },

      beforeUpdate: (prime, options) => {
        prime.code_prime = PRIME_CODE_MAP[prime.type_prime];
      }

    }
  });
  return EmployerPrime;
};
