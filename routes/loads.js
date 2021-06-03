const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../datastore/datastore');
const bt = require('./boats');

const datastore = ds.datastore;

const LOAD = 'Load';

router.use(bodyParser.json());

/* ----------- Begin Model Functions ----------- */

function post_load(name, volume, destination) {
    const key = datastore.key(LOAD);
    const new_load = {"name": name, "volume": volume, "destination": destination, "carrier": {}};
    return datastore.save({"key": key, "data": new_load}).then(() => {return key});
}

function get_all_loads(req) {
	let q = datastore.createQuery(LOAD).limit(5);
	const results = {};
	if (Object.keys(req.query).includes('cursor')) {
		q = q.start(decodeURIComponent(req.query.cursor));
	}

	return datastore.runQuery(q).then((entities) => {
		results.items = entities[0].map(ds.fromDatastore);
        console.log(results.items);
        console.log(results.items.length);
		if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
			results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + encodeURIComponent(entities[1].endCursor);
		}
		return results;
	});
}

function get_load(lid) {
    const key = datastore.key([LOAD, parseInt(lid, 10)]);
    const q = datastore.createQuery(LOAD).filter('__key__', '=', key);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore)[0];
    });
}

function delete_load(lid) {
    const key = datastore.key([LOAD, parseInt(lid, 10)]);
    return datastore.delete(key);
}

function add_to_carrier(bid, lid, load) {
    const key = datastore.key([LOAD, parseInt(lid, 10)]);
    load.carrier = {"id": bid};
    const new_load = {"volume": load.volume, "carrier": load.carrier};
    return datastore.save({"key": key, "data": new_load}).then(() => {return key;})
}

async function remove_from_carrier(lid, load) {
    const key = datastore.key([LOAD, parseInt(lid, 10)]);
    load.carrier = {};
    const new_load = {"volume": load.volume, "carrier": load.carrier};
    await datastore.save({"key": key, "data": new_load}).then(() => {return key;});
    return;
}

/* ----------- End Model Functions ----------- */

/* ----------- Begin Controller Functions ----------- */

router.get('/', (req, res) => {
	const loads = get_all_loads(req).then((ret_obj) => {
        ret_obj.items.forEach( (el) => {
            el.self = req.protocol + "://" + req.get('host') + req.baseUrl + "/" + el.id;
            
            if (el.carrier.id !== undefined) {
                el.carrier.self = req.protocol + "://" + req.get('host') + "/boats/" + el.carrier.id;
            }
        })
		res.status(200).json(ret_obj);
	});
});

router.post('/', (req, res) => {
    if (req.body.name === undefined || req.body.volume === undefined || req.body.destination === undefined) {
        res.status(400).send({"Error": "The request object is missing at least one of the required attributes"})   
    } else {
        const load = post_load(req.body.name, req.body.volume, req.body.destination).then((key) => {
            res.status(201).send({
                "id": key.id,
                "self": req.protocol + "://" + req.get('host') + "/loads/" + key.id
            });
	    });
    }
});

router.get('/:lid', (req, res) => {
    const load = get_load(req.params.lid).then( (load) => {
        if (load) {
            load.self = req.protocol + "://" + req.get('host') + req.baseUrl + "/" + load.id;

            if (load.carrier.id !== undefined) {
                load.carrier.self = req.protocol + "://" + req.get('host') + "/boats/" + load.carrier.id;
            }
            res.status(200).json(load);
        } else {
            res.status(404).send({ "Error": "No load with this load_id exists"});
        }
    })
});

router.delete('/:lid', (req, res) => {
    get_load(req.params.lid).then((load) => {
        if (load) {
            if (load.carrier.id !== undefined) {
                bt.get_boat(load.carrier.id).then((boat) => {
                    bt.remove_load_from_boat(boat.id, load.id, boat);
                })
            }
            delete_load(load.id).then(res.status(204).end());
        }  else {
            res.status(404).send({"Error": "No load with this load_id exists"});
        }
    });
});

/* ----------- End Controller Functions ----------- */

module.exports = router;
module.exports.get_load = get_load;
module.exports.add_to_carrier = add_to_carrier;
module.exports.remove_from_carrier = remove_from_carrier;