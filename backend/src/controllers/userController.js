import { ROLES } from '../constants/enums.js';
import { User } from '../models/User.js';
import { recordAudit } from '../services/auditService.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, users });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role === ROLES.OWNER) {
    throw new AppError('Cannot create additional Owner accounts via this endpoint', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdBy: req.user._id,
  });

  await recordAudit({
    actor: req.user,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user._id,
    newData: { name: user.name, email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-passwordHash');
  if (!user) throw new AppError('User not found', 404);

  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw new AppError('You cannot deactivate your own Owner account', 400);
  }

  const prev = { name: user.name, role: user.role, isActive: user.isActive };

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.role !== undefined && user.role !== ROLES.OWNER) user.role = req.body.role;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.password) {
    user.passwordHash = await User.hashPassword(req.body.password);
  }

  await user.save();

  await recordAudit({
    actor: req.user,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: user._id,
    previousData: prev,
    newData: { name: user.name, role: user.role, isActive: user.isActive },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});
