#!/usr/bin/env python3
"""
BlueTouchpad PC Server

Receives mouse commands from the BlueTouchpad Android app over Bluetooth SPP
and translates them into actual mouse movements, clicks, and scrolls.

Requirements:
    pip install pynput PyBluez2

Usage:
    python server.py

The server advertises a Bluetooth SPP service and waits for the Android app
to connect. Once connected, it processes incoming touch commands:
    M:dx:dy   - Move the mouse cursor by (dx, dy) pixels
    LC        - Left click
    RC        - Right click
    DC        - Double click (left)
    LD        - Left button down (drag start)
    LU        - Left button up (drag end)
    S:amount  - Scroll by amount (positive = up, negative = down)
"""

import sys
import signal
import threading

try:
    import bluetooth
except ImportError:
    print("ERROR: PyBluez2 is required.")
    print("Install it with: pip install PyBluez2")
    print()
    print("On Linux, you may also need: sudo apt install libbluetooth-dev")
    print("On macOS: brew install bluez (or use the TCP fallback mode)")
    sys.exit(1)

try:
    from pynput.mouse import Button, Controller as MouseController
except ImportError:
    print("ERROR: pynput is required.")
    print("Install it with: pip install pynput")
    sys.exit(1)


SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB"
mouse = MouseController()
running = True


def handle_command(command: str):
    """Parse and execute a single command from the Android app."""
    command = command.strip()
    if not command:
        return

    parts = command.split(":")

    try:
        if parts[0] == "M" and len(parts) == 3:
            dx = int(parts[1])
            dy = int(parts[2])
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


def handle_client(client_sock, client_info):
    """Handle a connected client, reading commands line by line."""
    print(f"  Client connected: {client_info}")
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

    except (IOError, bluetooth.BluetoothError) as e:
        print(f"  Connection error: {e}")
    finally:
        client_sock.close()
        print(f"  Client disconnected: {client_info}")


def main():
    global running

    def signal_handler(sig, frame):
        global running
        print("\nShutting down...")
        running = False
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    server_sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    server_sock.bind(("", bluetooth.PORT_ANY))
    server_sock.listen(1)

    port = server_sock.getsockname()[1]

    bluetooth.advertise_service(
        server_sock,
        "BlueTouchpad",
        service_id=SPP_UUID,
        service_classes=[SPP_UUID, bluetooth.SERIAL_PORT_CLASS],
        profiles=[bluetooth.SERIAL_PORT_PROFILE],
    )

    print("=" * 50)
    print("  BlueTouchpad Server")
    print("=" * 50)
    print(f"  Listening on RFCOMM channel {port}")
    print(f"  Waiting for Android app to connect...")
    print()
    print("  Gestures supported:")
    print("    - Slide finger:      Move cursor")
    print("    - Tap:               Left click")
    print("    - Double tap:        Double click")
    print("    - Two-finger tap:    Right click")
    print("    - Two-finger slide:  Scroll")
    print("    - Long press + drag: Click and drag")
    print()
    print("  Press Ctrl+C to stop")
    print("=" * 50)

    try:
        while running:
            client_sock, client_info = server_sock.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_sock, client_info),
                daemon=True,
            )
            client_thread.start()
    except (IOError, KeyboardInterrupt):
        pass
    finally:
        server_sock.close()
        print("Server stopped.")


if __name__ == "__main__":
    main()
