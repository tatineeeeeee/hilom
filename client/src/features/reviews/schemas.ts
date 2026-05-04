export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  patientName: string;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  averageRating: string | null;
  ratingCount: number;
}
