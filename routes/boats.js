const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const dotenv = require('dotenv');
const checkJwt = require('../lib/middleware/checkJwt');

const ds = require('../datastore/datastore');
const ld = require('./loads');
const us = require('./users');
const datastore = ds.datastore;
const BOAT = 'Boat';

router.use(bodyParser.json());

dotenv.config();

/* ----------- Begin Model Functions ----------- */

function get_num_boats(req) {
	let q = datastore.createQuery(BOAT).filter('owner.sub', '=', req.user.sub);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(ds.fromDatastore).length;
	});
}

const post_boat = (name, type, length, owner_sub) => {
	const key = datastore.key(BOAT);
	const new_boat = { name: name, type: type, length: length, owner: { sub: owner_sub }, loads: [] };
	return datastore.save({ key: key, data: new_boat }).then(() => {
		return key;
	});
};

const get_all_boats = async (req) => {
	let q = datastore.createQuery(BOAT).filter('owner.sub', '=', req.user.sub).limit(5);
	const results = {};

	results.total = await get_num_boats(req);

	if (Object.keys(req.query).includes('cursor')) {
		q = q.start(decodeURIComponent(req.query.cursor));
	}

	return datastore.runQuery(q).then((entities) => {
		results.items = entities[0].map(ds.fromDatastore);
		if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
			results.next =
				req.protocol +
				'://' +
				req.get('host') +
				req.baseUrl +
				'?cursor=' +
				encodeURIComponent(entities[1].endCursor);
		}
		return results;
	});
};

const get_boat = (bid) => {
	const key = datastore.key([ BOAT, parseInt(bid, 10) ]);
	const q = datastore.createQuery(BOAT).filter('__key__', '=', key);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(ds.fromDatastore)[0];
	});
};

const delete_boat = (bid) => {
	const key = datastore.key([ BOAT, parseInt(bid, 10) ]);
	return datastore.delete(key);
};

const add_load_to_boat = async (bid, lid, boat) => {
	const key = datastore.key([ BOAT, parseInt(bid, 10) ]);
	boat.loads.push({ id: lid });
	const new_boat = { name: boat.name, type: boat.type, length: boat.length, loads: boat.loads, owner: boat.owner };
	await datastore.save({ key: key, data: new_boat });

	const q = datastore.createQuery(BOAT).filter('__key__', '=', key);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(ds.fromDatastore)[0];
	});
};

const remove_load_from_boat = (bid, lid, boat) => {
	const key = datastore.key([ BOAT, parseInt(bid, 10) ]);
	let new_loads = [];

	boat.loads.forEach((load) => {
		if (load.id === lid) {
			return;
		}
		new_loads.push(load);
	});

	const new_boat = { name: boat.name, type: boat.type, length: boat.length, loads: new_loads, owner: boat.owner };
	return datastore.save({ key: key, data: new_boat }).then(() => {
		return key;
	});
};

function update_boat(name, type, length, loads, owner, bid) {
	const key = datastore.key([ BOAT, parseInt(bid, 10) ]);
	const updated_boat = { name: name, type: type, length: length, loads: loads, owner: owner };
	return datastore.save({ key: key, data: updated_boat }).then(() => {
		return key;
	});
}

/* ----------- End Model Functions ----------- */

/* ----------- Begin Controller Functions ----------- */

router.get(
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
				us.check_user_exists(req.user.sub).then((user) => {
					if (user) {
						const boats = get_all_boats(req).then((ret_obj) => {
							ret_obj.items.forEach((el) => {
								el.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + el.id;

								el.loads.forEach((load) => {
									load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id;
								});
							});
							res.status(200).json(ret_obj);
						});
					} else {
						res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
					}
				});
			}
		} else {
			res.status(401).end();
		}
	}
);

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
			if (req.get('content-type') !== 'application/json') {
				res.status(415).send({ Error: 'Server only accepts application/json data.' });
			} else if (req.body.name === undefined || req.body.type === undefined || req.body.length === undefined) {
				res
					.status(400)
					.send({ Error: 'The request object is missing at least one of the required attributes.' });
			} else if (req.body.name === null || req.body.type === null || req.body.length === null) {
				res.status(400).send({ Error: 'At least one attribute with invalid value of null.' });
			} else {
				const accepts = req.accepts([ 'application/json' ]);
				if (!accepts) {
					res.status(406).send({ Error: 'Not acceptable.' });
				} else if (accepts === 'application/json') {
					us.check_user_exists(req.user.sub).then((user) => {
						if (user) {
							const boat = post_boat(
								req.body.name,
								req.body.type,
								req.body.length,
								req.user.sub
							).then((key) => {
								res.status(201).send({
									id   : key.id,
									self : req.protocol + '://' + req.get('host') + '/boats/' + key.id
								});
							});
						} else {
							res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
						}
					});
				}
			}
		} else {
			res.status(401).end();
		}
	}
);

router.get(
	'/:bid',
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
				us.check_user_exists(req.user.sub).then((user) => {
					if (user) {
						const boat = get_boat(req.params.bid).then((boat) => {
							if (boat) {
								if (boat.owner.sub === user.sub) {
									boat.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + boat.id;

									boat.owner.self =
										req.protocol + '://' + req.get('host') + '/users/' + boat.owner.sub;

									boat.loads.forEach((load) => {
										load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id;
									});

									res.status(200).json(boat);
								} else {
									res.status(403).send({ Error: 'You are not the owner of this boat.' });
								}
							} else {
								res.status(404).send({ Error: 'No boat with this boat_id exists' });
							}
						});
					} else {
						res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
					}
				});
			}
		} else {
			res.status(401).end();
		}
	}
);

router.put(
	'/:bid',
	checkJwt,
	(err, req, res, next) => {
		if (err.name === 'UnauthorizedError') {
			res.status(err.status).end();
		}
	},
	(req, res) => {
		if (!req.JWTError) {
			if (req.get('content-type') !== 'application/json') {
				res.status(415).send({ Error: 'Server only accepts application/json data.' });
			} else if (req.body.name === undefined || req.body.type === undefined || req.body.length === undefined) {
				res
					.status(400)
					.send({ Error: 'The request object is missing at least one of the required attributes.' });
			} else if (req.body.name === null || req.body.type === null || req.body.length === null) {
				res.status(400).send({ Error: 'At least one attribute with invalid value of null.' });
			} else {
				const accepts = req.accepts([ 'application/json' ]);
				if (!accepts) {
					res.status(406).send({ Error: 'Not acceptable.' });
				} else if (accepts === 'application/json') {
					us.check_user_exists(req.user.sub).then((user) => {
						if (user) {
							get_boat(req.params.bid).then((old_boat) => {
								if (old_boat) {
									if (old_boat.owner.sub === user.sub) {
										update_boat(
											req.body.name,
											req.body.type,
											req.body.length,
											old_boat.loads,
											old_boat.owner,
											req.params.bid
										).then((key) => {
											res.status(201).send({
												id   : key.id,
												self : req.protocol + '://' + req.get('host') + '/boats/' + key.id
											});
										});
									} else {
										res
											.status(403)
											.send({ Error: 'Only the owner of the boat can edit the boat.' });
									}
								} else {
									res.status(404).send({ Error: 'No boat with this boat_id exists.' });
								}
							});
						} else {
							res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
						}
					});
				}
			}
		} else {
			res.status(401).end();
		}
	}
);

router.patch(
	'/:bid',
	checkJwt,
	(err, req, res, next) => {
		if (err.name === 'UnauthorizedError') {
			res.status(err.status).end();
		}
	},
	(req, res) => {
		if (!req.JWTError) {
			if (req.get('content-type') !== 'application/json') {
				res.status(415).send({ Error: 'Server only accepts application/json data.' });
			} else if (req.body.name === null || req.body.type === null || req.body.length === null) {
				res.status(400).send({ Error: 'At least one attribute with invalid value of null.' });
			} else {
				const accepts = req.accepts([ 'application/json' ]);
				if (!accepts) {
					res.status(406).send({ Error: 'Not acceptable.' });
				} else if (accepts === 'application/json') {
					us.check_user_exists(req.user.sub).then((user) => {
						if (user) {
							let new_name = req.body.name;
							let new_type = req.body.type;
							let new_length = req.body.length;

							get_boat(req.params.bid).then((old_boat) => {
								if (old_boat) {
									if (old_boat.owner.sub === user.sub) {
										if (new_name === undefined) {
											new_name = old_boat.name;
										}
										if (new_type === undefined) {
											new_type = old_boat.type;
										}
										if (new_length === undefined) {
											new_length = old_boat.length;
										}

										update_boat(
											new_name,
											new_type,
											new_length,
											old_boat.loads,
											old_boat.owner,
											req.params.bid
										).then((key) => {
											res.status(201).send({
												id   : key.id,
												self : req.protocol + '://' + req.get('host') + '/boats/' + key.id
											});
										});
									} else {
										res
											.status(403)
											.send({ Error: 'Only the owner of the boat can edit the boat.' });
									}
								} else {
									res.status(404).send({ Error: 'No boat with this boat_id exists.' });
								}
							});
						} else {
							res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
						}
					});
				}
			}
		}
	}
);

router.delete(
	'/:bid',
	checkJwt,
	(err, req, res, next) => {
		if (err.name === 'UnauthorizedError') {
			res.status(err.status).end();
		}
	},
	(req, res) => {
		if (!req.JWTError) {
			us.check_user_exists(req.user.sub).then((user) => {
				if (user) {
					get_boat(req.params.bid).then((boat) => {
						if (boat) {
							if (boat.owner.sub === user.sub) {
								boat.loads.forEach((el) => {
									ld.get_load(el.id).then((load) => {
										ld.remove_from_carrier(load.id, load);
									});
								});

								delete_boat(boat.id).then(res.status(204).end());
							} else {
								res.status(403).send({ Error: 'Only the owner of the boat can edit the boat.' });
							}
						} else {
							res.status(404).send({ Error: 'No boat with this boat_id exists.' });
						}
					});
				} else {
					res.status(403).send({ Error: 'You must first create a user entity with this JWT.' });
				}
			});
		} else {
			res.status(401).end();
		}
	}
);

router.put('/:bid/loads/:lid', (req, res) => {
	ld.get_load(req.params.lid).then((load) => {
		if (load) {
			get_boat(req.params.bid).then((boat) => {
				if (boat) {
					if (load.carrier.id !== undefined) {
						res.status(403).send({ Error: 'This load is already assigned to a boat.' });
					} else {
						ld.add_to_carrier(boat.id, load.id, load);
						add_load_to_boat(boat.id, load.id, boat).then((new_boat) => {
							new_boat.self = req.protocol + '://' + req.get('host') + '/boats/' + new_boat.id;
							new_boat.loads.forEach((el) => {
								el.self = req.protocol + '://' + req.get('host') + '/loads/' + el.id;
							});
							res.status(201).json(new_boat);
						});
					}
				} else {
					res.status(404).send({ Error: 'No such boat or load exists.' });
				}
			});
		} else {
			res.status(404).send({ Error: 'No such boat or load exists.' });
		}
	});
});

router.delete('/:bid/loads/:lid', (req, res) => {
	ld.get_load(req.params.lid).then((load) => {
		if (load) {
			get_boat(req.params.bid).then((boat) => {
				if (boat) {
					if (load.carrier.id === undefined) {
						res.status(404).send({ Error: 'This load is not assigned to a carrier.' });
					} else {
						ld.remove_from_carrier(load.id, load);
						remove_load_from_boat(boat.id, load.id, boat).then((key) => {
							res.status(204).end();
						});
					}
				} else {
					res.status(404).send({ Error: 'No such boat or load exists.' });
				}
			});
		} else {
			res.status(404).send({ Error: 'No such boat or load exists.' });
		}
	});
});

router.get('/:bid/loads', (req, res) => {
	get_boat(req.params.bid).then((boat) => {
		if (boat) {
			boat.loads.forEach((load) => {
				load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id;
			});

			res.status(200).send({ loads: boat.loads });
		} else {
			res.status(404).send({ Error: 'No boat with this boat_id exists.' });
		}
	});
});

/* ----------- End Controller Functions ----------- */

module.exports = router;
exports.get_boat = get_boat;
exports.remove_load_from_boat = remove_load_from_boat;
