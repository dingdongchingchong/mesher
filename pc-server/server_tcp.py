#!/usr/bin/env python3
"""
BlueTouchpad TCP Server (Wi-Fi Fallback)

Alternative server that uses TCP/Wi-Fi instead of Bluetooth.
Useful for testing or when Bluetooth setup is complicated.

Requirements:
    pip install pynput

Usage:
    python server_tcp.py [--port PORT]

Then configure the Android app to connect via Wi-Fi instead of Bluetooth
(or use the companion test client for verification).
"""

import argparse
import signal
import socket
import sys
import threading

try:
    from pynput.mouse import Button, Controller as MouseController
except ImportError:
    print("ERROR: pynput is required. Install with: pip install pynput")
    sys.exit(1)


mouse = MouseController()
running = True


def handle_command(command: str):
    """Parse and execute a single command from the client."""
    command = command.strip()
    if not command:
        return

    parts = command.split(":")

    try:
        if parts[0] == "M" and len(parts) == 3:
            dx, dy = int(parts[1]), int(parts[2])
            mouse.move(dx, dy)
        elif parts[0] == "LC":
            mouse.click(Button.left)
        elif parts[0] == "RC":
            mouse.click(Button.right)
        elif parts[0] == "DC":
            mouse.click(Button.left, 2)
        elif parts[0] == "LD":
            mouse.press(Button.left)
        elif parts[0] == "LU":
            mouse.release(Button.left)
        elif parts[0] == "S" and len(parts) == 2:
            amount = int(parts[1])
            scroll_clicks = max(-10, min(10, amount // 3))
            if scroll_clicks != 0:
                mouse.scroll(0, -scroll_clicks)
    except (ValueError, IndexError) as e:
        print(f"  Bad command: {command!r} ({e})")


def handle_client(client_sock, addr):
    """Handle a connected TCP client."""
    print(f"  Client connected: {addr}")
    buffer = ""

    try:
        while running:
            data = client_sock.recv(1024)
            if not data:
                break

            buffer += data.decode("utf-8", errors="ignore")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                handle_command(line)
    except (IOError, ConnectionResetError) as e:
        print(f"  Connection error: {e}")
    finally:
        client_sock.close()
        print(f"  Client disconnected: {addr}")


def main():
    global running

    parser = argparse.ArgumentParser(description="BlueTouchpad TCP Server")
    parser.add_argument("--port", type=int, default=9876, help="TCP port (default: 9876)")
    args = parser.parse_args()

    def signal_handler(sig, frame):
        global running
        print("\nShutting down...")
        running = False
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", args.port))
    server.listen(1)

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    print("=" * 50)
    print("  BlueTouchpad TCP Server (Wi-Fi Mode)")
    print("=" * 50)
    print(f"  Listening on {local_ip}:{args.port}")
    print(f"  Waiting for connection...")
    print()
    print("  Press Ctrl+C to stop")
    print("=" * 50)

    try:
        while running:
            client_sock, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(client_sock, addr), daemon=True)
            t.start()
    except (IOError, KeyboardInterrupt):
        pass
    finally:
        server.close()
        print("Server stopped.")


if __name__ == "__main__":
    main()
