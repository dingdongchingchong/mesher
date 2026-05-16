package com.bluetouchpad

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bluetouchpad.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var bluetoothService: BluetoothService
    private val requiredPermissions: Array<String>
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
            )
        }

    companion object {
        private const val REQUEST_PERMISSIONS = 1001
        const val EXTRA_DEVICE_ADDRESS = "device_address"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        bluetoothService = BluetoothService(this)

        binding.deviceList.layoutManager = LinearLayoutManager(this)

        binding.btnRefresh.setOnClickListener {
            checkPermissionsAndLoadDevices()
        }

        checkPermissionsAndLoadDevices()
    }

    private fun checkPermissionsAndLoadDevices() {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQUEST_PERMISSIONS)
        } else {
            loadPairedDevices()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                loadPairedDevices()
            } else {
                Toast.makeText(this, "Bluetooth permissions required", Toast.LENGTH_LONG).show()
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun loadPairedDevices() {
        val bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter

        if (adapter == null) {
            Toast.makeText(this, "Bluetooth not supported on this device", Toast.LENGTH_LONG).show()
            return
        }

        if (!adapter.isEnabled) {
            Toast.makeText(this, "Please enable Bluetooth", Toast.LENGTH_LONG).show()
            return
        }

        val devices = bluetoothService.getPairedDevices()

        if (devices.isEmpty()) {
            binding.emptyState.visibility = View.VISIBLE
            binding.deviceList.visibility = View.GONE
        } else {
            binding.emptyState.visibility = View.GONE
            binding.deviceList.visibility = View.VISIBLE
            binding.deviceList.adapter = DeviceAdapter(devices) { device ->
                connectToDevice(device)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun connectToDevice(device: BluetoothDevice) {
        binding.progressBar.visibility = View.VISIBLE
        binding.statusText.text = "Connecting to ${device.name}..."

        bluetoothService.onConnectionChanged = { connected ->
            binding.progressBar.visibility = View.GONE
            if (connected) {
                binding.statusText.text = "Connected!"
                val intent = Intent(this, TouchpadActivity::class.java)
                intent.putExtra(EXTRA_DEVICE_ADDRESS, device.address)
                startActivity(intent)
            } else {
                binding.statusText.text = "Select a paired device"
            }
        }

        bluetoothService.onError = { error ->
            binding.progressBar.visibility = View.GONE
            binding.statusText.text = "Select a paired device"
            Toast.makeText(this, error, Toast.LENGTH_SHORT).show()
        }

        bluetoothService.connect(device)
    }

    override fun onResume() {
        super.onResume()
        binding.statusText.text = "Select a paired device"
        binding.progressBar.visibility = View.GONE
        bluetoothService.disconnect()
    }

    override fun onDestroy() {
        super.onDestroy()
        bluetoothService.disconnect()
    }

    private class DeviceAdapter(
        private val devices: List<BluetoothDevice>,
        private val onClick: (BluetoothDevice) -> Unit
    ) : RecyclerView.Adapter<DeviceAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val name: TextView = view.findViewById(R.id.deviceName)
            val address: TextView = view.findViewById(R.id.deviceAddress)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_device, parent, false)
            return ViewHolder(view)
        }

        @SuppressLint("MissingPermission")
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val device = devices[position]
            holder.name.text = device.name ?: "Unknown Device"
            holder.address.text = device.address
            holder.itemView.setOnClickListener { onClick(device) }
        }

        override fun getItemCount() = devices.size
    }
}
