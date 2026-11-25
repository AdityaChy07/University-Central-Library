import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { getBooks, createBook, updateBook, deleteBook, getAuthors } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const Books = ({ showToast }) => {
  const { user } = useAuth();
  const isLibrarian = user?.role === 'LIBRARIAN';
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    authorId: '',
    category: 'Computer Science',
    quantity: 3,
    availableCopies: 3,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksRes, authorsRes] = await Promise.all([
        getBooks({
          search: searchTerm,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
        }),
        getAuthors(),
      ]);
      setBooks(booksRes.data?.data || []);
      setAuthors(authorsRes.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      isbn: '',
      authorId: authors[0]?._id || '',
      category: 'Computer Science',
      quantity: 3,
      availableCopies: 3,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      isbn: book.isbn,
      authorId: book.authorId?._id || book.authorId || '',
      category: book.category || 'General',
      quantity: book.quantity,
      availableCopies: book.availableCopies,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.isbn.trim() || !formData.authorId) {
      showToast?.('Please fill all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBook) {
        await updateBook(editingBook._id, formData);
        showToast?.('Book updated and Neo4j node synced.', 'success');
      } else {
        await createBook(formData);
        showToast?.('Book created and Neo4j node synced.', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Are you sure you want to delete "${book.title}"?`)) {
      return;
    }
    try {
      const res = await deleteBook(book._id);
      showToast?.(res.data.message || 'Book deleted successfully.', 'success');
      fetchData();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    }
  };

  const categories = ['All', 'Computer Science', 'Algorithms', 'Networking', 'Artificial Intelligence', 'Software Engineering', 'Databases', 'Operating Systems', 'Mathematics'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Books Catalog</h2>
          <p className="text-xs text-slate-500">
            Manage academic book inventory, stock levels, and author linkages.
          </p>
        </div>
        {isLibrarian && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Book</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, ISBN, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading books...</div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No books found matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Book Details</th>
                  <th className="px-6 py-3">Author</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-center">Available / Total</th>
                  <th className="px-6 py-3 text-center">Stock Status</th>
                  <th className="px-6 py-3 text-right">
                    {isLibrarian ? 'Actions' : 'Expected Allocation'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b) => {
                  const isAvailable = b.availableCopies > 0;
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{b.title}</div>
                        <div className="text-xs font-mono text-slate-500">ISBN: {b.isbn}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {b.authorId?.name || 'Unknown Author'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {b.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-800">
                        {b.availableCopies} / {b.quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isAvailable ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {isAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isLibrarian ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit Book"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Delete Book"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-600">
                            {isAvailable ? 'Available Today' : b.allocationStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBook ? 'Edit Book Record' : 'Add New Academic Book'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Book Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Introduction to Algorithms"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISBN Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 978-0262033848"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Algorithms"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Author *
            </label>
            <select
              required
              value={formData.authorId}
              onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-blue-500"
            >
              <option value="">Select Author...</option>
              {authors.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.country || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => {
                  const q = Number(e.target.value);
                  setFormData({
                    ...formData,
                    quantity: q,
                    availableCopies: Math.min(formData.availableCopies, q),
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Copies *
              </label>
              <input
                type="number"
                min="0"
                max={formData.quantity}
                required
                value={formData.availableCopies}
                onChange={(e) =>
                  setFormData({ ...formData, availableCopies: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-blue-500"
              />
            </div>
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
              {submitting ? 'Saving...' : editingBook ? 'Save Changes' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Books;
