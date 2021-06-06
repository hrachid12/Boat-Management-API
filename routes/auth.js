const express = require('express');
const router = express.Router();

const bodyParser = require('body-parser');
router.use(bodyParser.json());

const request = require('request');
const multer = require('multer');
const upload = multer();

const dotenv = require('dotenv');
dotenv.config();

const checkJwt = require('../lib/middleware/checkJwt');

/* ----------- Begin Controller Functions ----------- */

router.get('/login', (req, res) => {
	res.render('login');
});

router.get('/user', (req, res) => {
	res.redirect('/login');
});

router.post('/user', upload.none(), (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	var options = {
		method  : 'POST',
		url     : `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
		headers : { 'content-type': 'application/json' },
		body    : {
			grant_type    : 'password',
			username      : username,
			password      : password,
			client_id     : process.env.AUTH0_CLIENT_ID,
			client_secret : process.env.AUTH0_CLIENT_SECRET
		},
		json    : true
	};
	request(options, (error, response, body) => {
		if (error) {
			res.status(500).send(error);
		} else {
			let options_new = {
				method  : 'POST',
				url     : req.protocol + '://' + req.get('host') + req.baseUrl + `/get_id`,
				headers : { 'content-type': 'application/json', Authorization: `Bearer ${body.id_token}` },
				body    : {},
				json    : true
			};
			request(options_new, (error_new, response_new, body_new) => {
				res.render('JWT', { body: body, user: body_new.user });
			});
		}
	});
});

router.post(
	'/get_id',
	checkJwt,
	(err, req, res, next) => {
		if (err.name === 'UnauthorizedError') {
			res.redirect('/login');
		}
	},
	(req, res) => {
		if (!req.JWTError) {
			res.status(200).send({ user: req.user });
		} else {
			res.send('try again');
		}
	}
);

router.get('/signup', (req, res) => {
	res.render('create_acc');
});

router.post('/signup', upload.none(), (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	var options = {
		method  : 'POST',
		url     : `https://${process.env.AUTH0_DOMAIN}/dbconnections/signup`,
		headers : { 'content-type': 'application/json' },
		body    : {
			email      : username,
			password   : password,
			client_id  : process.env.AUTH0_CLIENT_ID,
			connection : process.env.DB_CON
		},
		json    : true
	};
	request(options, (error, response, body) => {
		if (error) {
			res.status(500).send(error);
		} else if (body.error) {
			res.render('login', { msg: body.error });
		} else {
			res.render('login', { msg: 'Account creation successful. Please login below.' });
		}
	});
});

/* ----------- End Controller Functions ----------- */

module.exports = router;
