import BackgroundService from 'react-native-background-actions';
import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { logDebug } from '../utils/logger';
import { decode } from 'base-64';
import { Platform } from 'react-native';

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
      const stateSubscription = this.bleManager.onStateChange((state) => {
        logDebug('BLE state changed:', state);
        if (state === State.PoweredOff) {
          this.handleDisconnection();
        }
      }, true);

      this.subscriptions.push({ remove: () => stateSubscription.remove() });

      // Device disconnection listener
      if (this.connectedDevice) {
        const disconnectSubscription = this.connectedDevice.onDisconnected((error) => {
          if (error) {
            logDebug('Device disconnection error:', error);
          }
          this.handleDisconnection();
        });

        this.subscriptions.push({ remove: () => disconnectSubscription.remove() });
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

  private async handleDisconnection(error?: BleError) {
    logDebug('Device disconnected:', error?.message || 'No error details');
    
    if (this.connectedDevice) {
      try {
        // Ensure we properly cancel the connection
        await this.bleManager.cancelDeviceConnection(this.connectedDevice.id);
      } catch (e) {
        logDebug('Error canceling device connection:', e);
      }
      this.connectedDevice = null;
    }

    // Attempt to reconnect if the background service is still running
    if (this.isRunning) {
      logDebug('Attempting to reconnect...');
      try {
        await this.connectToDevice();
      } catch (e) {
        logDebug('Reconnection attempt failed:', e);
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
      logDebug('No device connected to monitor');
      return;
    }

    try {
      // Monitor the characteristic for notifications
      const subscription = this.connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        DATA_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            logDebug('Characteristic monitoring error:', error);
            return;
          }

          if (!characteristic?.value) {
            logDebug('No characteristic value received');
            return;
          }

          try {
            const decodedValue = decode(characteristic.value);
            logDebug('Received value:', decodedValue);
            if (this.dataCallback) {
              this.dataCallback(decodedValue);
            }
          } catch (decodeError) {
            logDebug('Error decoding characteristic value:', decodeError);
          }
        }
      );

      this.subscriptions.push(subscription);
      logDebug('Device monitoring started successfully');
    } catch (error) {
      logDebug('Failed to start device monitoring:', error);
      
      // If monitoring fails, attempt to reconnect
      if (this.isRunning) {
        logDebug('Attempting to reconnect due to monitoring failure');
        try {
          await this.handleDisconnection();
        } catch (reconnectError) {
          logDebug('Reconnection attempt failed:', reconnectError);
        }
      }
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
    logDebug('Starting cleanup process...');
    
    // First stop the background service
    if (this.isRunning) {
      await this.stopBackgroundService();
    }
    
    // Remove all subscriptions
    for (const subscription of this.subscriptions) {
      try {
        subscription.remove();
      } catch (error) {
        logDebug('Error removing subscription:', error);
      }
    }
    this.subscriptions = [];
    
    // Disconnect from device if connected
    if (this.connectedDevice) {
      try {
        await this.bleManager.cancelDeviceConnection(this.connectedDevice.id);
        this.connectedDevice = null;
      } catch (error) {
        logDebug('Error disconnecting device:', error);
      }
    }

    // Stop any ongoing scan
    try {
      this.bleManager.stopDeviceScan();
    } catch (error) {
      logDebug('Error stopping device scan:', error);
    }

    // Destroy BLE manager
    try {
      await this.bleManager.destroy();
    } catch (error) {
      logDebug('Error destroying BLE manager:', error);
    }
    
    logDebug('Cleanup process completed');
  }
}

export default BackgroundBLEService; 