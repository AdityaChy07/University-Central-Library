import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  Lock,
} from 'lucide-react';
import { getMembers, registerMember, updateMember, deleteMember } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const Members = ({ showToast }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    memberId: '',
    name: '',
    email: '',
    phone: '',
    role: 'STUDENT',
    department: 'Computer Science',
    password: 'student123',
    active: true,
  });

  const fetchMembersList = async () => {
    try {
      setLoading(true);
      const res = await getMembers({ search: searchTerm });
      setMembers(res.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersList();
  }, [searchTerm]);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      memberId: `STU-${Math.floor(200 + Math.random() * 800)}`,
      name: '',
      email: '',
      phone: '',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      password: 'student123',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setFormData({
      memberId: member.memberId,
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role || 'STUDENT',
      department: member.department || 'Computer Science',
      password: '',
      active: member.active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.memberId.trim() || !formData.name.trim() || !formData.email.trim()) {
      showToast?.('Member ID, Name and Email are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMember) {
        await updateMember(editingMember._id, formData);
        showToast?.('Member updated successfully.', 'success');
      } else {
        await registerMember(formData);
        showToast?.(
          `Registered ${formData.role === 'TEACHER' ? 'Teacher (45-Day Loan)' : 'Student'} successfully!`,
          'success'
        );
      }
      setIsModalOpen(false);
      fetchMembersList();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (member) => {
    if (member.role === 'LIBRARIAN') {
      showToast?.('The Chief Librarian account cannot be deleted.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${member.role} "${member.name}"?`)) {
      return;
    }
    try {
      const res = await deleteMember(member._id);
      showToast?.(res.data.message || 'Member deleted successfully.', 'success');
      fetchMembersList();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    }
  };

  // Access Control: Only Librarian has permission
  if (user && user.role !== 'LIBRARIAN') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-12 space-y-3">
        <Lock className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-red-900">Restricted Librarian Area</h3>
        <p className="text-xs text-red-700 leading-relaxed">
          Only the <strong>Chief Librarian</strong> possesses administrative clearance to add, register, or remove Students and Teachers from the university database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Students & Teachers Registry</h2>
          <p className="text-xs text-slate-500">
            Exclusive Librarian Administration: Add or deactivate university students and faculty members.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student / Teacher</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, department, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-blue-500"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No members registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Member ID</th>
                  <th className="px-6 py-3">Name & Role</th>
                  <th className="px-6 py-3">Department & Contact</th>
                  <th className="px-6 py-3 text-center">Loan Privilege</th>
                  <th className="px-6 py-3 text-center">Account Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-600 text-xs">
                      {m.memberId}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          m.role === 'LIBRARIAN'
                            ? 'bg-blue-100 text-blue-700'
                            : m.role === 'TEACHER'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 space-y-0.5">
                      <div className="font-medium text-slate-800">{m.department || 'General'}</div>
                      <div className="text-slate-500">{m.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          m.role === 'TEACHER'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.role === 'TEACHER' ? '45 Days' : '7 Days'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {m.active ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        {m.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {m.role !== 'LIBRARIAN' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit University Member' : 'Register New Student or Teacher'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Member Role *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    role: 'STUDENT',
                    password: formData.password || 'student123',
                  })
                }
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  formData.role === 'STUDENT'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs">Student</div>
                  <div className="text-[10px] text-slate-500">7-day loan window</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    role: 'TEACHER',
                    password: formData.password || 'teacher123',
                  })
                }
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  formData.role === 'TEACHER'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="text-xs">Teacher / Faculty</div>
                  <div className="text-[10px] text-indigo-700 font-bold">45-day loan privilege</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Member ID (Unique) *
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editingMember)}
                placeholder={formData.role === 'TEACHER' ? 'e.g. TEA-102' : 'e.g. STU-205'}
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-blue-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Prof. Arvind Rao"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                University Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. user@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Department
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {editingMember
                ? 'Reset Password (Leave empty to keep existing)'
                : 'Assign Initial Password *'}
            </label>
            <input
              type="text"
              required={!editingMember}
              placeholder="Assign initial password (user can change later)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500 font-mono"
            />
            {!editingMember && (
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Share the Unique ID (or Email) and this initial password with the member; they can update their password & profile after signing in.
              </span>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs font-medium text-slate-700">
                Active Account (eligible to borrow library books)
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
