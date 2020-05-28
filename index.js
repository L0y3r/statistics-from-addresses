'use strict';

require('dotenv').config();
const fs = require('fs');
const https = require('https');

const WAIT_TIME = 2000;

const genGoogleMapsURL = (address) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
    address
  )}&key=${process.env.API_KEY}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createRequest = (address) =>
  new Promise((resolve, reject) => {
    https
      .get(genGoogleMapsURL(address), (response) => {
        let data = '';

        response.on('data', (chunk) => (data += chunk));

        response.on('end', () =>
          resolve({
            address,
            response: JSON.parse(data),
          })
        );
      })
      .on('error', (error) => reject(error));
  });

const countByType = (addresses, desiredType) =>
  addresses.reduce(
    (byTypeObj, { response, address }) => {
      if (response.status === 'OK') {
        response.results[0].address_components.filter(
          ({ types, long_name }) => {
            if (types.includes(desiredType)) {
              byTypeObj[long_name]
                ? (byTypeObj[long_name] += 1)
                : (byTypeObj[long_name] = 1);
            }
          }
        );
      } else if (response.status === 'OVER_QUERY_LIMIT') {
        byTypeObj.rejected.push(address);
      }

      return byTypeObj;
    },
    { rejected: [] }
  );

const generateAddressesResolved = (objectPromises) =>
  Object.entries(objectPromises).reduce(
    async (dataObjP, [color, addressesArrayPromises]) => {
      const dataObj = await dataObjP;
      const addresses = chunkArray(
        addressesArrayPromises,
        10
      ).map((addressesArrayP) => Promise.all(addressesArrayP));

      let addressResolved = [];
      for (let index = 0; index < addresses.length; index++) {
        const resolved = await addresses[index];
        await sleep(WAIT_TIME);
        addressResolved = addressResolved.concat(...resolved);
      }
      dataObj[color] = addressResolved;

      return dataObj;
    },
    Promise.resolve({})
  );

const classifyAddresses = (addresses, type) =>
  Object.entries(addresses).reduce(
    async (dataObjP, [color, addressesArray]) => {
      const dataObj = await dataObjP;
      const addresses = countByType(addressesArray, type);
      dataObj[color] = addresses;

      while (dataObj[color].rejected.length !== 0) {
        const newAddressesP = await tryRequest(dataObj[color].rejected);
        const newAddresses = countByType(newAddressesP, type);

        const newAddressesArray = Object.entries(newAddresses);
        for (let index = 0; index < newAddressesArray.length; index++) {
          const [country, counter] = newAddressesArray[index];
          typeof dataObj[color][country] === 'number'
            ? (dataObj[color][country] += counter)
            : (dataObj[color][country] = counter);
        }
      }
      delete dataObj[color].rejected;

      return dataObj;
    },
    Promise.resolve({})
  );

const tryRequest = async (rejectedAddresses) => {
  const promisesAddresses = chunkArray(
    rejectedAddresses.map((rejectedAddress) => createRequest(rejectedAddress)),
    10
  ).map((addressesArrayP) => Promise.all(addressesArrayP));
  let addressResolved = [];
  for (let index = 0; index < promisesAddresses.length; index++) {
    const resolved = await promisesAddresses[index];
    await sleep(WAIT_TIME);
    addressResolved = addressResolved.concat(...resolved);
  }

  return addressResolved;
};

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
  classifyAddresses(addressesResolved, 'country').then((generatedStatistics) =>
    saveData('./assets/generated-statistics.json', generatedStatistics)
  );
});
