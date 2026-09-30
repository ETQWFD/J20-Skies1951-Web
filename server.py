#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
长空·1951 网页联机服务器（零依赖，仅 Python3 标准库）
- 同时托管网页（HTTP 静态文件）与联机中继（WebSocket /ws）
- 同站 http + ws，浏览器不会因 https 混合内容拦截
用法：  python3 server.py          （默认端口 8765）
       python3 server.py 9000
房主与战友在同一局域网用浏览器打开： http://<本机IP>:8765/net.html
"""
import os, sys, json, socket, struct, hashlib, base64, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

_clients = set()
_lock = threading.Lock()
_next_sid = [1]

CT = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
      ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
      ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2"}


def broadcast(obj, exclude=None):
    data = ws_encode(json.dumps(obj, ensure_ascii=False))
    with _lock:
        for c in list(_clients):
            if c is exclude:
                continue
            try:
                c.send(data)
            except OSError:
                _clients.discard(c)


def ws_encode(msg: str) -> bytes:
    payload = msg.encode("utf-8")
    n = len(payload)
    head = b"\x81"
    if n < 126:
        head += struct.pack("B", n)
    elif n < 65536:
        head += struct.pack(">BH", 126, n)
    else:
        head += struct.pack(">BQ", 127, n)
    return head + payload


class WSConn:
    def __init__(self, conn, addr, sid):
        self.conn = conn
        self.addr = addr
        self.sid = sid
        self.alive = True

    def send(self, data: bytes):
        self.conn.sendall(data)

    def _read_n(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.conn.recv(n - len(buf))
            if not chunk:
                raise OSError("closed")
            buf += chunk
        return buf

    def serve(self):
        with self.conn:
            self.send(ws_encode(json.dumps({"t": "sid", "sid": self.sid})))
            buf = b""
            while self.alive:
                b = self.conn.recv(65536)
                if not b:
                    break
                buf += b
                # 可能一次来多个帧，循环解析
                while True:
                    msg, buf, ok = self._parse(buf)
                    if not ok:
                        break  # 数据不全，等更多
                    if msg is not None:
                        try:
                            d = json.loads(msg)
                            broadcast({"sid": self.sid, "d": d}, exclude=self)
                        except Exception:
                            pass
        # 离场
        with _lock:
            _clients.discard(self)
        broadcast({"sid": 0, "d": {"t": "leave", "sid": self.sid}})

    def _parse(self, buf):
        """返回 (text_or_None, 剩余buf, 是否可继续)。close/ping 在此处理。"""
        if len(buf) < 2:
            return None, buf, False
        b0, b1 = buf[0], buf[1]
        opcode = b0 & 0x0F
        masked = bool(b1 & 0x80)
        ln = b1 & 0x7F
        idx = 2
        if ln == 126:
            if len(buf) < 4:
                return None, buf, False
            ln = struct.unpack(">H", buf[2:4])[0]
            idx = 4
        elif ln == 127:
            if len(buf) < 10:
                return None, buf, False
            ln = struct.unpack(">Q", buf[2:10])[0]
            idx = 10
        if opcode == 0x8:  # close
            self.alive = False
            return None, b"", False
        if opcode == 0x9:  # ping -> pong
            if len(buf) < idx + (4 if masked else 0) + ln:
                return None, buf, False
            self.conn.sendall(b"\x8A\x00")
            return None, buf[idx + (4 if masked else 0) + ln:], True
        if not masked:
            return None, buf[idx + ln:], True  # 客户端必须 mask；忽略
        if len(buf) < idx + 4 + ln:
            return None, buf, False
        mask = buf[idx:idx + 4]
        idx += 4
        payload = bytes(buf[idx + i] ^ mask[i % 4] for i in range(ln))
        rest = buf[idx + ln:]
        if opcode == 0x1:
            return payload.decode("utf-8", "ignore"), rest, True
        return None, rest, True


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def _ws_handshake(self):
        key = None
        for line in self.headers.items():
            if line[0].lower() == "sec-websocket-key":
                key = line[1]
        if not key:
            self.send_error(400)
            return
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        self.send_response(101)
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()
        sid = _next_sid[0]
        _next_sid[0] += 1
        c = WSConn(self.connection, self.client_address, sid)
        with _lock:
            _clients.add(c)
        c.serve()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/ws":
            self._ws_handshake()
            return
        if path == "/" or path == "":
            path = "/index.html"
        if path == "/net":
            path = "/net.html"
        fp = os.path.join(ROOT, path.lstrip("/"))
        if not os.path.isfile(fp):
            self.send_error(404)
            return
        try:
            with open(fp, "rb") as f:
                data = f.read()
        except OSError:
            self.send_error(404)
            return
        ext = os.path.splitext(fp)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", CT.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        try:
            self.wfile.write(data)
        except OSError:
            pass


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    ip = lan_ip()
    print("=" * 56)
    print(" 长空·1951 网页联机服务器")
    print(f"   本机联机房入口 : http://localhost:{PORT}/net.html")
    print(f"   局域网战友入口 : http://{ip}:{PORT}/net.html")
    print(" 按 Ctrl+C 停止")
    print("=" * 56)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
