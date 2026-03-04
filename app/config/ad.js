require('dotenv').config();

const ActiveDirectory = require('activedirectory2');

const config = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASEDN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD
};

const ad = new ActiveDirectory(config);
module.exports = ad;
