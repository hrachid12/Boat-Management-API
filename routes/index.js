const express = require('express');
const router = express.Router();

const userInViews = require('../lib/middleware/userInViews');

router.use(userInViews());
router.use('/boats', require('./boats'));
router.use('/loads', require('./loads'));
router.use('/users', require('./users'));
router.use('/', require('./auth'));

router.get('/', function(req, res, next) {
	// res.render('index', { title: 'CS493 Final Project' });

	res.render('home', { user: res.locals.user });
});

module.exports = router;
