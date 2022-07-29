const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {
  const queryString = `SELECT * FROM users
  WHERE email = $1`;
  return pool
    .query(queryString, [email.toLowerCase()])
    .then(res => res.rows[0])
    .catch(err => null);
};

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  const queryString = `SELECT * FROM users WHERE id = $1;`
  const values = [id]
  return pool
  .query(queryString, values)
  .then(res => res.rows[0])
  .catch(err => null);
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES($1, $2, $3)
  RETURNING *;`
  const values = [user.name, user.email, user.password];
  return pool
  .query(queryString, values)
  .then(res => res.rows[0])
  .catch(err => null)
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = (guest_id, limit = 10) => {
  const queryString = `
  SELECT properties.*, reservations.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1 AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2
;`
const values = [guest_id, limit];
return pool
.query(queryString, values)
.then(res => res.rows)
.catch(err => null);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = (options, limit = 10) => {
  let queryParams = [];
  let queryString = `SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id \n`;

  if (options.city) {
    queryParams.push(`%${options.city}%`)
    queryString += `WHERE city LIKE $${queryParams.length} \n`;
  }

  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}`)
    queryString += `AND owner_id = $${queryParams.length} \n`;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(`%${options.minimum_price_per_night*100}`);
    queryParams.push(`%${options.maximum_price_per_night*100}`);
    queryString += `AND cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} \n`;
  }
  queryString += `GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(`%${options.minimum_rating}`);
    queryString += `HAVING avg(rating) >= $${queryParams.length} \n`;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams)
  .then(res => res.rows);
};

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
