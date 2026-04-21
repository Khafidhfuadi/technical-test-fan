'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star, BookOpen, X, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { Book } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---- Zod schema ----
const bookSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  author: z.string().min(2, 'Author must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rating: z.number().min(1, 'Please select a rating').max(5),
});
type BookForm = z.infer<typeof bookSchema>;

// ---- Star Rating Input ----
function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            size={24}
            className={
              s <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300 fill-gray-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

// ---- Inline star display ----
function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </span>
  );
}

// ---- Confirm Dialog ----
function ConfirmDialog({
  title,
  onConfirm,
  onCancel,
  isLoading,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Delete Book</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-medium text-gray-700">"{title}"</span>? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white transition flex items-center gap-1.5"
          >
            <span className="flex items-center gap-1.5">
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              <span>Delete</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Skeleton row ----
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="w-10 h-12 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-40" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
      <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded w-16" /></td>
    </tr>
  );
}

// ---- Main Page ----
export default function MyBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [rating, setRating] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
  });

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/books/my-books', { params: { page, limit: 10, sortBy: 'date', order: 'desc' } });
      setBooks(data.data);
      setMeta(data.meta);
    } catch {
      // no-op
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const openCreate = () => {
    setEditingBook(null);
    setRating(0);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setSubmitError('');
    reset({ title: '', author: '', description: '', rating: 0 });
    setShowModal(true);
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setRating(book.rating);
    setThumbnailFile(null);
    setThumbnailPreview(book.thumbnailUrl ? `${API_URL}${book.thumbnailUrl}` : null);
    setSubmitError('');
    reset({ title: book.title, author: book.author, description: book.description, rating: book.rating });
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: BookForm) => {
    setSubmitLoading(true);
    setSubmitError('');

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('author', data.author);
    formData.append('description', data.description);
    formData.append('rating', String(rating));
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

    try {
      if (editingBook) {
        await api.put(`/api/books/${editingBook.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/api/books', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowModal(false);
      fetchBooks();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Something went wrong';
      setSubmitError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/books/${deleteTarget.id}`);
      // Optimistically remove from state immediately
      setBooks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setDeleteTarget(null);
      // Then refetch to sync pagination/totals from server
      fetchBooks();
    } catch {
      // no-op
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Books</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your uploaded book collection.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Add Book
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-16">Cover</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Author</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Added</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

            {!isLoading && books.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <BookOpen size={36} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">You haven't added any books yet.</p>
                  <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">
                    Add your first book
                  </button>
                </td>
              </tr>
            )}

            {!isLoading && books.map((book) => (
              <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-10 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                    {book.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${API_URL}${book.thumbnailUrl}`} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={16} className="text-gray-300" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{book.title}</td>
                <td className="px-4 py-3 text-gray-500">{book.author}</td>
                <td className="px-4 py-3"><StarDisplay rating={book.rating} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(book.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(book)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(book)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && meta.total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page <span className="font-medium text-gray-700">{meta.page}</span> of{' '}
            <span className="font-medium text-gray-700">{meta.totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Book Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input {...register('title')} placeholder="Book title"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input {...register('author')} placeholder="Author name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.author && <p className="mt-1 text-xs text-red-500">{errors.author.message}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...register('description')} placeholder="Book description (min. 10 characters)" rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <StarRatingInput value={rating} onChange={(v) => { setRating(v); setValue('rating', v); }} />
                {errors.rating && <p className="mt-1 text-xs text-red-500">{errors.rating.message}</p>}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail (optional)</label>
                {thumbnailPreview && (
                  <div className="mb-2 relative w-24 h-28 rounded overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setThumbnailFile(null); setThumbnailPreview(editingBook?.thumbnailUrl ? `${API_URL}${editingBook.thumbnailUrl}` : null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-gray-500" />
                <p className="text-xs text-gray-400 mt-1">Max 2MB. JPEG, PNG, WEBP.</p>
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5">
                    {submitLoading && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingBook ? 'Save Changes' : 'Add Book'}</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
