import { ROLES } from '../constants/enums.js';
import { AppError } from '../utils/errors.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    return next();
  };
}

export function forbidSubSupervisorFinancials(req, res, next) {
  if (req.user?.role === ROLES.SUB_SUPERVISOR) {
    return next(
      new AppError('Access denied: Sub-Supervisors cannot access salary or payroll data', 403)
    );
  }
  return next();
}
