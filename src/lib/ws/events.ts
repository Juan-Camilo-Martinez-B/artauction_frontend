export interface ServerTimeEvent {
  version: 1;
  serverTime: string;
}

export interface BidAcceptedEvent {
  version: 1;
  auctionId: string;
  bidId: string;
  bidderId: string;
  amount: string;
  endsAt: string;
  extended: boolean;
  serverTime: string;
}

export interface BidRejectedEvent {
  version: 1;
  auctionId: string;
  message: string;
  serverTime: string;
}

export interface AuctionClosedEvent {
  version: 1;
  auctionId: string;
  lotId: string;
  winnerId: string | null;
  amount: string;
  /** Campo nuevo y opcional: un gateway anterior no lo manda y se toma como TIME. */
  closedBy?: 'TIME' | 'BUY_NOW';
  serverTime: string;
}

export type AuctionInbound =
  | { version: 1; type: 'server-time'; offsetMs: number; serverTime: string }
  | { version: 1; type: 'bid-accepted'; event: BidAcceptedEvent }
  | { version: 1; type: 'bid-rejected'; event: BidRejectedEvent }
  | { version: 1; type: 'auction-closed'; event: AuctionClosedEvent }
  | { version: 1; type: 'status'; connected: boolean };

export type AuctionOutbound =
  | { version: 1; type: 'join'; auctionId: string; token: string; wsUrl: string }
  | { version: 1; type: 'bid'; auctionId: string; amount: string; idempotencyKey: string };
