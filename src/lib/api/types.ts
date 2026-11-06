export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  displayName?: string;
  avatarUrl?: string | null;
  /** Idioma de la interfaz guardado en la cuenta: es o en. */
  locale?: string;
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
  url?: string | null;
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

export interface LotCategoryLink {
  isPrimary: boolean;
  category: { id: string; name: string; slug: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

export interface CatalogPage {
  items: Lot[];
  total: number;
  page: number;
  pageSize: number;
}

/** Ultima decision de un administrador sobre la obra. */
export interface LotReview {
  decision: 'APPROVE' | 'RETURN_TO_DRAFT' | 'REAUDIT';
  reason: string | null;
  createdAt: string | null;
}

/** Modelo 3D (GLB) validado de una obra tridimensional. */
export interface LotModel {
  url: string | null;
  bytes: number;
  triangleCount: number;
  vertexCount: number;
  /** Caja que envuelve el modelo, en sus unidades (Blender exporta metros). */
  size: { x: number; y: number; z: number };
}

/** Textos de una ficha que se traducen. */
export interface LotTexts {
  title: string;
  description: string;
  materials: string;
  provenance: string | null;
}

export interface Lot {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  artistName: string | null;
  creationYear: number | null;
  materials: string;
  widthCm?: string | null;
  heightCm?: string | null;
  depthCm?: string | null;
  provenance?: string | null;
  representationKind?: 'TWO_D' | 'THREE_D' | 'OTHER' | null;
  status: string;
  visibility: string;
  authenticityScore: number | null;
  suggestedPriceMin: string | null;
  suggestedPriceMax: string | null;
  currency: string;
  images?: LotImage[];
  auditSummaries?: AuditSummary[];
  categories?: LotCategoryLink[];
  lastReview?: LotReview | null;
  model?: LotModel | null;
  /** Idioma en que el autor escribio la ficha, si ya se detecto. */
  sourceLocale?: 'es' | 'en' | null;
  /** La ficha viene traducida al idioma pedido; el original va en `original` y es el que vale. */
  translated?: boolean;
  original?: LotTexts | null;
  auction?: {
    id: string;
    status: string;
    currentPrice: string;
    startsAt?: string;
    endsAt: string;
    saleDescription?: string | null;
    currency?: string;
    /** Precio de compra inmediata y si todavia se ofrece. */
    buyNowPrice?: string;
    buyNowAvailable?: boolean;
  } | null;
}

export interface Bid {
  id: string;
  bidderId: string;
  amount: string;
  createdAt: string;
  /** false si el postor se retiro o la sala se reprogramo. */
  active?: boolean;
  /** La puja fue una compra inmediata. */
  buyNow?: boolean;
}

/** Por que cerro una sala: al vencer el tiempo o por una compra inmediata. */
export type CloseReason = 'TIME' | 'BUY_NOW';

export interface Auction {
  id: string;
  lotId: string;
  sellerId?: string;
  startPrice: string;
  currentPrice: string;
  minIncrement: string;
  startsAt?: string | null;
  endsAt: string;
  status: string;
  winnerId: string | null;
  saleDescription?: string | null;
  bids?: Bid[];
  buyNowPrice?: string;
  buyNowAvailable?: boolean;
  closedBy?: CloseReason | null;
}

export interface BoughtNow {
  auctionId: string;
  bidId: string;
  amount: string;
  idempotent: boolean;
}

/** Cartelera de salas activas y proximas, con la hora del servidor. */
export interface LiveAuctions {
  items: Lot[];
  serverTime: string;
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
  lotId: string;
  /** PROYECTO: proyecto propio sin auditar; PROPIA: obra suya en el catalogo; GANADA: ganada en subasta. */
  source: 'PROYECTO' | 'PROPIA' | 'GANADA';
  visibility: 'PUBLIC' | 'PRIVATE';
  title: string;
  artistName: string | null;
  imageKeys: string[];
  acquiredAt: string;
  /** Primera imagen; null si la obra no tiene o aun no se pudo obtener. */
  previewUrl: string | null;
}

/** Una galeria con obras publicas, tal como se muestra al explorar. */
export interface PublicGallery {
  ownerId: string;
  displayName: string;
  avatarUrl: string | null;
  workCount: number;
  followerCount: number;
  latestAt: string | null;
  previews: GalleryItem[];
}

export interface PublicGalleriesPage {
  items: PublicGallery[];
  total: number;
  page: number;
  pageSize: number;
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

export interface ReviewEvidence {
  code: string;
  value: string;
}

export interface ReviewFinding {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  evidence: ReviewEvidence[];
}

export interface ReviewItem {
  lot: Lot;
  audit: {
    summaryId: string;
    score: number;
    decidedBy: 'RULES' | 'AI' | 'LOCAL' | 'FALLBACK' | null;
    modelName: string;
    createdAt: string | null;
    findings: ReviewFinding[];
  } | null;
}

export interface SignedUpload {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface GalleryConfig {
  schemaVersion: 1;
  source: 'ai-local' | 'ai' | 'manual' | 'random';
  identity: { styleName: string; summary: string; artStyles: string[] };
  architecture: {
    spaceType: string;
    roomWidth: number;
    roomDepth: number;
    roomHeight: number;
    zones: number;
  };
  palette: { wall: string; floor: string; ceiling: string; accent: string; pedestal: string };
  materials: { wall: string; floor: string; sculptureSupport: string };
  lighting: { ambientIntensity: number; colorTemperature: number; spotIntensity: number; mood: string };
  navigation: { tour: string; approach: string; motion: string };
}

export interface WalletEntry {
  id: string;
  kind: 'RECARGA' | 'RETENCION' | 'LIBERACION' | 'CANJE' | 'VENTA' | 'REEMBOLSO' | 'ANULACION';
  coins: number;
  createdAt: string;
}

export interface WalletSnapshot {
  balance: number;
  held: number;
  entries: WalletEntry[];
}

export interface TopUpResult {
  balance: number;
  credited: number;
  last4: string;
  orderId: string;
}

/** Ficha guardada de una obra comprada: la copia que conserva su galeria. */
export interface PurchasedSheet {
  ownerId: string;
  lot: Lot | null;
  /** Solo para la duena; null en compras anteriores a la ficha guardada. */
  pricePaid: string | null;
  buyNow: boolean | null;
  acquiredAt: string | null;
}

export interface PersonalGallery {
  id: string;
  ownerId: string;
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  customizationStatus: 'SIN_PERSONALIZAR' | 'PERSONALIZADA' | 'EDITADA';
  preferences: Record<string, unknown>;
  suggestedConfig: GalleryConfig | null;
  appliedConfig: GalleryConfig | null;
  artworks: Array<{
    id: string;
    lotId: string;
    posX: number;
    posY: number;
    posZ: number;
    rotY: number;
    scale: number;
    support: string;
    lot: Lot;
  }>;
}

/** La sala tal como la ve un visitante. */
export type GalleryRoom = Pick<PersonalGallery, 'ownerId' | 'visibility' | 'appliedConfig' | 'artworks'>;
