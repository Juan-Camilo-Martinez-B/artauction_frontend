export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LotImage {
  id: string;
  objectKey: string;
  position: number;
  perceptualHash: string | null;
}

export interface AuditSummary {
  id: string;
  score: number;
  priceMin: string;
  priceMax: string;
  verdict: string;
  hasCriticalInconsistency: boolean;
  modelName: string;
  promptVersion: string;
}

export interface Lot {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  artistName: string | null;
  creationYear: number | null;
  materials: string;
  status: string;
  visibility: string;
  authenticityScore: number | null;
  suggestedPriceMin: string | null;
  suggestedPriceMax: string | null;
  currency: string;
  images?: LotImage[];
  auditSummaries?: AuditSummary[];
  auction?: { id: string; status: string; currentPrice: string; endsAt: string } | null;
}

export interface Bid {
  id: string;
  bidderId: string;
  amount: string;
  createdAt: string;
}

export interface Auction {
  id: string;
  lotId: string;
  startPrice: string;
  currentPrice: string;
  minIncrement: string;
  endsAt: string;
  status: string;
  winnerId: string | null;
  bids?: Bid[];
}

export interface AuctionView {
  auction: Auction;
  serverTime: string;
}

export interface PlacedBid {
  bidId: string;
  auctionId: string;
  amount: string;
  endsAt: string;
  extended: boolean;
  idempotent: boolean;
  currentPrice: string;
}

export interface GalleryItem {
  ownerId: string;
  lotId: string | null;
  source: 'PROPIA' | 'GANADA' | 'GRATUITA';
  visibility: 'PUBLIC' | 'PRIVATE';
  title: string;
  artistName: string | null;
  imageKeys: string[];
  acquiredAt: string;
}

export interface ActivityItem {
  actorId: string;
  verb: string;
  objectType: string;
  objectId: string;
  visibility: string;
  summary: string;
  createdAt: string;
}

export interface NotificationItem {
  userId: string;
  kind: string;
  payload: Record<string, string | null>;
  createdAt: string;
  readAt: string | null;
}

export interface SignedUpload {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}
