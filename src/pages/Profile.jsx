import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Save,
  KeyRound,
  ShieldCheck,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi, changePasswordApi } from '../services/api';

const Profile = ({ showToast }) => {
  const { user, updateUserSession } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      showToast?.('Name and Email are required.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateProfileApi(profileForm);
      if (res.data?.user) {
        updateUserSession(res.data.user);
      }
      showToast?.(res.data?.message || 'Profile updated successfully.', 'success');
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showToast?.('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast?.('New password and Confirm password do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast?.(res.data?.message || 'Password updated successfully.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Formal Identity Header */}
      <div className="bg-white rounded-md border border-slate-200 border-l-4 border-l-[#0F2942] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded bg-[#0F2942] text-amber-300 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              ID: <strong className="text-slate-800">{user?.memberId}</strong> • {user?.email}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Loan Tenure: {user?.role === 'TEACHER' ? '45 Days' : '7 Days'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0F2942]" />
            <span>Member Profile Information</span>
          </h3>
          <p className="text-xs text-slate-500 pb-3 mb-4 border-b border-slate-100">
            Update contact details and department. Member ID and Role are governed by Library Administration.
          </p>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Member ID
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.memberId || ''}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.role || ''}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 border border-slate-200 rounded text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address *
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Department
                </label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold rounded transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>

        {/* Password Security Card */}
        <div className="bg-white rounded-md border border-slate-200 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#0F2942]" />
            <span>Account Security &amp; Password</span>
          </h3>
          <p className="text-xs text-slate-500 pb-3 mb-4 border-b border-slate-100">
            Update the initial password provisioned by the Chief Librarian.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (min. 6 characters) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0F2942]"
              />
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Credentials are encrypted with bcrypt before storage. Never share your institutional password.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Updating...' : 'Update Account Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
