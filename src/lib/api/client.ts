import { browserLocale } from '@/i18n/browser';
import type { Locale } from '@/i18n/locales';
import type {
  ActivityItem,
  AuctionView,
  AuthUser,
  BoughtNow,
  CatalogPage,
  Category,
  GalleryItem,
  GalleryRoom,
  LiveAuctions,
  Lot,
  LotModel,
  NotificationItem,
  PersonalGallery,
  PlacedBid,
  PurchasedSheet,
  ReviewItem,
  SignedUpload,
  TokenPair,
  TopUpResult,
  WalletSnapshot,
} from './types';

/**
 * Error de la API. `message` es el texto del servidor (en espanol); `code` es
 * estable y es el que se traduce al idioma de quien mira (ver lib/api/error-text).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly params: Readonly<Record<string, string>>;

  constructor(message: string, status: number, code: string | null = null, params: Readonly<Record<string, string>> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

export function publicApiUrl(): string {
  return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
}

export function publicWsUrl(): string {
  return process.env['NEXT_PUBLIC_WS_URL'] ?? publicApiUrl();
}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  if (init.token) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  // El gateway devuelve las fichas de las obras en este idioma.
  if (!headers.has('accept-language')) {
    headers.set('accept-language', browserLocale());
  }
  const response = await fetch(`${publicApiUrl()}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const { message, code, params } = await readError(response);
    throw new ApiError(message, response.status, code, params);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

interface ErrorBody {
  message: string;
  code: string | null;
  params: Record<string, string>;
}

const FALLBACK_MESSAGE = 'No se pudo completar la solicitud';

/** Lee { message, code, params } del gateway; un cuerpo que no es JSON queda como mensaje. */
async function readError(response: Response): Promise<ErrorBody> {
  const text = await response.text();
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body !== 'object' || body === null) {
      return { message: text || FALLBACK_MESSAGE, code: null, params: {} };
    }
    const record = body as { message?: unknown; code?: unknown; params?: unknown };
    const message =
      typeof record.message === 'string'
        ? record.message
        : Array.isArray(record.message)
          ? record.message.filter((item): item is string => typeof item === 'string').join(' ')
          : text;
    return { message: message || FALLBACK_MESSAGE, code: typeof record.code === 'string' ? record.code : null, params: stringParams(record.params) };
  } catch {
    return { message: text || FALLBACK_MESSAGE, code: null, params: {} };
  }
}

function stringParams(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

/** Ficha de una obra, al crearla o al editarla en borrador o como proyecto propio. */
export interface LotInput {
  title: string;
  description: string;
  materials: string;
  artistName?: string;
  creationYear?: number;
  categorySlug: string;
  representationKind: 'TWO_D' | 'THREE_D';
  widthCm: number;
  heightCm: number;
  depthCm?: number;
  provenance?: string;
}

/** Al crear: al catalogo (auditoria y subasta) o solo a la galeria propia. */
export interface NewLotInput extends LotInput {
  destination: 'CATALOG' | 'PERSONAL';
  /** Solo cuenta en un proyecto propio. */
  visibility?: 'PUBLIC' | 'PRIVATE';
}

/** Decision del administrador sobre una obra en revision manual. */
export type ResolveLotInput =
  | { verdict: 'APROBADO'; priceMin?: number; priceMax?: number }
  | { verdict: 'BORRADOR'; reason: string }
  | { verdict: 'REAUDITAR' };

export const artApi = {
  register(input: { email: string; password: string; displayName: string; role?: 'USER' | 'SELLER' }) {
    // La cuenta nace en el idioma con que la persona ve la plataforma.
    return api<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify({ ...input, locale: browserLocale() }) });
  },
  login(email: string, password: string) {
    return api<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  refresh(refreshToken: string) {
    return api<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  },
  me(token: string) {
    return api<AuthUser>('/auth/me', { token });
  },
  updateMe(token: string, input: { displayName: string; avatarUrl?: string }) {
    return api<AuthUser>('/auth/me', { method: 'PATCH', token, body: JSON.stringify(input) });
  },
  updatePreferences(token: string, locale: Locale) {
    return api<AuthUser>('/auth/me/preferences', { method: 'PATCH', token, body: JSON.stringify({ locale }) });
  },
  lots(query = '') {
    return api<CatalogPage>(`/lots${query}`);
  },
  categories() {
    return api<Category[]>('/lots/categories');
  },
  relatedLots(id: string) {
    return api<Lot[]>(`/lots/${id}/related`);
  },
  lot(id: string, token?: string | null) {
    return api<Lot>(`/lots/${id}`, { token });
  },
  createLot(token: string, input: NewLotInput) {
    return api<Lot>('/lots', { method: 'POST', token, body: JSON.stringify(input) });
  },
  /** Solo el vendedor y solo en borrador (por ejemplo, una obra devuelta). */
  updateLot(token: string, lotId: string, input: LotInput) {
    return api<Lot>(`/lots/${lotId}`, { method: 'PATCH', token, body: JSON.stringify(input) });
  },
  myLots(token: string) {
    return api<Lot[]>('/lots/mine', { token });
  },
  /** Muestra u oculta un proyecto propio en la galeria publica del autor. */
  setLotVisibility(token: string, lotId: string, visibility: 'PUBLIC' | 'PRIVATE') {
    return api<Lot>(`/lots/${lotId}/visibility`, { method: 'PATCH', token, body: JSON.stringify({ visibility }) });
  },
  signUpload(token: string, lotId: string, contentType: string, position: number) {
    return api<SignedUpload>(`/lots/${lotId}/uploads`, {
      method: 'POST',
      token,
      body: JSON.stringify({ contentType, position }),
    });
  },
  /** URL firmada para subir el modelo 3D (.glb) de una obra tridimensional. */
  signModelUpload(token: string, lotId: string) {
    return api<SignedUpload>(`/lots/${lotId}/model-uploads`, { method: 'POST', token, body: JSON.stringify({ contentType: 'model/gltf-binary' }) });
  },
  /** El catalogo lee el modelo subido, lo valida y lo mide. */
  registerModel(token: string, lotId: string, objectKey: string) {
    return api<LotModel>(`/lots/${lotId}/model`, { method: 'POST', token, body: JSON.stringify({ objectKey }) });
  },
  removeModel(token: string, lotId: string) {
    return api<undefined>(`/lots/${lotId}/model`, { method: 'DELETE', token });
  },
  registerImage(token: string, lotId: string, input: { objectKey: string; position: number; perceptualHash?: string }) {
    return api<Lot>(`/lots/${lotId}/images`, { method: 'POST', token, body: JSON.stringify(input) });
  },
  submitLot(token: string, lotId: string) {
    return api<{ status: string }>(`/lots/${lotId}/submit`, { method: 'POST', token });
  },
  auction(id: string) {
    return api<AuctionView>(`/auctions/${id}`);
  },
  liveAuctions(limit = 8) {
    return api<LiveAuctions>(`/auctions/live?limit=${String(limit)}`);
  },
  openAuction(
    token: string,
    input: { lotId: string; startPrice: string; minIncrement: string; startsAt: string; endsAt: string },
  ) {
    return api<AuctionView['auction']>('/auctions', { method: 'POST', token, body: JSON.stringify(input) });
  },
  placeBid(token: string, auctionId: string, amount: string, idempotencyKey: string) {
    return api<PlacedBid>(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      token,
      body: JSON.stringify({ amount, idempotencyKey }),
    });
  },
  /** Compra inmediata. La clave hace que repetirla (doble clic, reintento) no cobre dos veces. */
  buyNow(token: string, auctionId: string, idempotencyKey: string) {
    return api<BoughtNow>(`/auctions/${auctionId}/buy-now`, { method: 'POST', token, body: JSON.stringify({ idempotencyKey }) });
  },
  withdrawBid(token: string, auctionId: string) {
    return api<{ auctionId: string; released: number; currentPrice: string }>(`/auctions/${auctionId}/withdraw`, {
      method: 'POST',
      token,
    });
  },
  gallery(ownerId: string, token?: string | null) {
    return api<GalleryItem[]>(`/galleries/${ownerId}`, { token });
  },
  /** La sala 3D de una galeria; responde 404 si es privada, salvo a su duena. */
  galleryRoom(ownerId: string, token?: string | null) {
    return api<GalleryRoom>(`/galleries/${ownerId}/room`, { token });
  },
  /** Ficha guardada de una obra comprada; sin sesion solo responde si la obra es publica. */
  purchasedSheet(ownerId: string, lotId: string, token?: string | null) {
    return api<PurchasedSheet>(`/galleries/${ownerId}/works/${lotId}`, { token });
  },
  follow(token: string, userId: string) {
    return api<{ status: string }>(`/users/${userId}/follow`, { method: 'POST', token });
  },
  unfollow(token: string, userId: string) {
    return api<{ status: string }>(`/users/${userId}/follow`, { method: 'DELETE', token });
  },
  following(token: string) {
    return api<string[]>('/me/following', { token });
  },
  feed(token: string) {
    return api<ActivityItem[]>('/feed', { token });
  },
  notifications(token: string) {
    return api<NotificationItem[]>('/notifications', { token });
  },
  reviewQueue(token: string) {
    return api<ReviewItem[]>('/admin/reviews', { token });
  },
  resolveLot(token: string, lotId: string, input: ResolveLotInput) {
    return api<Lot>(`/admin/lots/${lotId}/resolve`, { method: 'POST', token, body: JSON.stringify(input) });
  },
  myGallery(token: string) {
    return api<PersonalGallery>('/me/gallery', { token });
  },
  setGalleryVisibility(token: string, visibility: 'PUBLIC' | 'PRIVATE') {
    return api<PersonalGallery>('/me/gallery/visibility', { method: 'PATCH', token, body: JSON.stringify({ visibility }) });
  },
  /** Muestra u oculta una obra comprada en la galeria de quien la compro. */
  setItemVisibility(token: string, lotId: string, visibility: 'PUBLIC' | 'PRIVATE') {
    return api<GalleryItem>(`/me/gallery/items/${lotId}/visibility`, { method: 'PATCH', token, body: JSON.stringify({ visibility }) });
  },
  generateGallery(token: string, preferences: unknown, random = false, replaceApplied = false) {
    return api<PersonalGallery>('/me/gallery/generate', {
      method: 'POST',
      token,
      body: JSON.stringify({ preferences, random, replaceApplied }),
    });
  },
  saveGalleryConfig(token: string, config: unknown) {
    return api<PersonalGallery>('/me/gallery/config', { method: 'PATCH', token, body: JSON.stringify(config) });
  },
  restoreGallery(token: string) {
    return api<PersonalGallery>('/me/gallery/restore', { method: 'POST', token });
  },
  /** Cuelga en la sala 3D una obra propia (proyecto, publicada sin vender o ganada). */
  addToGallery(token: string, lotId: string) {
    return api<PersonalGallery>('/me/gallery/artworks', { method: 'POST', token, body: JSON.stringify({ lotId }) });
  },
  placeArtwork(
    token: string,
    lotId: string,
    placement: { posX: number; posY: number; posZ: number; rotY: number; scale: number; support: string },
  ) {
    return api<PersonalGallery>(`/me/gallery/artworks/${lotId}`, { method: 'PATCH', token, body: JSON.stringify(placement) });
  },
  removeFromGallery(token: string, lotId: string) {
    return api<PersonalGallery>(`/me/gallery/artworks/${lotId}`, { method: 'DELETE', token });
  },
  wallet(token: string) {
    return api<WalletSnapshot>('/wallet', { token });
  },
  /**
   * La clave de idempotencia identifica un intento de pago: repetirla con los
   * mismos datos devuelve la misma orden sin volver a cobrar.
   */
  topUp(
    token: string,
    idempotencyKey: string,
    input: { coins: number; cardNumber: string; cardName: string; expMonth: number; expYear: number; cvv: string },
  ) {
    return api<TopUpResult>('/wallet/top-ups', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify(input),
    });
  },
};
