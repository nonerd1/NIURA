import BackgroundService from 'react-native-background-actions';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { logDebug } from '../utils/logger';
import { decode } from 'base-64';
import { Platform, NativeEventEmitter } from 'react-native';

// Define your ESP32 specific information
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const DATA_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const ESP32_NAMES = ['ESP32', 'ESP32_EEG', 'ESP32-BLE', 'NIURA-ESP32', 'Niura_EEG'];

// Configuration for background task
const backgroundOptions = {
  taskName: 'BLEMonitoring',
  taskTitle: 'BLE Monitoring',
  taskDesc: 'Monitoring BLE device data',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ffffff',
  linkingURI: 'niuraapp://ble', // Deep linking URI
  parameters: {
    delay: 1000, // Delay between readings in ms
  },
};

// Helper function to check if device is our ESP32
const isPossiblyOurESP32 = (device: Device): boolean => {
  if (!device) return false;
  
  // Check primary name
  if (ESP32_NAMES.includes(device.name || '')) return true;
  
  // Check localName as well
  if (device.localName && ESP32_NAMES.includes(device.localName)) return true;
  
  // If name contains ESP32, it might be our device with different naming
  if (device.name && device.name.includes('ESP32')) return true;
  if (device.localName && device.localName.includes('ESP32')) return true;
  
  return false;
};

class BackgroundBLEService {
  private static instance: BackgroundBLEService;
  private bleManager: BleManager;
  private isRunning: boolean = false;
  private connectedDevice: Device | null = null;
  private dataCallback: ((data: any) => void) | null = null;
  private subscriptions: Array<{ remove: () => void }> = [];

  private constructor() {
    // Initialize BLE Manager with proper configuration
    this.bleManager = new BleManager({
      restoreStateIdentifier: 'niuraBackgroundBLE',
      restoreStateFunction: (restoredState) => {
        if (restoredState == null) {
          logDebug('BLE Manager restored state is null');
        } else {
          logDebug('BLE Manager restored with state:', restoredState);
        }
      },
    });

    // Ensure BLE Manager is ready before setting up listeners
    setTimeout(() => {
      this.setupEventListeners();
    }, 100);
  }

  private setupEventListeners() {
    try {
      // Monitor BLE state changes using the manager's method
      this.subscriptions.push(
        this.bleManager.onStateChange((state) => {
          logDebug('BLE state changed:', state);
          if (state === State.PoweredOff) {
            this.handleDisconnection();
          }
        }, true)
      );

      // Device disconnection listener
      if (this.connectedDevice) {
        this.subscriptions.push(
          this.connectedDevice.onDisconnected((error) => {
            if (error) {
              logDebug('Device disconnection error:', error);
            }
            this.handleDisconnection();
          })
        );
      }

      // Device scanning and monitoring
      if (Platform.OS === 'android') {
        this.bleManager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            logDebug('Device scan error:', error);
            return;
          }
          if (device && isPossiblyOurESP32(device)) {
            logDebug('Found ESP32 device:', device);
          }
        });
      }
    } catch (error) {
      logDebug('Error setting up BLE listeners:', error);
    }
  }

  private async handleDisconnection() {
    if (this.isRunning && this.connectedDevice) {
      try {
        logDebug('Device disconnected, attempting to reconnect...');
        await this.connectToDevice();
      } catch (error) {
        logDebug('Reconnection failed:', error);
      }
    }
  }

  public static getInstance(): BackgroundBLEService {
    if (!BackgroundBLEService.instance) {
      BackgroundBLEService.instance = new BackgroundBLEService();
    }
    return BackgroundBLEService.instance;
  }

  public setDataCallback(callback: (data: any) => void) {
    this.dataCallback = callback;
  }

  private async monitorDevice() {
    if (!this.connectedDevice) {
      logDebug('No device connected, cannot start monitoring');
      return;
    }

    try {
      logDebug('Setting up device monitoring...');
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      
      // Monitor characteristic
      this.connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        DATA_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            logDebug('Background monitoring error:', error);
            return;
          }

          if (characteristic?.value) {
            try {
              const rawValue = decode(characteristic.value);
              logDebug('Received value:', rawValue);
              if (this.dataCallback) {
                this.dataCallback(rawValue);
              }
            } catch (e) {
              logDebug('Error processing background value:', e);
            }
          }
        }
      );
      logDebug('Monitoring setup complete');
    } catch (error) {
      logDebug('Error setting up background monitoring:', error);
      throw error;
    }
  }

  private async connectToDevice() {
    try {
      // Stop any ongoing scan
      this.bleManager.stopDeviceScan();

      // Start scanning for ESP32 devices
      this.bleManager.startDeviceScan(
        [SERVICE_UUID],
        { allowDuplicates: false },
        async (error, device) => {
          if (error) {
            logDebug('Scan error:', error);
            return;
          }

          if (device && isPossiblyOurESP32(device)) {
            logDebug(`Found potential ESP32 device: ${device.name || device.localName || 'Unknown'} (${device.id})`);
            // Stop scanning once we find our device
            this.bleManager.stopDeviceScan();

            try {
              // Connect to the device
              logDebug('Attempting connection...');
              const connectedDevice = await device.connect({
                timeout: 5000,
                autoConnect: true,
              });

              // Discover services and characteristics
              logDebug('Connected, discovering services...');
              await connectedDevice.discoverAllServicesAndCharacteristics();
              
              this.connectedDevice = connectedDevice;
              logDebug('Connected to device:', device.id);

              // Set up monitoring
              await this.monitorDevice();
            } catch (connectionError) {
              logDebug('Connection error:', connectionError);
              throw connectionError;
            }
          }
        }
      );

      // Set a timeout for the scan
      setTimeout(() => {
        this.bleManager.stopDeviceScan();
        if (!this.connectedDevice) {
          logDebug('No ESP32 device found after timeout');
        }
      }, 10000);

    } catch (error) {
      logDebug('Background connection error:', error);
      throw error;
    }
  }

  private async backgroundTask() {
    await new Promise(async (resolve) => {
      const maxRetries = 3;
      let retryCount = 0;
      let lastErrorTime = 0;
      const ERROR_COOLDOWN = 60000; // 1 minute cooldown between error resets
      
      while (BackgroundService.isRunning()) {
        try {
          if (!this.connectedDevice?.isConnected()) {
            const now = Date.now();
            // Reset retry count if enough time has passed since last error
            if (now - lastErrorTime > ERROR_COOLDOWN) {
              retryCount = 0;
              lastErrorTime = now;
            }
            
            if (retryCount < maxRetries) {
              logDebug(`Attempting to reconnect, attempt: ${retryCount + 1}/${maxRetries}`);
              await this.connectToDevice();
              retryCount++;
              lastErrorTime = now;
            } else {
              logDebug('Max retry attempts reached, entering cooldown period');
              await new Promise(r => setTimeout(r, ERROR_COOLDOWN));
              retryCount = 0;
            }
          } else {
            // Check if we can still communicate with the device
            try {
              await this.connectedDevice?.discoverAllServicesAndCharacteristics();
              // Reset retry count on successful communication
              retryCount = 0;
              lastErrorTime = 0;
            } catch (error) {
              logDebug('Error communicating with device:', error);
              // Force disconnect and retry
              if (this.connectedDevice) {
                await this.bleManager.cancelDeviceConnection(this.connectedDevice.id);
                this.connectedDevice = null;
              }
            }
          }
          
          // Sleep for the specified delay
          await new Promise(r => setTimeout(r, backgroundOptions.parameters.delay));
        } catch (error) {
          logDebug('Background task error:', error);
          // Increase delay on error to prevent rapid retries
          await new Promise(r => setTimeout(r, 5000 * (retryCount + 1)));
        }
      }
      resolve(null);
    });
  }

  public async startBackgroundService() {
    if (this.isRunning) {
      logDebug('Background service already running');
      return;
    }

    try {
      logDebug('Starting background service...');
      await BackgroundService.start(this.backgroundTask.bind(this), backgroundOptions);
      this.isRunning = true;
      logDebug('Background service started successfully');
    } catch (error) {
      logDebug('Error starting background service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  public async stopBackgroundService() {
    if (!this.isRunning) return;

    try {
      await BackgroundService.stop();
      this.isRunning = false;
      logDebug('Background service stopped');
    } catch (error) {
      logDebug('Error stopping background service:', error);
      throw error;
    }
  }

  public isServiceRunning(): boolean {
    return this.isRunning;
  }

  public async cleanup() {
    // Remove all subscriptions
    this.subscriptions.forEach(subscription => {
      try {
        subscription.remove();
      } catch (error) {
        logDebug('Error removing subscription:', error);
      }
    });
    this.subscriptions = [];
    
    if (this.isRunning) {
      await this.stopBackgroundService();
    }
    
    if (this.connectedDevice) {
      try {
        await this.bleManager.cancelDeviceConnection(this.connectedDevice.id);
      } catch (error) {
        logDebug('Error disconnecting device:', error);
      }
    }

    // Destroy BLE manager if needed
    try {
      await this.bleManager.destroy();
    } catch (error) {
      logDebug('Error destroying BLE manager:', error);
    }
  }
}

export default BackgroundBLEService; 