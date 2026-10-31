// src/routes/upload.js
const router = require('express').Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const User = require('../models/User');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

router.post('/image', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
    }

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'lifelink-uploads';
    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `profiles/${req.user.id}_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) {
      logger.error('Supabase storage upload error:', error.message);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const publicUrl = publicData.publicUrl;

    // Update user profile image in database
    await User.findByIdAndUpdate(req.user.id, { profileImage: publicUrl });

    res.json({ url: publicUrl, publicId: fileName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
