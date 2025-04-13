import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, PermissionsAndroid, NativeEventEmitter, NativeModules, Alert } from 'react-native';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { decode } from 'base-64';
import { logDebug } from '../utils/logger';

// Helper function to extract more detailed error information
const getDetailedErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  
  let message = error.message || 'Unknown error';
  if (error.reason) message += ` (Reason: ${error.reason})`;
  if (error.code) message += ` [Code: ${error.code}]`;
  
  return message;
};

// Define your ESP32 specific information
const ESP32_NAMES = ['ESP32','ESP32_EEG', 'ESP32-BLE', 'NIURA-ESP32','Niura_EEG'];  // Add any alternative names your ESP32 might use
// Update with the ESP32 provided UUIDs
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const DATA_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Debugging flags
const DEBUG_MODE = true; // Set to true to enable extensive logging
const SCAN_ALL_DEVICES = true; // Set to true to scan for all devices, not just those with our service UUID
const VERBOSE_DATA_LOGGING = true; // Set to true to log every raw value received

interface BLEContextType {
  isScanning: boolean;
  isConnected: boolean;
  connectToDevice: () => Promise<void>;
  disconnectFromDevice: () => void;
  focusValue: number;
  stressValue: number;
  error: string | null;
  scannedDevices: Device[];
  lastUpdated: Date | null;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);

// Create BLE manager instance outside component to prevent recreation
const bleManager = new BleManager();
let isManagerDestroyed = false;

export const BLEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [focusValue, setFocusValue] = useState(1.5); // Default value
  const [stressValue, setStressValue] = useState(1.5); // Default value
  const [error, setError] = useState<string | null>(null);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize BLE manager
  useEffect(() => {
    isManagerDestroyed = false;
    return () => {
      isManagerDestroyed = true;
      if (connectedDevice) {
        bleManager.cancelDeviceConnection(connectedDevice.id)
          .catch(error => logDebug('Error during cleanup:', error));
      }
    };
  }, []);

  // Helper function to request Android permissions
  const requestAndroidPermissions = async () => {
    logDebug('Requesting Android permissions');
    
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      const bluetoothPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      logDebug('Location permission result:', bluetoothPermission);
      
      // For Android 12+ (API 31+), we need additional permissions
      if (Platform.Version >= 31) {
        const bluetoothScanPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        
        logDebug('BLUETOOTH_SCAN permission result:', bluetoothScanPermission);
        logDebug('BLUETOOTH_CONNECT permission result:', bluetoothConnectPermission);
        
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

  // Check if device might be our ESP32
  const isPossiblyOurESP32 = (device: Device) => {
    // Check primary name
    if (ESP32_NAMES.includes(device.name || '')) return true;
    
    // Check localName as well
    if (device.localName && ESP32_NAMES.includes(device.localName)) return true;
    
    // If name contains ESP32, it might be our device with different naming
    if (device.name && device.name.includes('ESP32')) return true;
    if (device.localName && device.localName.includes('ESP32')) return true;
    
    return false;
  };

  // Function to parse ESP32 data format
  const parseESP32Data = (data: string) => {
    try {
      const [stressStr, focusStr] = data.split(',');
      const stress = parseFloat(stressStr);
      const focus = parseFloat(focusStr);
      
      // Validate the values
      if (isNaN(stress) || isNaN(focus)) {
        logDebug('Invalid data format received:', data);
        return null;
      }
      
      // Normalize values to 0-3 scale for the speedometers
      // Assuming input values are 0-100
      const normalizedStress = (stress / 100) * 3;
      const normalizedFocus = (focus / 100) * 3;
      
      return {
        stress: normalizedStress,
        focus: normalizedFocus
      };
    } catch (e) {
      logDebug('Error parsing ESP32 data:', e);
      return null;
    }
  };

  // Function to connect to ESP32
  const connectToDevice = async () => {
    try {
      if (isManagerDestroyed) {
        logDebug('BLE Manager was destroyed, recreating...');
        isManagerDestroyed = false;
      }

      setIsScanning(true);
      setError(null);
      
      logDebug('Starting BLE scan for ESP32_EEG device');
      
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          const detailedError = getDetailedErrorMessage(error);
          logDebug('Scan error:', detailedError);
          setError(`Scan error: ${error.message}`);
          setIsScanning(false);
          return;
        }
        
        if (device) {
          logDebug(`Found device: ${device.name || 'Unknown'} (${device.id})`);
        }
        
        if (device?.name === 'ESP32_EEG') {
          logDebug('Found ESP32_EEG device, stopping scan');
          bleManager.stopDeviceScan();
          
          logDebug('Attempting connection...');
          device.connect()
            .then(device => {
              logDebug('Connected, discovering services...');
              setConnectedDevice(device);
              return device.discoverAllServicesAndCharacteristics();
            })
            .then(device => {
              logDebug('Services discovered, setting up monitoring...');
              setIsConnected(true);
              
              return device.monitorCharacteristicForService(
                SERVICE_UUID,
                DATA_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                  if (error) {
                    logDebug('Monitor error:', error);
                    return;
                  }
                  
                  if (characteristic?.value) {
                    try {
                      const rawValue = characteristic.value;
                      const decoded = decode(rawValue);
                      logDebug('Received value:', decoded);
                      
                      const [stress, anxiety] = decoded.split(',').map(Number);
                      if (!isNaN(stress) && !isNaN(anxiety)) {
                        const normalizedStress = (stress / 100) * 3;
                        const normalizedFocus = (anxiety / 100) * 3;
                        
                        setStressValue(normalizedStress);
                        setFocusValue(normalizedFocus);
                        setLastUpdated(new Date());
                      }
                    } catch (e) {
                      logDebug('Error processing value:', e);
                    }
                  }
                }
              );
            })
            .catch(error => {
              const detailedError = getDetailedErrorMessage(error);
              logDebug('Connection error:', detailedError);
              setError(`Connection failed: ${error.message}`);
              setIsConnected(false);
              setConnectedDevice(null);
            })
            .finally(() => {
              setIsScanning(false);
            });
        }
      });
      
      // Stop scanning after 10 seconds if no device found
      setTimeout(() => {
        if (isScanning) {
          logDebug('Scan timeout - stopping scan');
          bleManager.stopDeviceScan();
          setIsScanning(false);
          setError('ESP32_EEG device not found');
        }
      }, 10000);
      
    } catch (error: any) {
      logDebug('Error in connectToDevice:', error);
      setError(`Connection error: ${error.message}`);
      setIsScanning(false);
    }
  };

  const disconnectFromDevice = () => {
    if (connectedDevice) {
      logDebug(`Disconnecting from device: ${connectedDevice.id}`);
      
      bleManager
        .cancelDeviceConnection(connectedDevice.id)
        .then(() => {
          logDebug('Disconnected successfully');
          setIsConnected(false);
          setConnectedDevice(null);
        })
        .catch((error) => {
          logDebug('Disconnect error:', error);
          setError(`Disconnect error: ${error.message}`);
        });
    }
  };

  return (
    <BLEContext.Provider 
      value={{ 
        isScanning, 
        isConnected, 
        connectToDevice, 
        disconnectFromDevice, 
        focusValue, 
        stressValue, 
        error, 
        scannedDevices,
        lastUpdated
      }}
    >
      {children}
    </BLEContext.Provider>
  );
};

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (context === undefined) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
}; 