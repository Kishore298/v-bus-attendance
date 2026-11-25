import { AuditLog } from '../models/AuditLog.js';

export async function recordAudit(
  {
    actor,
    action,
    entityType,
    entityId,
    previousData = null,
    newData = null,
    reason = '',
    ipAddress = '',
  },
  session = null
) {
  const payload = {
    actorId: actor._id,
    actorRole: actor.role,
    actorName: actor.name,
    action,
    entityType,
    entityId: String(entityId),
    previousData,
    newData,
    reason,
    ipAddress,
  };

  if (session) {
    await AuditLog.create([payload], { session });
  } else {
    await AuditLog.create(payload);
  }
}
