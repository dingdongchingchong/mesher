package com.bluetouchpad

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bluetouchpad.databinding.ActivityTouchpadBinding

class TouchpadActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTouchpadBinding
    private lateinit var bluetoothService: BluetoothService

    @SuppressLint("MissingPermission")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        binding = ActivityTouchpadBinding.inflate(layoutInflater)
        setContentView(binding.root)

        hideSystemUI()

        bluetoothService = BluetoothService(this)

        val deviceAddress = intent.getStringExtra(MainActivity.EXTRA_DEVICE_ADDRESS)
        if (deviceAddress == null) {
            Toast.makeText(this, "No device specified", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager
        val device = bluetoothManager.adapter?.getRemoteDevice(deviceAddress)
        if (device == null) {
            Toast.makeText(this, "Device not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        binding.connectionStatus.text = "Connecting..."

        bluetoothService.onConnectionChanged = { connected ->
            if (connected) {
                binding.connectionStatus.text = "Connected — ${device.name}"
                binding.connectionDot.setBackgroundResource(R.drawable.dot_connected)
            } else {
                binding.connectionStatus.text = "Disconnected"
                binding.connectionDot.setBackgroundResource(R.drawable.dot_disconnected)
            }
        }

        bluetoothService.onError = { error ->
            Toast.makeText(this, error, Toast.LENGTH_SHORT).show()
        }

        setupTouchpad()
        setupButtons()

        bluetoothService.connect(device)
    }

    private fun setupTouchpad() {
        binding.touchpadView.onMove = { dx, dy ->
            bluetoothService.sendMove(dx, dy)
        }

        binding.touchpadView.onTap = {
            bluetoothService.sendLeftClick()
        }

        binding.touchpadView.onDoubleTap = {
            bluetoothService.sendDoubleClick()
        }

        binding.touchpadView.onTwoFingerTap = {
            bluetoothService.sendRightClick()
        }

        binding.touchpadView.onScroll = { amount ->
            bluetoothService.sendScroll(amount)
        }

        binding.touchpadView.onDragStart = {
            bluetoothService.sendLeftDown()
        }

        binding.touchpadView.onDragEnd = {
            bluetoothService.sendLeftUp()
        }
    }

    private fun setupButtons() {
        binding.btnLeft.setOnClickListener {
            bluetoothService.sendLeftClick()
        }

        binding.btnRight.setOnClickListener {
            bluetoothService.sendRightClick()
        }

        binding.btnDisconnect.setOnClickListener {
            bluetoothService.disconnect()
            finish()
        }
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        bluetoothService.disconnect()
    }
}
