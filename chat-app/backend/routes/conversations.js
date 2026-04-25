const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');
const messageRoutes = require('./messages');

router.use(authenticate);

router.get('/', conversationController.getConversations.bind(conversationController));
router.post('/group', conversationController.createGroup.bind(conversationController));
router.get('/direct/:targetUserId', conversationController.getOrCreateDirect.bind(conversationController));
router.get('/:conversationId', conversationController.getConversation.bind(conversationController));

// Nested message routes
router.use('/:conversationId/messages', messageRoutes);

module.exports = router;
