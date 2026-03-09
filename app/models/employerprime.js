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
    'PRIME DE TRANSPORT DE NUIT': 'CL22',
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
        'PRIME DE TRANSPORT DE NUIT',
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
