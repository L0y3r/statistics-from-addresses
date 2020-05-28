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
      results[0].address_components.filter(({ types, long_name }) => {
        if (types.includes(desiredType)) {
          byTypeObj[long_name]
            ? (byTypeObj[long_name] += 1)
            : (byTypeObj[long_name] = 1);
        }
      });
    }

    return byTypeObj;
  }, {});

const generateAddressesResolved = (objectPromises) =>
  Object.entries(objectPromises).reduce(
    async (dataObjP, [color, addressesArrayPromises]) => {
      const dataObj = await dataObjP;
      const addresses = await Promise.all(addressesArrayPromises);

      dataObj[color] = addresses;

      return dataObj;
    },
    Promise.resolve({})
  );

const classifyAddresses = (addresses, type) =>
  Object.entries(addresses).reduce((dataObj, [color, addressesArray]) => {
    const addresses = countByType(addressesArray, type);
    dataObj[color] = addresses;

    return dataObj;
  }, {});

const chunkArray = (originalArray, denominator) => {
  const splitedArray = [];

  while (originalArray.length) {
    splitedArray.push(originalArray.splice(0, denominator));
  }

  return splitedArray;
};

const saveData = (filename, data) =>
  fs.writeFileSync(filename, JSON.stringify(data), 'utf8');

const readJSONData = (filename) => JSON.parse(fs.readFileSync(filename));

const ADDRESSES = readJSONData(process.env.JSON_FILE);

const { nodes } = ADDRESSES;

const rawNodesData = nodes.reduce((dataObj, node) => {
  const { color } = node;
  if (!dataObj[color]) {
    dataObj[color] = [];
  }

  node.attributes.location
    ? dataObj[color].push(createRequest(node.attributes.location))
    : null;

  return dataObj;
}, {});

generateAddressesResolved(rawNodesData).then((addressesResolved) => {
  saveData('./assets/resolved-addresses.json', addressesResolved);
  const generatedStatistics = classifyAddresses(addressesResolved, 'country');
  saveData('./assets/generated-statistics.json', generatedStatistics);
});
