import { ROLES } from '../constants/enums.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

const FINANCIAL_NOTIFICATION_TYPES = new Set([
  'PAYROLL_READY',
  'PAYROLL_FINALIZED',
  'ADJUSTMENT_ADDED',
]);

export async function notifyRoles(roles, { type, title, message, entityType = '', entityId = '' }) {
  const safeRoles = roles.filter(
    (role) => !(role === ROLES.SUB_SUPERVISOR && FINANCIAL_NOTIFICATION_TYPES.has(type))
  );
  if (!safeRoles.length) return;

  const recipients = await User.find({ role: { $in: safeRoles }, isActive: true })
    .select('_id role')
    .lean();

  if (!recipients.length) return;

  const docs = recipients.map((u) => ({
    recipientId: u._id,
    recipientRole: u.role,
    type,
    title,
    message,
    entityType,
    entityId: String(entityId || ''),
  }));

  await Notification.insertMany(docs);
}

export async function notifyUsers(userIds, { type, title, message, entityType = '', entityId = '' }) {
  if (!userIds?.length) return;
  const recipients = await User.find({ _id: { $in: userIds }, isActive: true })
    .select('_id role')
    .lean();

  const docs = recipients
    .filter((u) => !(u.role === ROLES.SUB_SUPERVISOR && FINANCIAL_NOTIFICATION_TYPES.has(type)))
    .map((u) => ({
      recipientId: u._id,
      recipientRole: u.role,
      type,
      title,
      message,
      entityType,
      entityId: String(entityId || ''),
    }));

  if (docs.length) {
    await Notification.insertMany(docs);
  }
}
