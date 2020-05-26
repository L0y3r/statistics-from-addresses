'use strict';

require('dotenv').config();
const fs = require('fs');

const genGoogleMapsURL = (address) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
    address
  )}&key=${process.env.API_KEY}`;

const ADDRESSES = JSON.parse(fs.readFileSync(process.env.JSON_FILE));

const { nodes } = ADDRESSES;

const classifyData = nodes.reduce((dataObj, node) => {
  const { color } = node;
  if (!dataObj[color]) {
    dataObj[color] = [];
  }

  node.attributes.location
    ? dataObj[color].push(node.attributes.location)
    : null;

  return dataObj;
}, {});

console.log(classifyData);
