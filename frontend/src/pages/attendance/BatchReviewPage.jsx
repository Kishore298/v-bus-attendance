import { ArrowLeft, CheckCircle2, Coins, Flag, RotateCcw, Send, Unlock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { adjustmentApi, attendanceApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { TableSkeleton } from '../../components/Skeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate, getErrorMessage } from '../../utils/format';

export function BatchReviewPage() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const role = user.role;

  const [batch, setBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [subEdits, setSubEdits] = useState({});
  const [reasonModal, setReasonModal] = useState(null);
  const [reasonText, setReasonText] = useState('');

  const [adjModalRecord, setAdjModalRecord] = useState(null);
  const [adjForm, setAdjForm] = useState({
    category: 'MILEAGE',
    name: '',
    type: 'EARNING',
    amount: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getBatch(id);
      setBatch(res.batch);
      setRecords(res.records || []);
      const edits = {};
      for (const r of res.records || []) {
        edits[r._id] = { status: r.status, leavePaidType: r.leavePaidType || 'NONE', notes: r.notes || '' };
      }
      setSubEdits(edits);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubResubmit = async (submitNow) => {
    setBusy(true);
    try {
      const editableSet = new Set(['DRAFT', 'RETURNED_TO_SUB_SUPERVISOR', 'RETURNED_BY_OWNER']);
      const updates = records
        .filter((r) => editableSet.has(r.approvalStatus))
        .map((r) => ({
          attendanceId: r._id,
          status: subEdits[r._id]?.status || r.status,
          leavePaidType:
            (subEdits[r._id]?.status || r.status) === 'LEAVE'
              ? subEdits[r._id]?.leavePaidType || 'UNPAID'
              : 'NONE',
          notes: subEdits[r._id]?.notes ?? r.notes,
        }));

      await attendanceApi.updateBatch(id, { updates, submitNow });
      toast.success(submitNow ? 'Batch submitted for review' : 'Draft updated');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApproveAllRemaining = async () => {
    setBusy(true);
    try {
      if (role === 'SUPERVISOR') {
        await attendanceApi.supervisorReview(id, { approveRemaining: true, actions: [] });
        toast.success('All pending records approved by Supervisor');
      } else if (role === 'OWNER') {
        await attendanceApi.ownerReview(id, { approveRemaining: true, actions: [] });
        toast.success('All Supervisor-approved records approved by Owner');
      }
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSingleApprove = async (recordId) => {
    setBusy(true);
    try {
      if (role === 'SUPERVISOR') {
        await attendanceApi.supervisorReview(id, {
          approveRemaining: false,
          actions: [{ attendanceId: recordId, decision: 'APPROVE' }],
        });
      } else if (role === 'OWNER') {
        await attendanceApi.ownerReview(id, {
          approveRemaining: false,
          actions: [{ attendanceId: recordId, decision: 'APPROVE' }],
        });
      }
      toast.success('Record approved');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReasonSubmit = async (e) => {
    e.preventDefault();
    if (!reasonText.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    setBusy(true);
    try {
      const recId = reasonModal.record._id;
      if (reasonModal.mode === 'SUP_FLAG') {
        await attendanceApi.supervisorReview(id, {
          approveRemaining: false,
          actions: [{ attendanceId: recId, decision: 'FLAG', reason: reasonText.trim() }],
        });
      } else if (reasonModal.mode === 'SUP_RETURN') {
        await attendanceApi.supervisorReview(id, {
          approveRemaining: false,
          actions: [{ attendanceId: recId, decision: 'RETURN', reason: reasonText.trim() }],
        });
      } else if (reasonModal.mode === 'OWNER_RETURN') {
        await attendanceApi.ownerReview(id, {
          approveRemaining: false,
          actions: [{ attendanceId: recId, decision: 'RETURN', reason: reasonText.trim() }],
        });
      } else if (reasonModal.mode === 'OWNER_REOPEN') {
        await attendanceApi.reopenRecord(recId, reasonText.trim());
      }
      toast.success('Action recorded');
      setReasonModal(null);
      setReasonText('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAttendanceAdjustment = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adjustmentApi.create({
        employeeId: adjModalRecord.employeeId._id,
        stage: 'ATTENDANCE_APPROVAL',
        category: adjForm.category,
        name: adjForm.name,
        type: adjForm.type,
        amount: Number(adjForm.amount),
        description: adjForm.description,
        applicableDate: batch.attendanceDateKey,
        attendanceId: adjModalRecord._id,
      });
      toast.success('Adjustment added for payroll');
      setAdjModalRecord(null);
      setAdjForm({ category: 'MILEAGE', name: '', type: 'EARNING', amount: '', description: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} />;
  if (!batch) return null;

  const hasSubEditable = records.some((r) =>
    ['DRAFT', 'RETURNED_TO_SUB_SUPERVISOR', 'RETURNED_BY_OWNER'].includes(r.approvalStatus)
  );
  const hasSupPending = records.some((r) => r.approvalStatus === 'SUBMITTED_TO_SUPERVISOR');
  const hasOwnerPending = records.some((r) => r.approvalStatus === 'SUPERVISOR_APPROVED');

  return (
    <div className="space-y-5">
      <div className="premium-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-white to-orange-50/40">
        <div className="flex items-center gap-3">
          <Link to="/attendance/batches" className="p-2.5 rounded-xl bg-white border border-orange-100 hover:bg-orange-50 text-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{batch.batchCode}</h1>
              <StatusBadge status={batch.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance Date: <strong className="text-slate-800">{batch.attendanceDateKey}</strong> • Submitted:{' '}
              {formatDate(batch.submittedAt)} by {batch.submittedBy?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {role === 'SUB_SUPERVISOR' && hasSubEditable && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSubResubmit(false)}
                className="px-4 py-2 text-xs font-bold border border-orange-200 bg-white text-slate-700 hover:bg-orange-50 rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSubResubmit(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Submit / Resubmit
              </button>
            </>
          )}

          {role === 'SUPERVISOR' && hasSupPending && (
            <button
              type="button"
              disabled={busy}
              onClick={handleApproveAllRemaining}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve All Pending
            </button>
          )}

          {role === 'OWNER' && hasOwnerPending && (
            <button
              type="button"
              disabled={busy}
              onClick={handleApproveAllRemaining}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold orange-gradient-btn text-white rounded-xl cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve All Supervisor-Approved
            </button>
          )}
        </div>
      </div>

      {/* Summary Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
        {[
          { label: 'Total', val: batch.counts?.total || 0, cls: 'text-slate-900' },
          { label: 'Drivers', val: batch.counts?.drivers || 0, cls: 'text-orange-700' },
          { label: 'Cleaners', val: batch.counts?.cleaners || 0, cls: 'text-sky-700' },
          { label: 'Present', val: batch.counts?.present || 0, cls: 'text-emerald-700' },
          { label: 'Absent', val: batch.counts?.absent || 0, cls: 'text-rose-700' },
          { label: 'Half Day', val: batch.counts?.halfDay || 0, cls: 'text-amber-700' },
          { label: 'Leave', val: batch.counts?.leave || 0, cls: 'text-sky-700' },
        ].map((c) => (
          <div key={c.label} className="premium-card rounded-xl p-3.5">
            <p className="text-[11px] text-slate-500 font-bold uppercase">{c.label}</p>
            <p className={`text-xl font-extrabold mt-0.5 ${c.cls}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-orange-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Attendance</th>
                <th className="px-5 py-3.5">Approval State</th>
                <th className="px-5 py-3.5">Comments / Reasons</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => {
                const isSubEditable =
                  role === 'SUB_SUPERVISOR' &&
                  ['DRAFT', 'RETURNED_TO_SUB_SUPERVISOR', 'RETURNED_BY_OWNER'].includes(rec.approvalStatus);

                const canSupAct =
                  role === 'SUPERVISOR' &&
                  ['SUBMITTED_TO_SUPERVISOR', 'FLAGGED_BY_SUPERVISOR'].includes(rec.approvalStatus);

                const canOwnerAct =
                  role === 'OWNER' && rec.approvalStatus === 'SUPERVISOR_APPROVED';

                const canOwnerReopen =
                  role === 'OWNER' && rec.approvalStatus === 'OWNER_APPROVED';

                const canOwnerAddAdj =
                  role === 'OWNER' &&
                  ['SUPERVISOR_APPROVED', 'OWNER_APPROVED'].includes(rec.approvalStatus);

                return (
                  <tr key={rec._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{rec.employeeId?.fullName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-mono text-slate-500">{rec.employeeId?.employeeCode}</span>
                        <StatusBadge status={rec.employeeId?.employeeType} />
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {isSubEditable ? (
                        <div className="space-y-1.5">
                          <select
                            value={subEdits[rec._id]?.status || rec.status}
                            onChange={(e) =>
                              setSubEdits((prev) => ({
                                ...prev,
                                [rec._id]: {
                                  ...prev[rec._id],
                                  status: e.target.value,
                                  leavePaidType: e.target.value === 'LEAVE' ? 'UNPAID' : 'NONE',
                                },
                              }))
                            }
                            className="px-2.5 py-1.5 text-xs border border-orange-200 rounded-lg bg-white font-semibold"
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="HALF_DAY">Half Day</option>
                            <option value="LEAVE">Leave</option>
                            <option value="HOLIDAY">Holiday</option>
                          </select>
                          <input
                            type="text"
                            value={subEdits[rec._id]?.notes || ''}
                            onChange={(e) =>
                              setSubEdits((prev) => ({
                                ...prev,
                                [rec._id]: { ...prev[rec._id], notes: e.target.value },
                              }))
                            }
                            placeholder="Note..."
                            className="block w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                      ) : (
                        <div>
                          <StatusBadge status={rec.status} />
                          {rec.status === 'LEAVE' && (
                            <span className="ml-1.5 text-[11px] font-medium text-slate-500">({rec.leavePaidType})</span>
                          )}
                          {rec.notes && <p className="text-xs text-slate-500 mt-1">{rec.notes}</p>}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={rec.approvalStatus} />
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                      {rec.supervisorReason && (
                        <p><strong className="text-slate-800">Supervisor:</strong> {rec.supervisorReason}</p>
                      )}
                      {rec.ownerReason && (
                        <p><strong className="text-orange-700">Owner:</strong> {rec.ownerReason}</p>
                      )}
                      {!rec.supervisorReason && !rec.ownerReason && '—'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {canSupAct && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSingleApprove(rec._id)}
                              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReasonText('');
                                setReasonModal({ mode: 'SUP_FLAG', record: rec });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 cursor-pointer"
                            >
                              <Flag className="w-3 h-3" /> Flag
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReasonText('');
                                setReasonModal({ mode: 'SUP_RETURN', record: rec });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> Return
                            </button>
                          </>
                        )}

                        {canOwnerAct && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSingleApprove(rec._id)}
                              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReasonText('');
                                setReasonModal({ mode: 'OWNER_RETURN', record: rec });
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                            >
                              Return
                            </button>
                          </>
                        )}

                        {canOwnerReopen && (
                          <button
                            type="button"
                            onClick={() => {
                              setReasonText('');
                              setReasonModal({ mode: 'OWNER_REOPEN', record: rec });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" /> Reopen
                          </button>
                        )}

                        {canOwnerAddAdj && (
                          <button
                            type="button"
                            onClick={() => setAdjModalRecord(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold orange-gradient-btn text-white rounded-lg cursor-pointer"
                          >
                            <Coins className="w-3 h-3" /> + Benefit/Ded
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason Dialog */}
      <Modal
        open={Boolean(reasonModal)}
        onClose={() => setReasonModal(null)}
        title={
          reasonModal?.mode === 'SUP_FLAG'
            ? 'Flag Attendance Record'
            : reasonModal?.mode === 'OWNER_REOPEN'
            ? 'Reopen Approved Attendance (Mandatory Reason)'
            : 'Return Attendance Record for Correction'
        }
        subtitle={`${reasonModal?.record?.employeeId?.fullName || ''} (${reasonModal?.record?.employeeId?.employeeCode || ''})`}
      >
        <form onSubmit={handleReasonSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason *</label>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter clear explanation for audit log & Sub-Supervisor..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReasonModal(null)} className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700">
              Confirm
            </button>
          </div>
        </form>
      </Modal>

      {/* Owner Attendance-Stage Benefit/Deduction Modal */}
      <Modal
        open={Boolean(adjModalRecord)}
        onClose={() => setAdjModalRecord(null)}
        title={`Add Duty Benefit / Deduction — ${adjModalRecord?.employeeId?.fullName || ''}`}
        subtitle={`Applicable Date: ${batch.attendanceDateKey}`}
      >
        <form onSubmit={handleCreateAttendanceAdjustment} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
              <select
                value={adjForm.type}
                onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="EARNING">Earning / Benefit</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={adjForm.category}
                onChange={(e) => setAdjForm({ ...adjForm, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="MILEAGE">Mileage Allowance</option>
                <option value="EXTRA_DUTY">Extra Duty Allowance</option>
                <option value="TRIP_ALLOWANCE">Trip Allowance</option>
                <option value="NIGHT_ALLOWANCE">Night Allowance</option>
                <option value="FOOD_ALLOWANCE">Food Allowance</option>
                <option value="OTHER_EARNING">Other Benefit</option>
                <option value="OTHER_DEDUCTION">Other Deduction</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Name</label>
              <input
                value={adjForm.name}
                onChange={(e) => setAdjForm({ ...adjForm, name: e.target.value })}
                placeholder="e.g., Express Route Mileage"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={adjForm.amount}
                onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <input
              value={adjForm.description}
              onChange={(e) => setAdjForm({ ...adjForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAdjModalRecord(null)} className="px-4 py-2 text-sm text-slate-600 rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-bold orange-gradient-btn text-white rounded-xl">
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
