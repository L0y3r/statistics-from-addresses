'use strict';

require('dotenv').config();
const fs = require('fs');

const genGoogleMapsURL = (address) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
    address
  )}&key=${process.env.API_KEY}`;

const ADDRESSES = JSON.parse(fs.readFileSync(process.env.JSON_FILE));

const { nodes } = ADDRESSES;

console.log(nodes);
