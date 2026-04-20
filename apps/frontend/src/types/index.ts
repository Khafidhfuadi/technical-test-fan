export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  thumbnailUrl: string | null;
  rating: number;
  createdAt: string;
  uploadedBy: {
    name: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
