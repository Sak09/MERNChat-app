const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/search', userController.searchUsers.bind(userController));
router.get('/:userId', userController.getUserById.bind(userController));
router.patch('/profile', userController.updateProfile.bind(userController));

module.exports = router;
