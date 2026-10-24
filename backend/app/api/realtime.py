from collections import defaultdict
from time import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["Realtime study rooms"])
rooms: dict[str, set[WebSocket]] = defaultdict(set)
timers: dict[str, dict] = {}


async def broadcast(room_id: str):
    message = {"type": "presence", "room": room_id, "participants": len(rooms[room_id])}
    closed = []
    for socket in rooms[room_id]:
        try:
            await socket.send_json(message)
        except Exception:
            closed.append(socket)
    for socket in closed:
        rooms[room_id].discard(socket)


async def broadcast_timer(room_id: str):
    state = timers.get(room_id, {"running": False, "remaining": 0})
    message = {"type": "timer", **state}
    for socket in list(rooms[room_id]):
        try:
            await socket.send_json(message)
        except Exception:
            rooms[room_id].discard(socket)


@router.websocket("/ws/study-rooms/{room_id}")
async def study_room(websocket: WebSocket, room_id: str):
    await websocket.accept()
    rooms[room_id].add(websocket)
    await broadcast(room_id)
    await broadcast_timer(room_id)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif message.get("type") == "start_timer":
                timers[room_id] = {"running": True, "remaining": int(message.get("seconds", 300)), "started_at": time()}
                await broadcast_timer(room_id)
            elif message.get("type") == "stop_timer":
                timers[room_id] = {"running": False, "remaining": 0}
                await broadcast_timer(room_id)
    except WebSocketDisconnect:
        rooms[room_id].discard(websocket)
        await broadcast(room_id)
