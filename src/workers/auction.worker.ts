/// <reference lib="webworker" />
import { io, type Socket } from 'socket.io-client';
import type { AuctionClosedEvent, AuctionInbound, AuctionOutbound, BidAcceptedEvent, BidRejectedEvent } from '../lib/ws/events';

const ports = new Set<MessagePort>();
let socket: Socket | null = null;
let joinedAuction: string | null = null;

function publish(message: AuctionInbound): void {
  for (const port of ports) {
    port.postMessage(message);
  }
}

function rememberTime(serverTime: string): void {
  publish({ version: 1, type: 'server-time', offsetMs: new Date(serverTime).getTime() - Date.now(), serverTime });
}

function ensureSocket(wsUrl: string, token: string): Socket {
  if (socket) {
    return socket;
  }
  const next = io(wsUrl, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
  });
  next.on('connect', () => {
    publish({ version: 1, type: 'status', connected: true });
    if (joinedAuction) {
      next.emit('auction:join', joinedAuction);
    }
  });
  next.on('disconnect', () => {
    publish({ version: 1, type: 'status', connected: false });
  });
  next.on('serverTime', (event: { serverTime?: string }) => {
    if (event.serverTime) {
      rememberTime(event.serverTime);
    }
  });
  next.on('bid:accepted', (event: BidAcceptedEvent) => {
    if (event.serverTime) {
      rememberTime(event.serverTime);
    }
    publish({ version: 1, type: 'bid-accepted', event });
  });
  next.on('bid:rejected', (event: BidRejectedEvent) => {
    publish({ version: 1, type: 'bid-rejected', event });
  });
  next.on('auction:closed', (event: AuctionClosedEvent) => {
    publish({ version: 1, type: 'auction-closed', event });
  });
  socket = next;
  return next;
}

function onPortMessage(event: MessageEvent<unknown>): void {
  const message = readOutbound(event.data);
  if (!message) {
    return;
  }
  if (message.type === 'join') {
    joinedAuction = message.auctionId;
    const current = ensureSocket(message.wsUrl, message.token);
    if (current.connected) {
      current.emit('auction:join', message.auctionId);
    }
    return;
  }
  socket?.emit('bid:place', {
    auctionId: message.auctionId,
    amount: message.amount,
    idempotencyKey: message.idempotencyKey,
  });
}

function adopt(port: MessagePort): void {
  ports.add(port);
  port.addEventListener('message', onPortMessage as EventListener);
  port.start();
}

const scope = self as unknown as SharedWorkerGlobalScope & DedicatedWorkerGlobalScope;

if (typeof scope.onconnect !== 'undefined' || 'onconnect' in scope) {
  scope.onconnect = (event: MessageEvent) => {
    const port = event.ports[0];
    if (port) {
      adopt(port);
    }
  };
}

scope.onmessage = (event: MessageEvent<unknown>) => {
  const port = event.ports[0];
  if (port) {
    adopt(port);
    return;
  }
  onPortMessage(event);
};

function readOutbound(value: unknown): AuctionOutbound | null {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('type' in value)) {
    return null;
  }
  if (value.type === 'join' && 'auctionId' in value && 'token' in value && 'wsUrl' in value) {
    if (typeof value.auctionId === 'string' && typeof value.token === 'string' && typeof value.wsUrl === 'string') {
      return { version: 1, type: 'join', auctionId: value.auctionId, token: value.token, wsUrl: value.wsUrl };
    }
  }
  if (value.type === 'bid' && 'auctionId' in value && 'amount' in value && 'idempotencyKey' in value) {
    if (typeof value.auctionId === 'string' && typeof value.amount === 'string' && typeof value.idempotencyKey === 'string') {
      return { version: 1, type: 'bid', auctionId: value.auctionId, amount: value.amount, idempotencyKey: value.idempotencyKey };
    }
  }
  return null;
}
