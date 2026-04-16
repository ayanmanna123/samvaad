import User from '../models/User.js';
import { uploadToImageKit } from '../config/imagekit.js';

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.bio = req.body.bio || user.bio;
      user.birthday = req.body.birthday || user.birthday;

      // If base64 avatar is provided
      if (req.body.avatar && req.body.avatar.startsWith('data:image')) {
        try {
          const result = await uploadToImageKit(req.body.avatar, `avatar-${user._id}.jpg`, 'samvaad/avatars');
          if (result && result.url) {
            user.avatar = result.url;
          }
        } catch (uploadError) {
          console.error('Avatar upload failed, proceeding with other changes:', uploadError.message);
          // We continue so name/bio changes still save even if upload fails
        }
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: updatedUser,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/users/settings
// @access  Private
export const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.settings) {
      Object.keys(req.body.settings).forEach(key => {
        user.settings[key] = req.body.settings[key];
      });
      user.markModified('settings');
    }

    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user theme
// @route   PUT /api/users/theme
// @access  Private
export const updateTheme = async (req, res) => {
  try {
    const { theme, darkMode } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      if (theme) user.settings.theme = theme;
      if (typeof darkMode === 'boolean') user.settings.darkMode = darkMode;
      user.markModified('settings');

      await user.save();

      res.json({
        success: true,
        data: {
          theme: user.theme,
          darkMode: user.darkMode,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Upload to ImageKit
    const result = await uploadToImageKit(
      req.file.buffer, 
      `avatar-${req.user._id}-${Date.now()}.jpg`, 
      'samvaad/avatars'
    );

    // Update user avatar
    const user = await User.findById(req.user._id);
    user.avatar = result.url;
    await user.save();

    res.json({
      success: true,
      data: {
        avatar: result.url,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search?q=searchQuery
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const user = await User.findById(req.user._id);
    const syncEnabled = user?.settings?.syncContactsEnabled;
    const syncedContacts = user?.contacts || [];

    const contactEmails = syncedContacts.map(c => c.email).filter(Boolean);
    const contactPhones = syncedContacts.map(c => c.tel).filter(Boolean);

    let query = {
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { phone: { $regex: searchQuery, $options: 'i' } },
          ],
        },
      ],
    };

    // If sync is enabled AND there are contacts to filter by
    if (syncEnabled && (contactEmails.length > 0 || contactPhones.length > 0)) {
      query.$and.push({
        $or: [
          { email: { $in: contactEmails } },
          { phone: { $in: contactPhones } }
        ]
      });
    }

    const users = await User.find(query)
      .select('name email phone avatar bio status lastSeen')
      .limit(20);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const syncEnabled = user?.settings?.syncContactsEnabled;
    const syncedContacts = user?.contacts || [];

    const contactEmails = syncedContacts.map(c => c.email).filter(Boolean);
    const contactPhones = syncedContacts.map(c => c.tel).filter(Boolean);

    let query = { _id: { $ne: req.user._id } };

    // Strict filter only if sync is enabled AND we have actual contacts to filter by
    if (syncEnabled && (contactEmails.length > 0 || contactPhones.length > 0)) {
      query.$or = [
        { email: { $in: contactEmails } },
        { phone: { $in: contactPhones } }
      ];
    }

    const users = await User.find(query).select('name email avatar status');

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (user) {
      res.json({
        success: true,
        data: user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Sync mobile contacts
// @route   POST /api/users/sync-contacts
// @access  Private
export const syncContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, message: 'Invalid contacts data' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update contacts list
    user.contacts = contacts.map(c => ({
      name: Array.isArray(c.name) ? c.name[0] : (c.name || ''),
      email: Array.isArray(c.email) ? (c.email[0]?.address || c.email[0]) : (c.email || ''),
      tel: Array.isArray(c.tel) ? c.tel[0] : (c.tel || ''),
    }));

    await user.save();

    res.json({ success: true, message: 'Contacts synced successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Subscribe to push notifications
// @route   POST /api/users/subscribe-push
// @access  Private
export const subscribePush = async (req, res) => {
  try {
    const subscription = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if subscription already exists
    const exists = user.pushSubscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/users/unsubscribe-push
// @access  Private
export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.pushSubscriptions = user.pushSubscriptions.filter(
      (sub) => sub.endpoint !== endpoint
    );

    await user.save();

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppLock = async (req, res) => {
  try {
    const { enabled, pin, biometricEnabled } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (enabled !== undefined) user.appLock.enabled = enabled;
    if (pin) user.appLock.pin = pin;
    if (biometricEnabled !== undefined) user.appLock.biometricEnabled = biometricEnabled;

    await user.save();
    res.json({ success: true, data: { enabled: user.appLock.enabled, biometricEnabled: user.appLock.biometricEnabled } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const verifyAppLock = async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.matchPin(pin);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid PIN' });

    res.json({ success: true, message: 'PIN verified' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};