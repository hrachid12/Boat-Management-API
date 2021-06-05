const express = require('express');
const router = express.Router();

const userInViews = require('../lib/middleware/userInViews');

router.use(userInViews());
router.use('/boats', require('./boats'));
router.use('/loads', require('./loads'));
router.use('/users', require('./users'));
router.use('/', require('./auth'));

router.get('/', (req, res) => {
	res.render('home');
})

module.exports = router;
