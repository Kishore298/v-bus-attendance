import { ROLES } from '../constants/enums.js';

/**
 * Enforces backend salary confidentiality.
 * Sub-Supervisors ONLY ever receive identity/status fields needed to mark attendance.
 */
export function sanitizeEmployeeForRole(employeeDoc, role) {
  const emp = typeof employeeDoc?.toObject === 'function' ? employeeDoc.toObject() : { ...employeeDoc };

  if (role === ROLES.SUB_SUPERVISOR) {
    return {
      _id: emp._id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      employeeType: emp.employeeType,
      status: emp.status,
    };
  }

  return emp;
}

export function sanitizeEmployeesForRole(employees, role) {
  return (employees || []).map((e) => sanitizeEmployeeForRole(e, role));
}

export function sanitizeEmployeePopulatedField(employeeDoc, role) {
  if (!employeeDoc) return null;
  if (typeof employeeDoc === 'string' || !employeeDoc.employeeCode) {
    return employeeDoc;
  }
  return sanitizeEmployeeForRole(employeeDoc, role);
}
