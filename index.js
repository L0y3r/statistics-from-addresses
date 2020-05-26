require('dotenv').config();

const genGoogleMapsURL = (address) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
    address
  )}&key=${process.env.API_KEY}`;
