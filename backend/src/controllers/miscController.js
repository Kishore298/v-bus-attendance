import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { recordAudit } from '../services/auditService.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipientId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipientId: req.user._id,
    isRead: false,
  });

  res.json({ success: true, notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notif) throw new AppError('Notification not found', 404);
  res.json({ success: true, notification: notif });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.json({ success: true });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    logs,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
});

export const getCompanySettings = asyncHandler(async (req, res) => {
  let setting = await SystemSetting.findOne({ key: 'COMPANY_CONFIG' }).lean();
  if (!setting) {
    setting = await SystemSetting.create({ key: 'COMPANY_CONFIG' });
  }
  res.json({ success: true, settings: setting });
});

export const updateCompanySettings = asyncHandler(async (req, res) => {
  let setting = await SystemSetting.findOne({ key: 'COMPANY_CONFIG' });
  if (!setting) {
    setting = await SystemSetting.create({ key: 'COMPANY_CONFIG' });
  }
  const prev = {
    companyName: setting.companyName,
    companyAddress: setting.companyAddress,
    companyLogoText: setting.companyLogoText,
    companyPhone: setting.companyPhone,
  };

  if (req.body.companyName !== undefined) setting.companyName = req.body.companyName;
  if (req.body.companyAddress !== undefined) setting.companyAddress = req.body.companyAddress;
  if (req.body.companyLogoText !== undefined) setting.companyLogoText = req.body.companyLogoText;
  if (req.body.companyPhone !== undefined) setting.companyPhone = req.body.companyPhone;
  await setting.save();

  await recordAudit({
    actor: req.user,
    action: 'COMPANY_SETTINGS_UPDATED',
    entityType: 'SystemSetting',
    entityId: setting._id,
    previousData: prev,
    newData: {
      companyName: setting.companyName,
      companyAddress: setting.companyAddress,
      companyLogoText: setting.companyLogoText,
      companyPhone: setting.companyPhone,
    },
    ipAddress: req.ip,
  });

  res.json({ success: true, settings: setting });
});
