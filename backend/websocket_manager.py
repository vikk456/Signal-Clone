from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        # user_id -> set of WebSocket connections (multiple tabs)
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and bool(self.active_connections[user_id])

    async def send_to_user(self, user_id: int, data: dict):
        """Send a message to all connections of a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.add(ws)
            for ws in disconnected:
                self.active_connections[user_id].discard(ws)

    async def send_to_users(self, user_ids: list[int], data: dict):
        """Broadcast a message to multiple users."""
        tasks = [self.send_to_user(uid, data) for uid in user_ids]
        await asyncio.gather(*tasks)

    async def broadcast_presence(self, user_id: int, is_online: bool, to_user_ids: list[int]):
        """Notify users about online/offline status change."""
        await self.send_to_users(to_user_ids, {
            "type": "user_presence",
            "user_id": user_id,
            "is_online": is_online,
        })


manager = ConnectionManager()
