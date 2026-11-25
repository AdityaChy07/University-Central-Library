const mongoose = require('mongoose');
const Member = require('../models/Member');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const { syncMember, deleteMemberNode } = require('../services/graphService');

/**
 * Register Member and create graph node
 * POST /api/members
 */
const registerMember = async (req, res) => {
  try {
    const { memberId, name, email, phone, active, role, department, password } = req.body;

    if (!memberId || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Member ID, Name, and Email are required.',
      });
    }

    const cleanMemberId = memberId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const existingId = await Member.findOne({ memberId: cleanMemberId });
      if (existingId) {
        return res.status(400).json({
          success: false,
          message: `Member ID "${cleanMemberId}" is already registered (${existingId.name}).`,
        });
      }

      const existingEmail = await Member.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: `Email "${cleanEmail}" is already registered to ${existingEmail.name} (${existingEmail.memberId}).`,
        });
      }

      const assignedRole = role === 'TEACHER' ? 'TEACHER' : (role === 'LIBRARIAN' ? 'LIBRARIAN' : 'STUDENT');
      const assignedPassword = password && password.trim() ? password.trim() : (assignedRole === 'TEACHER' ? 'teacher123' : 'student123');

      const member = await Member.create({
        memberId: cleanMemberId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        role: assignedRole,
        department: department ? department.trim() : 'Computer Science',
        password: assignedPassword,
        active: active !== undefined ? Boolean(active) : true,
      });

      syncMember(member).catch(() => {});

      const memberObj = member.toObject();
      delete memberObj.password;

      return res.status(201).json({
        success: true,
        data: memberObj,
        message: 'Member registered and synchronized successfully.',
      });
    }

    const created = mockDb.createMember({
      memberId: cleanMemberId,
      name: name.trim(),
      email: cleanEmail,
      phone,
      role,
      department,
      password,
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Member registered successfully in local directory.',
    });
  } catch (error) {
    console.error('Error registering member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List Members with active loan counts
 * GET /api/members
 */
const getMembers = async (req, res) => {
  try {
    const { search, activeOnly } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};

      if (search && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { memberId: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
        ];
      }

      if (activeOnly === 'true') {
        filter.active = true;
      }

      const members = await Member.find(filter).select('-password').sort({ createdAt: -1 });

      const activeCounts = await BorrowRecord.aggregate([
        { $match: { status: 'ISSUED' } },
        { $group: { _id: '$memberId', count: { $sum: 1 } } },
      ]);
      const activeMap = {};
      activeCounts.forEach((c) => {
        if (c._id) activeMap[c._id.toString()] = c.count;
      });

      const membersWithData = members.map((m) => ({
        ...m.toObject(),
        activeLoansCount: activeMap[m._id.toString()] || 0,
      }));

      return res.status(200).json({ success: true, count: membersWithData.length, data: membersWithData });
    }

    const members = mockDb.getAllMembers(search);
    return res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Member by ID with loan history
 * GET /api/members/:id
 */
const getMemberById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found.' });
      }

      const loanHistory = await BorrowRecord.find({ memberId: member._id })
        .populate('bookId', 'title isbn category')
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, data: { ...member.toObject(), loanHistory } });
    }

    const member = mockDb.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    const loans = mockDb.getBorrowRecords({ memberId: req.params.id });
    return res.status(200).json({ success: true, data: { ...member, loanHistory: loans } });
  } catch (error) {
    console.error('Error fetching member by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Member
 * PUT /api/members/:id
 */
const updateMember = async (req, res) => {
  try {
    const { name, email, phone, active, department, role, password } = req.body;

    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found.' });
      }

      if (email && email.trim().toLowerCase() !== member.email) {
        const cleanEmail = email.trim().toLowerCase();
        const existing = await Member.findOne({ email: cleanEmail, _id: { $ne: member._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Email "${cleanEmail}" is already used by ${existing.name}.`,
          });
        }
        member.email = cleanEmail;
      }

      if (name && name.trim()) member.name = name.trim();
      if (phone !== undefined) member.phone = phone.trim();
      if (department) member.department = department.trim();
      if (role && ['LIBRARIAN', 'TEACHER', 'STUDENT'].includes(role)) member.role = role;
      if (active !== undefined) member.active = Boolean(active);
      if (password && password.trim()) member.password = password.trim();

      await member.save();
      syncMember(member).catch(() => {});

      const memberObj = member.toObject();
      delete memberObj.password;

      return res.status(200).json({
        success: true,
        data: memberObj,
        message: 'Member updated successfully.',
      });
    }

    const updated = mockDb.updateMember(req.params.id, {
      name,
      email,
      phone,
      department,
      role,
      active,
      password,
    });
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Member updated successfully in local directory.',
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Member
 * DELETE /api/members/:id
 */
const deleteMember = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found.' });
      }

      const activeLoans = await BorrowRecord.countDocuments({
        memberId: member._id,
        status: 'ISSUED',
      });
      if (activeLoans > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete member "${member.name}" because they have ${activeLoans} active unreturned loan(s).`,
        });
      }

      await Member.findByIdAndDelete(req.params.id);
      deleteMemberNode(req.params.id).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Member "${member.name}" deleted successfully.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Member removed from local directory.',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
};
