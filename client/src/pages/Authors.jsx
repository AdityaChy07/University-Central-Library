import React, { useState, useEffect } from 'react';
import { Users2, Plus, Search, Edit2, Trash2, BookOpen, Globe } from 'lucide-react';
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const Authors = ({ showToast }) => {
  const { user } = useAuth();
  const isLibrarian = user?.role === 'LIBRARIAN';
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    biography: '',
  });

  const fetchAuthorsList = async () => {
    try {
      setLoading(true);
      const res = await getAuthors({ search: searchTerm });
      setAuthors(res.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorsList();
  }, [searchTerm]);

  const handleOpenAdd = () => {
    setEditingAuthor(null);
    setFormData({ name: '', country: '', biography: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (author) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name,
      country: author.country || '',
      biography: author.biography || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast?.('Author name is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAuthor) {
        await updateAuthor(editingAuthor._id, formData);
        showToast?.('Author updated and Neo4j node synced.', 'success');
      } else {
        await createAuthor(formData);
        showToast?.('Author created and Neo4j node synced.', 'success');
      }
      setIsModalOpen(false);
      fetchAuthorsList();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (author) => {
    if (!window.confirm(`Are you sure you want to delete author "${author.name}"?`)) {
      return;
    }
    try {
      const res = await deleteAuthor(author._id);
      showToast?.(res.data.message || 'Author deleted successfully.', 'success');
      fetchAuthorsList();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Authors Directory</h2>
          <p className="text-xs text-slate-500">
            Manage textbook and literature authors linked via Neo4j [:WROTE] relationships.
          </p>
        </div>
        {isLibrarian && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Author</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search authors by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-blue-500"
          />
        </div>
      </div>

      {/* Authors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm">
            Loading authors...
          </div>
        ) : authors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm">
            No authors found matching current criteria.
          </div>
        ) : (
          authors.map((author) => (
            <div
              key={author._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{author.name}</h3>
                  {isLibrarian && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(author)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition"
                        title="Edit Author"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(author)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition"
                        title="Delete Author"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {author.country && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{author.country}</span>
                  </div>
                )}

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                  {author.biography || 'No biography provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  {author.bookCount || 0} authored book(s)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ID: {author._id.slice(-6)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAuthor ? 'Edit Author Profile' : 'Register New Author'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Author Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Thomas H. Cormen"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Country / Nationality
            </label>
            <input
              type="text"
              placeholder="e.g. United States"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Biography / Academic Notes
            </label>
            <textarea
              rows="3"
              placeholder="Brief biography, research domain, or university affiliation..."
              value={formData.biography}
              onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
            ></textarea>
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
              {submitting ? 'Saving...' : editingAuthor ? 'Save Changes' : 'Register Author'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Authors;
