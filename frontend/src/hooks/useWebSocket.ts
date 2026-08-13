'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WSEvent } from '@/types';
import { getToken, API_WS_BASE } from '@/lib/api';

type WSEventHandler = (event: WSEvent) => void;

export function useWebSocket(userId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<WSEventHandler[]>([]);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${API_WS_BASE}/ws/${userId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Keep-alive ping every 30s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      ws.onclose = () => {
        clearInterval(ping);
        setIsConnected(false);
        // Reconnect after 2 seconds
        reconnectTimeout.current = setTimeout(connect, 2000);
      };
    };

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        handlersRef.current.forEach((h) => h(event));
      } catch {}
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((handler: WSEventHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, subscribe, send };
}
