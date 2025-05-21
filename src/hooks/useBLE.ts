import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';

const ESP32_NAME = "ESP32-Focus-Stress-Monitor";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const FOCUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const STRESS_CHAR_UUID = "e70aafb5-a597-4347-b1af-a67c67a075c6";

const bleManager = new BleManager();

export const useBLE = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusValue, setFocusValue] = useState<number>(0);
  const [stressValue, setStressValue] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Bluetooth Permission',
        message: 'This app needs access to Bluetooth to connect to your device.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startScanning = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Bluetooth permission denied');
        return;
      }

      setIsScanning(true);
      setError(null);

      bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          setError(error.message);
          setIsScanning(false);
          return;
        }

        if (device?.name === ESP32_NAME) {
          connectToDevice(device);
        }
      });
    } catch (error: any) {
      setError(error.message);
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);

      const connectedDevice = await device.connect();
      setConnectedDevice(connectedDevice);
      setIsConnected(true);

      await connectedDevice.discoverAllServicesAndCharacteristics();
      startStreamingData(connectedDevice);
    } catch (error: any) {
      setError(error.message);
      setIsConnected(false);
      setConnectedDevice(null);
    }
  };

  const startStreamingData = async (device: Device) => {
    try {
      // Monitor focus value
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        FOCUS_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Focus monitoring error:', error);
            return;
          }
          if (characteristic?.value) {
            const value = parseFloat(atob(characteristic.value));
            setFocusValue(value);
            setLastUpdated(new Date());
          }
        }
      );

      // Monitor stress value
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        STRESS_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Stress monitoring error:', error);
            return;
          }
          if (characteristic?.value) {
            const value = parseFloat(atob(characteristic.value));
            setStressValue(value);
            setLastUpdated(new Date());
          }
        }
      );
    } catch (error: any) {
      setError(error.message);
    }
  };

  const disconnectFromDevice = async () => {
    try {
      if (connectedDevice) {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      }
      setConnectedDevice(null);
      setIsConnected(false);
      setError(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  useEffect(() => {
    return () => {
      disconnectFromDevice();
      bleManager.destroy();
    };
  }, []);

  return {
    isScanning,
    isConnected,
    error,
    focusValue,
    stressValue,
    lastUpdated,
    startScanning,
    connectToDevice,
    disconnectFromDevice,
  };
}; 