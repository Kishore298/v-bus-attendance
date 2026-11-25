import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../../api/endpoints';
import { setCredentials } from '../../store/authSlice';
import { getErrorMessage } from '../../utils/format';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@vbus.com', pass: 'Owner@123' },
  { label: 'Supervisor', email: 'supervisor@vbus.com', pass: 'Supervisor@123' },
  { label: 'Sub-Supervisor', email: 'sub@vbus.com', pass: 'SubSup@123' },
];

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const data = await authApi.login(values);
      dispatch(setCredentials({ token: data.token, user: data.user }));
      toast.success(`Welcome back, ${data.user.name}`);
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F2] via-white to-orange-50/70 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Subtle decorative orange glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl shadow-orange-950/10 border border-orange-100 overflow-hidden relative z-10">
        {/* Left Brand Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-b from-white via-orange-50/40 to-orange-100/50 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-orange-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 text-orange-800 text-[11px] font-bold mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              Enterprise Fleet Portal
            </div>

            <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm flex items-center justify-center mb-6">
              <img src="/logo.png" alt="V Bus Holidays" className="h-32 w-auto object-contain" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Attendance &amp; Payroll Command Center
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Unified 3-tier verification for bus drivers &amp; cleaners—from daily depot marking to immutable PDF payslips.
            </p>
          </div>

          <div className="mt-6 space-y-2.5 text-xs text-slate-700">
            {[
              '3-Stage Batch & Record Approval Workflow',
              'Strict Backend Salary Confidentiality',
              'Weekly & Monthly Automated Payroll Runs',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sign-In Form */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign in to V-Bus</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your Owner, Supervisor, or Sub-Supervisor credentials
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@vbus.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 orange-gradient-btn disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-4 mt-4 border-t border-orange-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Quick-Fill Role Credentials
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => {
                      setValue('email', acc.email);
                      setValue('password', acc.pass);
                    }}
                    className="px-2.5 py-2 text-xs font-semibold bg-orange-50/70 hover:bg-orange-500 hover:text-white text-orange-800 border border-orange-200/70 rounded-xl transition-colors cursor-pointer"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
