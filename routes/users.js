const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../datastore/datastore');

const checkJwt = require('../lib/middleware/checkJwt');

const datastore = ds.datastore;

const USER = 'User';

router.use(bodyParser.json());

/* ----------- Begin Model Functions ----------- */

function check_user_exists(user_sub) {
	const q = datastore.createQuery(USER).filter('sub', '=', user_sub);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(ds.fromDatastore)[0];
	});
}

function get_all_users() {
	const q = datastore.createQuery(USER);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(ds.fromDatastore);
	});
}

function post_user(unique_sub) {
	const key = datastore.key(USER);
	const user = { sub: unique_sub, boats: [] };
	return datastore.save({ key: key, data: user }).then((key) => {
		return key;
	});
}
/* ----------- End Model Functions ----------- */

/* ----------- Begin Controller Functions ----------- */

router.get('/', (req, res) => {
	const accepts = req.accepts([ 'application/json' ]);
	if (!accepts) {
		res.status(406).send({ Error: 'Not acceptable.' });
	} else if (accepts === 'application/json') {
		get_all_users().then((users) => {
			users.forEach((el) => {
				el.boats.forEach((boat) => {
					boat.self = req.protocol + '://' + req.get('host') + '/boats/' + boat.id;
				});
			});

			res.status(200).json(users);
		});
	}
});

router.post(
	'/',
	checkJwt,
	(err, req, res, next) => {
		if (err.name === 'UnauthorizedError') {
			res.status(err.status).end();
		}
	},
	(req, res) => {
		if (!req.JWTError) {
			const accepts = req.accepts([ 'application/json' ]);
			if (!accepts) {
				res.status(406).send({ Error: 'Not acceptable.' });
			} else if (accepts === 'application/json') {
				check_user_exists(req.user.sub).then((user) => {
					if (user) {
						res.status(403).send({"Error": "User already exists."});
					} else {
						post_user(req.user.sub).then((key) => {
							res.status(201).send({
								id    : key.id,
								sub   : req.user.sub,
								boats : []
							});
						});
					}
				})
			}
		} else {
			res.status(401).send({ Error: 'Invalid JWT.' });
		}
	}
);

router.delete('/', (req, res) => {
	res.set('Accept', 'GET, POST');
	res.status(405).end()
});

router.put('/', (req, res) => {
	res.set('Accept', 'GET, POST');
	res.status(405).end()
});

router.patch('/', (req, res) => {
	res.set('Accept', 'GET, POST');
	res.status(405).end()
});

router.get('/:sub', (req, res) => {
	check_user_exists(req.params.sub).then((user) => {
		if (user) {
			user.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + user.sub;

			user.boats.forEach((boat) => {
				boat.loads.forEach((load) => {
					load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id;
				});

				boat.self = req.protocol + '://' + req.get('host') + '/boats/' + boat.id;
			});
			
			res.status(200).json(user);
		} else {
			res.status(404).send({ Error: 'No user with this unique sub exists.' });
		}
	});
});

/* ----------- End Controller Functions ----------- */

module.exports = router;
module.exports.check_user_exists = check_user_exists;
