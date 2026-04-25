const express = require('express');
const router = express.Router({ mergeParams: true });
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/', messageController.getMessages.bind(messageController));
router.post('/', messageLimiter, messageController.sendMessage.bind(messageController));
router.delete('/:messageId', messageController.deleteMessage.bind(messageController));
router.patch('/read', messageController.markAsRead.bind(messageController));

module.exports = router;
