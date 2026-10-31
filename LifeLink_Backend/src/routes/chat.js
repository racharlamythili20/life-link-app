// src/routes/chat.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Chat = require('../models/Chat');

router.use(protect);

// Get or create chat
router.post('/start', async (req, res, next) => {
  try {
    const { participantId, requestId } = req.body;

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, participantId] },
      bloodRequest: requestId || { $exists: false },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, participantId],
        bloodRequest: requestId,
      });
    }

    await chat.populate('participants', 'name profileImage bloodGroup isAvailable');
    res.json({ chat });
  } catch (err) { next(err); }
});

// Get user's chats
router.get('/', async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id, isActive: true })
      .populate('participants', 'name profileImage')
      .populate('bloodRequest', 'bloodGroup hospitalName status')
      .sort({ updatedAt: -1 });
    res.json({ chats });
  } catch (err) { next(err); }
});

// Get chat messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chat = await Chat.findById(req.params.id)
      .populate('messages.sender', 'name profileImage');

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const total = chat.messages.length;
    const start = Math.max(0, total - page * limit);
    const messages = chat.messages.slice(start, start + parseInt(limit));

    res.json({ messages, hasMore: start > 0 });
  } catch (err) { next(err); }
});

module.exports = router;
