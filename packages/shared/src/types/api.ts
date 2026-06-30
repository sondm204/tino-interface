export type ApiResponse<T> = {
  message: string;
  code: string;
  data: T | null;
};

export type PageableResponse<T> = {
  items: T[];
  page: number;
  size: number;
  total?: number;
  total_items?: number;
  total_pages: number;
  has_next?: boolean;
  has_previous?: boolean;
};
