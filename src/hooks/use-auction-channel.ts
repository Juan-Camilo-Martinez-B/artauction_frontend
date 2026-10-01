'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AuctionInbound, AuctionOutbound } from '@/lib/ws/events';

export function useAuctionChannel(onMessage: (message: AuctionInbound) => void): {
  send: (message: AuctionOutbound) => void;
} {
  const portRef = useRef<MessagePort | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const channel = openAuctionWorker();
    portRef.current = channel.port;
    const listener = (event: MessageEvent<AuctionInbound>) => {
      handler.current(event.data);
    };
    channel.port.addEventListener('message', listener);
    channel.port.start();
    return () => {
      channel.port.removeEventListener('message', listener);
      channel.close();
      portRef.current = null;
    };
  }, []);

  const send = useCallback((message: AuctionOutbound) => {
    portRef.current?.postMessage(message);
  }, []);

  return { send };
}

function openAuctionWorker(): { port: MessagePort; close: () => void } {
  const url = new URL('../workers/auction.worker.ts', import.meta.url);
  if (typeof SharedWorker !== 'undefined') {
    const shared = new SharedWorker(url);
    return {
      port: shared.port,
      close() {
        shared.port.close();
      },
    };
  }
  const dedicated = new Worker(url);
  const bridge = new MessageChannel();
  dedicated.postMessage({ version: 1, type: 'join', auctionId: '', token: '', wsUrl: '' }, [bridge.port1]);
  return {
    port: bridge.port2,
    close: () => {
      bridge.port2.close();
      dedicated.terminate();
    },
  };
}
