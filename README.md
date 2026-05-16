# BlueTouchpad

Turn your Android phone into a wireless touchpad for your PC or laptop using Bluetooth.

## Overview

BlueTouchpad consists of two parts:

1. **Android App** (`android-app/`) — A Kotlin app that captures touch gestures on your phone screen and sends them over Bluetooth.
2. **PC Server** (`pc-server/`) — A Python script that runs on your computer, receives the Bluetooth commands, and moves the mouse cursor.

## Features

| Gesture | Action |
|---|---|
| Slide one finger | Move the mouse cursor |
| Tap | Left click |
| Double tap | Double click |
| Two-finger tap | Right click |
| Two-finger slide | Scroll up/down |
| Long press + drag | Click and drag |
| Bottom buttons | Dedicated left/right click buttons |

## Setup

### 1. Pair Your Devices

Before using the app, pair your Android phone with your PC via Bluetooth:

- **Windows**: Settings → Bluetooth & devices → Add device
- **macOS**: System Preferences → Bluetooth
- **Linux**: `bluetoothctl` → `scan on` → `pair <MAC>`

### 2. Start the PC Server

```bash
cd pc-server

# Install dependencies
pip install -r requirements.txt

# Run the Bluetooth server
python server.py
```

**Linux prerequisite**: You may need `libbluetooth-dev`:
```bash
sudo apt install libbluetooth-dev
```

**Alternative — TCP/Wi-Fi mode** (no Bluetooth setup needed):
```bash
python server_tcp.py --port 9876
```

### 3. Build & Install the Android App

Open `android-app/` in Android Studio, build, and install on your phone.

Or build from command line:

```bash
cd android-app
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 4. Connect

1. Open BlueTouchpad on your phone
2. Your paired PC should appear in the device list
3. Tap on it to connect
4. Start using your phone as a touchpad!

## Project Structure

```
├── android-app/                  # Android application
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/bluetouchpad/
│   │   │   │   ├── MainActivity.kt       # Device selection screen
│   │   │   │   ├── TouchpadActivity.kt    # Touchpad screen
│   │   │   │   ├── TouchpadView.kt        # Custom touch-handling view
│   │   │   │   └── BluetoothService.kt    # Bluetooth SPP connection manager
│   │   │   ├── res/
│   │   │   │   ├── layout/                # UI layouts
│   │   │   │   ├── drawable/              # Shapes and icons
│   │   │   │   └── values/                # Colors, strings, themes
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
├── pc-server/                    # PC-side server
│   ├── server.py                 # Bluetooth SPP server
│   ├── server_tcp.py             # TCP/Wi-Fi fallback server
│   └── requirements.txt
│
└── README.md
```

## Communication Protocol

The app sends newline-delimited text commands over Bluetooth SPP (Serial Port Profile):

| Command | Format | Description |
|---|---|---|
| Move | `M:dx:dy\n` | Move cursor by (dx, dy) pixels |
| Left Click | `LC\n` | Single left click |
| Right Click | `RC\n` | Single right click |
| Double Click | `DC\n` | Double left click |
| Left Down | `LD\n` | Press left button (drag start) |
| Left Up | `LU\n` | Release left button (drag end) |
| Scroll | `S:amount\n` | Scroll (positive = up) |

## Requirements

### Android App
- Android 8.0 (API 26) or higher
- Bluetooth support
- Android Studio for building

### PC Server
- Python 3.7+
- `pynput` — for mouse control
- `PyBluez2` — for Bluetooth (not needed for TCP mode)
- Bluetooth adapter on your PC
- Linux: `libbluetooth-dev` package

## Troubleshooting

| Issue | Solution |
|---|---|
| Device not appearing in list | Make sure Bluetooth is on and devices are paired in system settings |
| Connection fails | Ensure the PC server is running before connecting from the app |
| "Permission denied" on Linux | Run `sudo python server.py` or add your user to the `bluetooth` group |
| PyBluez won't install | Use TCP mode instead: `python server_tcp.py` |
| Cursor not moving | Check that `pynput` is installed and has accessibility permissions (macOS) |
| Laggy cursor | Reduce the `sensitivity` value in `TouchpadView.kt` |

## License

MIT
