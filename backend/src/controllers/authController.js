import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { recordAudit } from '../services/auditService.js';
import { AppError, asyncHandler } from '../utils/errors.js';

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact the Owner.', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  await recordAudit({
    actor: user,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await recordAudit({
    actor: user,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user._id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Password updated successfully' });
});
