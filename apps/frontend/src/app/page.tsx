'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Star, ChevronLeft, ChevronRight, BookOpen, Search } from 'lucide-react';
import { Book, PaginatedResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const LIMIT = 12;

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'}
        />
      ))}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  const thumbnailSrc = book.thumbnailUrl
    ? `${API_URL}${book.thumbnailUrl}`
    : null;

  return (
    <Link
      href={`/books/${book.id}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailSrc}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen size={40} className="text-gray-300" />
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{book.title}</h3>
        <p className="text-xs text-gray-500">{book.author}</p>
        <StarRating rating={book.rating} />
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>by {book.uploadedBy?.name}</span>
          <span>{new Date(book.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [author, setAuthor] = useState(searchParams.get('author') || '');
  const [rating, setRating] = useState(searchParams.get('rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'date');
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const authorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedAuthor, setDebouncedAuthor] = useState(author);

  // Debounce author input 400ms
  useEffect(() => {
    if (authorDebounceRef.current) clearTimeout(authorDebounceRef.current);
    authorDebounceRef.current = setTimeout(() => {
      setDebouncedAuthor(author);
      setPage(1);
    }, 400);
    return () => { if (authorDebounceRef.current) clearTimeout(authorDebounceRef.current); };
  }, [author]);

  // Sync URL
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedAuthor) params.set('author', debouncedAuthor);
    if (rating) params.set('rating', rating);
    if (sortBy !== 'date') params.set('sortBy', sortBy);
    if (order !== 'desc') params.set('order', order);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedAuthor, rating, sortBy, order, page, router]);

  // Fetch books
  useEffect(() => {
    syncUrl();

    const fetch = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const params: Record<string, string> = {
          sortBy,
          order,
          page: String(page),
          limit: String(LIMIT),
        };
        if (debouncedAuthor) params.author = debouncedAuthor;
        if (rating) params.rating = rating;

        const { data } = await axios.get<PaginatedResponse<Book>>(`${API_URL}/api/books`, { params });
        setBooks(data.data);
        setMeta(data.meta);
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [debouncedAuthor, rating, sortBy, order, page, syncUrl]);

  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split(':');
    setSortBy(newSortBy);
    setOrder(newOrder);
    setPage(1);
  };

  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
            <BookOpen size={20} className="text-blue-600" />
            <span>BookShelf</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg transition hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Books</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Browse a curated collection of books shared by our community. Find your next great read.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 bg-white p-3 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by author..."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="text-sm w-full focus:outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>

          <select
            value={rating}
            onChange={(e) => { setRating(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Ratings</option>
            <option value="1">1+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="5">5 Stars</option>
          </select>

          <select
            value={`${sortBy}:${order}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="date:desc">Newest First</option>
            <option value="date:asc">Oldest First</option>
            <option value="rating:desc">Highest Rating</option>
            <option value="rating:asc">Lowest Rating</option>
          </select>
        </div>

        {/* Error state */}
        {isError && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-3">Failed to load books.</p>
            <button
              onClick={() => setPage(1)}
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Book grid */}
        {!isLoading && !isError && books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && books.length === 0 && (
          <div className="text-center py-20">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No books found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && meta.total > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{startItem}–{endItem}</span> of{' '}
              <span className="font-medium text-gray-700">{meta.total}</span> books
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span className="text-sm text-gray-500 px-2">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
