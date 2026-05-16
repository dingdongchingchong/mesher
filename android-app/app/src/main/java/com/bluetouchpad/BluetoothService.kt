package com.bluetouchpad

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.os.Handler
import android.os.Looper
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

/**
 * Manages the Bluetooth SPP connection to the PC server.
 * Uses the standard SPP UUID for serial communication.
 */
class BluetoothService(private val context: Context) {

    companion object {
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        const val MSG_MOVE = "M"
        const val MSG_LEFT_CLICK = "LC"
        const val MSG_RIGHT_CLICK = "RC"
        const val MSG_LEFT_DOWN = "LD"
        const val MSG_LEFT_UP = "LU"
        const val MSG_SCROLL = "S"
        const val MSG_DOUBLE_CLICK = "DC"
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    var onConnectionChanged: ((Boolean) -> Unit)? = null
    var onError: ((String) -> Unit)? = null

    val isConnected: Boolean
        get() = socket?.isConnected == true

    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<BluetoothDevice> {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter ?: return emptyList()
        return adapter.bondedDevices.toList()
    }

    @SuppressLint("MissingPermission")
    fun connect(device: BluetoothDevice) {
        Thread {
            try {
                socket?.close()

                val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
                bluetoothManager.adapter?.cancelDiscovery()

                socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                socket?.connect()
                outputStream = socket?.outputStream

                mainHandler.post { onConnectionChanged?.invoke(true) }
            } catch (e: IOException) {
                mainHandler.post {
                    onError?.invoke("Connection failed: ${e.message}")
                    onConnectionChanged?.invoke(false)
                }
                try { socket?.close() } catch (_: IOException) {}
                socket = null
                outputStream = null
            }
        }.start()
    }

    fun sendMove(dx: Float, dy: Float) {
        sendMessage("$MSG_MOVE:${dx.toInt()}:${dy.toInt()}")
    }

    fun sendLeftClick() {
        sendMessage(MSG_LEFT_CLICK)
    }

    fun sendRightClick() {
        sendMessage(MSG_RIGHT_CLICK)
    }

    fun sendDoubleClick() {
        sendMessage(MSG_DOUBLE_CLICK)
    }

    fun sendLeftDown() {
        sendMessage(MSG_LEFT_DOWN)
    }

    fun sendLeftUp() {
        sendMessage(MSG_LEFT_UP)
    }

    fun sendScroll(amount: Float) {
        sendMessage("$MSG_SCROLL:${amount.toInt()}")
    }

    private fun sendMessage(message: String) {
        try {
            outputStream?.write("$message\n".toByteArray())
            outputStream?.flush()
        } catch (e: IOException) {
            mainHandler.post {
                onError?.invoke("Send failed: ${e.message}")
                onConnectionChanged?.invoke(false)
            }
            disconnect()
        }
    }

    fun disconnect() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (_: IOException) {}
        outputStream = null
        socket = null
        mainHandler.post { onConnectionChanged?.invoke(false) }
    }
}
