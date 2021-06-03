const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const secured = require('../lib/middleware/secured');
const ds = require('../datastore/datastore');

const datastore = ds.datastore;

const USER = 'User';

router.use(bodyParser.json());

/* ----------- Begin Model Functions ----------- */

/* ----------- End Model Functions ----------- */

/* ----------- Begin Controller Functions ----------- */

router.get('/:u_id', secured(), function(req, res, next) {
	const { _raw, _json, ...userProfile } = req.user;
	res.render('user', {
		userProfile : JSON.stringify(userProfile, null, 2),
		title       : 'Profile page'
	});
});

/* ----------- End Controller Functions ----------- */

module.exports = router;
