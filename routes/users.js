const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../datastore/datastore');

const datastore = ds.datastore;

const USER = 'User';

router.use(bodyParser.json());

/* ----------- Begin Model Functions ----------- */


/* ----------- End Model Functions ----------- */

/* ----------- Begin Controller Functions ----------- */


/* ----------- End Controller Functions ----------- */

module.exports = router;

