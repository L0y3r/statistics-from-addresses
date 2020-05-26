'use strict';

require('dotenv').config();
const fs = require('fs');
const https = require('https');

const genGoogleMapsURL = (address) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
    address
  )}&key=${process.env.API_KEY}`;

const createRequest = (address) =>
  new Promise((resolve, reject) => {
    https
      .get(genGoogleMapsURL(address), (response) => {
        let data = '';

        response.on('data', (chunk) => (data += chunk));

        response.on('end', () => resolve(JSON.parse(data).explanation));
      })
      .on('error', (error) => reject(error));
  });

const ADDRESSES = JSON.parse(fs.readFileSync(process.env.JSON_FILE));

const { nodes } = ADDRESSES;

const classifyData = nodes.reduce((dataObj, node) => {
  const { color } = node;
  if (!dataObj[color]) {
    dataObj[color] = [];
  }

  node.attributes.location
    ? dataObj[color].push(createRequest(node.attributes.location))
    : null;

  return dataObj;
}, {});

console.log(classifyData);
