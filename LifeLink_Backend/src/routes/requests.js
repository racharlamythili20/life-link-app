// src/routes/requests.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/requestController');

router.get('/', ctrl.getRequests);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getRequest);

router.use(protect);
router.post('/', ctrl.createRequest);
router.put('/:id/accept', ctrl.acceptRequest);
router.put('/:id/complete', ctrl.completeDonation);
router.put('/:id/fulfill', ctrl.fulfillRequest);
router.delete('/:id', ctrl.cancelRequest);

module.exports = router;
