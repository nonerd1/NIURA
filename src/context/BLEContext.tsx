import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, PermissionsAndroid, NativeEventEmitter, NativeModules } from 'react-native';
import { BleManager, Device, BleError, Characteristic } from 'react-native-ble-plx';

// Define your ESP32 specific information
const ESP32_NAME = 'NIURA-ESP32'; // Change this to match your ESP32 device name
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'; // Change to your ESP32 service UUID
const FOCUS_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // Change to your characteristic
const STRESS_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Change to your characteristic

interface BLEContextType {
  isScanning: boolean;
  isConnected: boolean;
  connectToDevice: () => Promise<void>;
  disconnectFromDevice: () => void;
  focusValue: number;
  stressValue: number;
  error: string | null;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);

// Create BLE manager instance outside component to prevent recreation
const bleManager = new BleManager();

export const BLEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [focusValue, setFocusValue] = useState(1.5); // Default value
  const [stressValue, setStressValue] = useState(1.5); // Default value
  const [error, setError] = useState<string | null>(null);

  // Helper function to request Android permissions
  const requestAndroidPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      const bluetoothPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      // For Android 12+ (API 31+), we need additional permissions
      if (Platform.Version >= 31) {
        const bluetoothScanPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        
        return (
          bluetoothPermission === PermissionsAndroid.RESULTS.GRANTED &&
          bluetoothScanPermission === PermissionsAndroid.RESULTS.GRANTED &&
          bluetoothConnectPermission === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      
      return bluetoothPermission === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    return true; // iOS doesn't require runtime permission for Bluetooth
  };

  // Function to connect to ESP32
  const connectToDevice = async () => {
    try {
      setError(null);
      
      // Request permissions first
      const permissionsGranted = await requestAndroidPermissions();
      if (!permissionsGranted) {
        setError('Bluetooth permissions not granted');
        return;
      }
      
      // Start scanning
      setIsScanning(true);
      
      bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setError(error.message);
          setIsScanning(false);
          return;
        }
        
        // Found our ESP32 device
        if (device && (device.name === ESP32_NAME || device.localName === ESP32_NAME)) {
          console.log('Found ESP32 device:', device.name);
          
          // Stop scanning once we find the device
          bleManager.stopDeviceScan();
          setIsScanning(false);
          
          // Connect to the device
          device
            .connect()
            .then((connectedDevice) => {
              console.log('Connected to ESP32');
              setConnectedDevice(connectedDevice);
              return connectedDevice.discoverAllServicesAndCharacteristics();
            })
            .then((device) => {
              console.log('Discovered services and characteristics');
              setIsConnected(true);
              
              // Subscribe to the focus value characteristic
              device.monitorCharacteristicForService(
                SERVICE_UUID,
                FOCUS_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                  if (error) {
                    console.error('Focus monitoring error:', error);
                    return;
                  }
                  
                  if (characteristic?.value) {
                    // Decode the base64 value and update state
                    const decoded = Buffer.from(characteristic.value, 'base64').toString('utf8');
                    const numValue = parseFloat(decoded);
                    if (!isNaN(numValue)) {
                      setFocusValue(numValue);
                      console.log('Focus value updated:', numValue);
                    }
                  }
                }
              );
              
              // Subscribe to the stress value characteristic
              device.monitorCharacteristicForService(
                SERVICE_UUID,
                STRESS_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                  if (error) {
                    console.error('Stress monitoring error:', error);
                    return;
                  }
                  
                  if (characteristic?.value) {
                    // Decode the base64 value and update state
                    const decoded = Buffer.from(characteristic.value, 'base64').toString('utf8');
                    const numValue = parseFloat(decoded);
                    if (!isNaN(numValue)) {
                      setStressValue(numValue);
                      console.log('Stress value updated:', numValue);
                    }
                  }
                }
              );
            })
            .catch((error) => {
              console.error('Connection error:', error);
              setError('Failed to connect: ' + error.message);
              setIsScanning(false);
            });
        }
      });
      
      // Stop scanning after 15 seconds if no device found
      setTimeout(() => {
        if (isScanning) {
          bleManager.stopDeviceScan();
          setIsScanning(false);
          if (!connectedDevice) {
            setError('No ESP32 device found. Please make sure it is powered on and nearby.');
          }
        }
      }, 15000);
      
    } catch (e) {
      const err = e as Error;
      console.error('BLE connection error:', err);
      setError('BLE error: ' + err.message);
      setIsScanning(false);
    }
  };

  // Function to disconnect from device
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id)
        .then(() => {
          setIsConnected(false);
          setConnectedDevice(null);
          console.log('Disconnected from device');
          
          // Reset values to defaults
          setFocusValue(1.5);
          setStressValue(1.5);
        })
        .catch((error) => {
          console.error('Disconnect error:', error);
          setError('Failed to disconnect: ' + error.message);
        });
    }
  };

  // Cleanup: disconnect when component unmounts
  useEffect(() => {
    return () => {
      if (connectedDevice) {
        bleManager.cancelDeviceConnection(connectedDevice.id)
          .catch((error) => {
            console.error('Error during cleanup:', error);
          });
      }
      
      // Destroy BLE manager (optional)
      // bleManager.destroy();
    };
  }, [connectedDevice]);

  const value = {
    isScanning,
    isConnected,
    connectToDevice,
    disconnectFromDevice,
    focusValue,
    stressValue,
    error
  };

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (context === undefined) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
}; 