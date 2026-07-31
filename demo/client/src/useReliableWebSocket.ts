import { useEffect, useRef, useState } from 'react';

const HEARTBEAT_INTERVAL_MS = 10_000;
const CONNECTION_SILENCE_LIMIT_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 10_000;

type ReliableWebSocketOptions = {
  onOpen?: (socket: WebSocket) => void;
  onMessage?: (event: MessageEvent, socket: WebSocket) => void;
};

export function useReliableWebSocket(
  url: string,
  { onOpen, onMessage }: ReliableWebSocketOptions,
) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onOpenRef = useRef(onOpen);
  const onMessageRef = useRef(onMessage);

  onOpenRef.current = onOpen;
  onMessageRef.current = onMessage;

  useEffect(() => {
    let stopped = false;
    let current: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let heartbeatTimer: number | undefined;
    let reconnectAttempt = 0;
    let lastServerMessageAt = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const clearHeartbeatTimer = () => {
      if (heartbeatTimer !== undefined) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }
    };

    const retire = (target: WebSocket) => {
      target.onopen = null;
      target.onmessage = null;
      target.onerror = null;
      target.onclose = null;
      if (target.readyState === WebSocket.OPEN || target.readyState === WebSocket.CONNECTING) {
        target.close();
      }
    };

    const scheduleReconnect = (connect: () => void, immediately = false) => {
      if (stopped || reconnectTimer !== undefined) return;
      const delay = immediately
        ? 0
        : Math.min(500 * (2 ** reconnectAttempt), MAX_RECONNECT_DELAY_MS);
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      if (stopped) return;
      if (navigator.onLine === false) {
        scheduleReconnect(connect);
        return;
      }

      const next = new WebSocket(url);
      current = next;
      setSocket(next);
      setConnected(false);

      const restart = () => {
        if (stopped || current !== next) return;
        current = null;
        setSocket(null);
        setConnected(false);
        clearHeartbeatTimer();
        retire(next);
        scheduleReconnect(connect, true);
      };

      next.onopen = () => {
        if (stopped || current !== next) {
          retire(next);
          return;
        }
        reconnectAttempt = 0;
        lastServerMessageAt = Date.now();
        setConnected(true);
        onOpenRef.current?.(next);
        clearHeartbeatTimer();
        heartbeatTimer = window.setInterval(() => {
          if (current !== next || next.readyState !== WebSocket.OPEN) return;
          if (Date.now() - lastServerMessageAt > CONNECTION_SILENCE_LIMIT_MS) {
            restart();
            return;
          }
          next.send(JSON.stringify({ action: 'client_ping' }));
        }, HEARTBEAT_INTERVAL_MS);
      };

      next.onmessage = (event) => {
        if (current !== next) return;
        lastServerMessageAt = Date.now();
        if (typeof event.data === 'string') {
          try {
            if (JSON.parse(event.data)?.type === 'server_pong') return;
          } catch {
            // Let the page-level handler report malformed application messages.
          }
        }
        onMessageRef.current?.(event, next);
      };

      next.onerror = () => {
        restart();
      };

      next.onclose = () => {
        if (stopped || current !== next) return;
        current = null;
        setSocket(null);
        setConnected(false);
        clearHeartbeatTimer();
        scheduleReconnect(connect);
      };
    };

    const checkConnectionNow = () => {
      clearReconnectTimer();
      if (!current) {
        scheduleReconnect(connect, true);
        return;
      }
      if (current.readyState !== WebSocket.OPEN) {
        const stale = current;
        current = null;
        setSocket(null);
        setConnected(false);
        retire(stale);
        scheduleReconnect(connect, true);
        return;
      }
      if (Date.now() - lastServerMessageAt > CONNECTION_SILENCE_LIMIT_MS) {
        const stale = current;
        current = null;
        setSocket(null);
        setConnected(false);
        clearHeartbeatTimer();
        retire(stale);
        scheduleReconnect(connect, true);
        return;
      }
      current.send(JSON.stringify({ action: 'client_ping' }));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkConnectionNow();
    };

    connect();
    window.addEventListener('online', checkConnectionNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopped = true;
      clearReconnectTimer();
      clearHeartbeatTimer();
      window.removeEventListener('online', checkConnectionNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (current) retire(current);
    };
  }, [url]);

  return { socket, connected };
}
