const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const mockDb = require('../services/mockDbService');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * User Login (Librarian, Teacher, Student)
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid Member ID / Email and password.',
      });
    }

    const clean = identifier.trim();

    // 1. Cloud MongoDB Atlas (when connected)
    if (mongoose.connection.readyState === 1) {
      const cleanLower = clean.toLowerCase();
      const member = await Member.findOne({
        $or: [{ email: cleanLower }, { memberId: clean.toUpperCase() }],
      });

      if (!member) {
        return res.status(401).json({
          success: false,
          message: `Invalid ID or password. No account found for "${identifier}".`,
        });
      }

      if (!member.active) {
        return res.status(403).json({
          success: false,
          message: 'Your library account is deactivated. Please contact the librarian.',
        });
      }

      const isMatch = await member.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Please try again.',
        });
      }

      const token = generateToken(member._id);

      return res.status(200).json({
        success: true,
        message: `Welcome back, ${member.name}!`,
        token,
        user: {
          _id: member._id,
          memberId: member.memberId,
          name: member.name,
          email: member.email,
          role: member.role,
          department: member.department,
          phone: member.phone,
          active: member.active,
        },
      });
    }

    // 2. Resilient Local Fallback (when local Wi-Fi blocks port 27017 to Atlas)
    const fallbackMember = mockDb.findMemberByIdentifier(clean);
    if (!fallbackMember) {
      return res.status(401).json({
        success: false,
        message: `Invalid ID or password. No account found for "${identifier}".`,
      });
    }

    if (!fallbackMember.active) {
      return res.status(403).json({
        success: false,
        message: 'Your library account is deactivated. Please contact the librarian.',
      });
    }

    const isMatch = await mockDb.verifyPassword(fallbackMember, password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.',
      });
    }

    const token = generateToken(fallbackMember._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${fallbackMember.name}!`,
      token,
      user: {
        _id: fallbackMember._id,
        memberId: fallbackMember.memberId,
        name: fallbackMember.name,
        email: fallbackMember.email,
        role: fallbackMember.role,
        department: fallbackMember.department,
        phone: fallbackMember.phone,
        active: fallbackMember.active,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await Member.findById(req.user._id).select('-password');
      return res.status(200).json({ success: true, user });
    }
    const user = mockDb.getMemberById(req.user._id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Logged-In User's Profile (Name, Email, Phone, Department)
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, department } = req.body;

    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(req.user._id);

      if (!member) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      if (email && email.trim().toLowerCase() !== member.email) {
        const cleanEmail = email.trim().toLowerCase();
        const existing = await Member.findOne({ email: cleanEmail, _id: { $ne: member._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Email "${cleanEmail}" is already registered to another member.`,
          });
        }
        member.email = cleanEmail;
      }

      if (name && name.trim()) member.name = name.trim();
      if (phone !== undefined) member.phone = phone.trim();
      if (department !== undefined && department.trim()) member.department = department.trim();

      await member.save();

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          _id: member._id,
          memberId: member.memberId,
          name: member.name,
          email: member.email,
          role: member.role,
          department: member.department,
          phone: member.phone,
          active: member.active,
        },
      });
    }

    const updated = mockDb.updateMember(req.user._id, { name, email, phone, department });
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Change Logged-In User's Password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.',
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(req.user._id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      const isMatch = await member.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      member.password = newPassword.trim();
      await member.save();

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully. Use your new password on your next login.',
      });
    }

    const member = mockDb.getMemberById(req.user._id);
    const isMatch = await mockDb.verifyPassword(member, currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    mockDb.updateMember(req.user._id, { password: newPassword.trim() });
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Use your new password on your next login.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  loginUser,
  getMe,
  updateProfile,
  changePassword,
};
