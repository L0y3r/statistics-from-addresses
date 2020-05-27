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

        response.on('end', () => resolve(JSON.parse(data)));
      })
      .on('error', (error) => reject(error));
  });
  
const countByType = (addresses, desiredType) =>
addresses.reduce((byTypeObj, { results, status }) => {
  if (status === 'OK') {
    results[0].address_components.filter(
      ({ types, long_name }) => {
        if (types.includes(desiredType)) {
          byTypeObj[long_name]
            ? (byTypeObj[long_name] += 1)
            : (byTypeObj[long_name] = 0);
        }
      }
    );
  }

  return byTypeObj;
}, {});

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

const generateStatistics = Object.entries(classifyData).reduce(
  async (dataObj, [color, addressesArray]) => {
    try {
      const addresses = await Promise.all(addressesArray);

      dataObj[color] = countByType(address, 'country');
    } catch (error) {
      console.error('Error: ', error);
    }

    return dataObj;
  },
  {}
);
