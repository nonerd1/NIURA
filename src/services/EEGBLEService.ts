import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { logDebug } from '../utils/logger';
import { encode } from 'base-64';

// Niura EEG Buds Configuration
const LEFT_BUD_CONFIG = {
  deviceName: 'Niura EEG BUDS L',
  serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  rxUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  txUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
};

const RIGHT_BUD_CONFIG = {
  deviceName: 'Niura EEG BUDS R',
  serviceUUID: '6e400101-b5a3-f393-e0a9-e50e24dcca9e',
  rxUUID: '6e400102-b5a3-f393-e0a9-e50e24dcca9e',
  txUUID: '6e400103-b5a3-f393-e0a9-e50e24dcca9e',
};

// Commands for controlling EEG streaming
const COMMANDS = {
  START_STREAMING: 'b\r', // hex: 62 0D
  STOP_STREAMING: 's\r',  // hex: 73 0D
};

// Data collection settings
const COLLECTION_DURATION = 2000; // 2 seconds in milliseconds
const BACKEND_ENDPOINT = 'http://192.168.1.42:8000/api/eeg/bulk';

interface EEGSample {
  sample_index: number;
  timestamp: string;
  eeg: number[]; // [Ch1, Ch2, Ch3, Ch4, Ch5, Ch6]
}

interface EEGData {
  records: EEGSample[];
  duration: string;
}

interface RawEEGReading {
  timestamp: string;
  sampleNumber: number;
  ch1: number;
  ch2: number;
  ch3: number;
  deviceType: 'left' | 'right';
}

interface MergedEEGReading {
  timestamp: string;
  sampleNumber: number;
  ch1: number; // Left Ch1
  ch2: number; // Left Ch2
  ch3: number; // Left Ch3
  ch4: number; // Right Ch1
  ch5: number; // Right Ch2
  ch6: number; // Right Ch3
}

export class EEGBLEService {
  private static instance: EEGBLEService;
  private bleManager: BleManager;
  private leftDevice: Device | null = null;
  private rightDevice: Device | null = null;
  private isConnected = false;
  private isCollecting = false;
  private collectionBuffer: RawEEGReading[] = [];
  private collectionTimer: NodeJS.Timeout | null = null;
  private sampleIndex = 0;

  // Callbacks
  private onConnectionStatusChanged: ((isConnected: boolean) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  private constructor() {
    this.bleManager = new BleManager();
    this.setupBLEEventListeners();
  }

  public static getInstance(): EEGBLEService {
    if (!EEGBLEService.instance) {
      EEGBLEService.instance = new EEGBLEService();
    }
    return EEGBLEService.instance;
  }

  private setupBLEEventListeners() {
    this.bleManager.onStateChange((state) => {
      logDebug('BLE state changed:', state);
      if (state === State.PoweredOff) {
        this.handleDisconnection();
      }
    }, true);
  }

  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      if (typeof Platform.Version === 'number' && Platform.Version >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
    } catch (error) {
      logDebug('Permission request error:', error);
      return false;
    }
  }

  public async connectToEarbuds(): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted');
      }

      logDebug('🔍 Starting scan for Niura EEG earbuds...');
      
      // First, try to clear any cached connections
      await this.clearBLECache();
      
      // Track found devices
      const foundDevices: { left?: Device; right?: Device } = {};
      let scanTimeout: NodeJS.Timeout;
      let deviceCount = 0;
      
      this.bleManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          logDebug('❌ Scan error:', error);
          this.onError?.(error.message);
          return;
        }

        if (!device) return;

        deviceCount++;
        
        // Log all discovered devices for debugging
        logDebug(`📱 Device ${deviceCount}: ${device.name || 'Unknown'} (${device.id})`);

        // Check if it's a left or right earbud
        const isLeftBud = this.isLeftEarbud(device);
        const isRightBud = this.isRightEarbud(device);

        if (isLeftBud) {
          foundDevices.left = device;
          logDebug('✅ Found LEFT earbud:', device.name || device.localName);
        } else if (isRightBud) {
          foundDevices.right = device;
          logDebug('✅ Found RIGHT earbud:', device.name || device.localName);
        }

        // If we found both earbuds, stop scanning and connect
        if (foundDevices.left && foundDevices.right) {
          logDebug('🎉 Both earbuds found, connecting...');
          this.bleManager.stopDeviceScan();
          clearTimeout(scanTimeout);
          
          try {
            await this.connectToBothDevices(foundDevices.left, foundDevices.right);
          } catch (connectError: any) {
            logDebug('❌ Error connecting to both devices:', connectError);
            this.onError?.(connectError.message);
          }
        }
      });

      // Set scanning timeout
      scanTimeout = setTimeout(() => {
        this.bleManager.stopDeviceScan();
        
        const missing = [];
        if (!foundDevices.left) missing.push('left');
        if (!foundDevices.right) missing.push('right');
        
        if (missing.length > 0) {
          const errorMessage = `Could not find ${missing.join(' and ')} earbud(s). Make sure both earbuds are powered on and in pairing mode.`;
          this.onError?.(errorMessage);
        }
      }, 30000); // 30 seconds

    } catch (error: any) {
      logDebug('❌ Connection error:', error);
      this.onError?.(error.message);
    }
  }

  private isLeftEarbud(device: Device): boolean {
    return (device.name !== null && device.name !== undefined && device.name.toLowerCase().includes('niura') && device.name.toLowerCase().includes('l')) ||
           (device.localName !== null && device.localName === 'Niura EEG BUDS L') ||
           (device.serviceUUIDs !== null && device.serviceUUIDs !== undefined && device.serviceUUIDs.includes(LEFT_BUD_CONFIG.serviceUUID.toLowerCase()));
  }

  private isRightEarbud(device: Device): boolean {
    return (device.name !== null && device.name !== undefined && device.name.toLowerCase().includes('niura') && device.name.toLowerCase().includes('r')) ||
           (device.localName !== null && device.localName === 'Niura EEG BUDS R') ||
           (device.serviceUUIDs !== null && device.serviceUUIDs !== undefined && device.serviceUUIDs.includes(RIGHT_BUD_CONFIG.serviceUUID.toLowerCase()));
  }

  private async clearBLECache(): Promise<void> {
    try {
      this.bleManager.stopDeviceScan();
      
      if (this.leftDevice) {
        await this.bleManager.cancelDeviceConnection(this.leftDevice.id);
        this.leftDevice = null;
      }
      
      if (this.rightDevice) {
        await this.bleManager.cancelDeviceConnection(this.rightDevice.id);
        this.rightDevice = null;
      }
      
      this.isConnected = false;
      this.updateConnectionStatus();
    } catch (error) {
      logDebug('⚠️ Error clearing BLE cache:', error);
    }
  }

  private async connectToBothDevices(leftDevice: Device, rightDevice: Device): Promise<void> {
    try {
      logDebug('🔗 Connecting to both earbuds...');
      
      const [connectedLeft, connectedRight] = await Promise.all([
        leftDevice.connect({ timeout: 10000 }),
        rightDevice.connect({ timeout: 10000 })
      ]);

      await Promise.all([
        connectedLeft.discoverAllServicesAndCharacteristics(),
        connectedRight.discoverAllServicesAndCharacteristics()
      ]);

      this.leftDevice = connectedLeft;
      this.rightDevice = connectedRight;
      this.isConnected = true;
      
      logDebug('🎉 Successfully connected to both earbuds!');
      this.updateConnectionStatus();
      
      // Automatically start data collection
      await this.startDataCollection();
      
    } catch (error: any) {
      logDebug('❌ Error connecting to devices:', error);
      await this.clearBLECache();
      throw error;
    }
  }

  private async setupDataMonitoring(): Promise<void> {
    if (!this.leftDevice || !this.rightDevice) {
      throw new Error('Both devices must be connected to set up monitoring');
    }

    try {
      logDebug('📡 Setting up EEG data monitoring...');
      
      // Monitor left earbud
      this.leftDevice.monitorCharacteristicForService(
        LEFT_BUD_CONFIG.serviceUUID,
        LEFT_BUD_CONFIG.txUUID,
        (error, characteristic) => {
          if (error) {
            logDebug('❌ Left earbud monitoring error:', error);
            return;
          }
          if (characteristic?.value) {
            this.processEEGData(characteristic.value, 'left');
          }
        }
      );

      // Monitor right earbud
      this.rightDevice.monitorCharacteristicForService(
        RIGHT_BUD_CONFIG.serviceUUID,
        RIGHT_BUD_CONFIG.txUUID,
        (error, characteristic) => {
          if (error) {
            logDebug('❌ Right earbud monitoring error:', error);
            return;
          }
          if (characteristic?.value) {
            this.processEEGData(characteristic.value, 'right');
          }
        }
      );

      logDebug('✅ EEG data monitoring set up successfully');
      
    } catch (error) {
      logDebug('❌ Error setting up data monitoring:', error);
      throw error;
    }
  }

  private processEEGData(rawData: string, deviceType: 'left' | 'right'): void {
    try {
      const bytes = this.base64ToBytes(rawData);
      const reading = this.parseEEGPacket(bytes, deviceType);
      
      if (reading && this.isCollecting) {
        this.collectionBuffer.push(reading);
      }
    } catch (error) {
      logDebug(`Error processing ${deviceType} earbud data:`, error);
    }
  }

  private base64ToBytes(base64: string): number[] {
    try {
      const binaryString = atob(base64);
      const bytes = [];
      for (let i = 0; i < binaryString.length; i++) {
        bytes.push(binaryString.charCodeAt(i));
      }
      return bytes;
    } catch (error) {
      throw new Error(`Failed to decode base64 data: ${error}`);
    }
  }

  private parseEEGPacket(bytes: number[], deviceType: 'left' | 'right'): RawEEGReading | null {
    try {
      // Expected packet format: [0xA0, SampleNumber, Ch1_Index, Ch1_H, Ch1_M, Ch1_L, Ch2_Index, Ch2_H, Ch2_M, Ch2_L, Ch3_Index, Ch3_H, Ch3_M, Ch3_L, 0xC0]
      // Total: 15 bytes per packet
      
      if (bytes.length < 15) {
        logDebug(`${deviceType}: Packet too short, expected 15 bytes, got ${bytes.length}`);
        return null;
      }

      // Validate header (expecting 0xA0 for start of packet)
      if (bytes[0] !== 0xA0) {
        logDebug(`${deviceType}: Invalid packet header: 0x${bytes[0].toString(16)}, expected 0xA0`);
        return null;
      }

      // Validate end byte (expecting 0xC0)
      if (bytes[14] !== 0xC0) {
        logDebug(`${deviceType}: Invalid packet end: 0x${bytes[14].toString(16)}, expected 0xC0`);
        return null;
      }

      // Extract sample number
      const sampleNumber = bytes[1];

      // Extract 24-bit values for each channel (skip index bytes, use only data bytes)
      // Ch1: bytes 3-5 (skip index byte 2)
      const ch1Raw = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
      // Ch2: bytes 7-9 (skip index byte 6)  
      const ch2Raw = (bytes[7] << 16) | (bytes[8] << 8) | bytes[9];
      // Ch3: bytes 11-13 (skip index byte 10)
      const ch3Raw = (bytes[11] << 16) | (bytes[12] << 8) | bytes[13];

      // Convert to signed 24-bit integers
      const ch1 = this.convertToSignedInt24(ch1Raw);
      const ch2 = this.convertToSignedInt24(ch2Raw);
      const ch3 = this.convertToSignedInt24(ch3Raw);

      // Use the timestamp format expected by backend: "YYYY-MM-DD HH:MM:SS.mmm"
      const now = new Date();
      const timestamp = this.formatTimestamp(now);

      return {
        timestamp,
        sampleNumber,
        ch1,
        ch2,
        ch3,
        deviceType
      };

    } catch (error) {
      logDebug(`Error parsing ${deviceType} EEG packet:`, error);
      return null;
    }
  }

  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  private convertToSignedInt24(value: number): number {
    if (value >= 0x800000) {
      return value - 0x1000000;
    }
    return value;
  }

  public async startDataCollection(): Promise<void> {
    if (!this.isConnected || !this.leftDevice || !this.rightDevice) {
      throw new Error('Both earbuds must be connected to start data collection');
    }

    if (this.isCollecting) return;

    try {
      logDebug('🚀 Starting EEG data collection...');
      
      this.collectionBuffer = [];
      this.sampleIndex = 0;
      
      // Send start streaming command to both earbuds
      await Promise.all([
        this.sendCommand(this.leftDevice, LEFT_BUD_CONFIG, COMMANDS.START_STREAMING),
        this.sendCommand(this.rightDevice, RIGHT_BUD_CONFIG, COMMANDS.START_STREAMING)
      ]);
      
      this.isCollecting = true;
      await this.setupDataMonitoring();
      this.startCollectionCycle();
      
    } catch (error) {
      logDebug('❌ Error starting data collection:', error);
      throw error;
    }
  }

  private startCollectionCycle(): void {
    this.collectionTimer = setTimeout(() => {
      this.processCollectedData();
      
      if (this.isCollecting) {
        this.startCollectionCycle();
      }
    }, COLLECTION_DURATION);
  }

  private processCollectedData(): void {
    if (this.collectionBuffer.length === 0) return;

    try {
      const mergedData = this.mergeChannelData(this.collectionBuffer);
      const eegData = this.convertToEEGFormat(mergedData);
      
      // Send to backend for processing
      this.sendToBackend(eegData);
      
      this.collectionBuffer = [];
      
    } catch (error) {
      logDebug('❌ Error processing collected data:', error);
    }
  }

  private mergeChannelData(readings: RawEEGReading[]): MergedEEGReading[] {
    const leftReadings = readings.filter(r => r.deviceType === 'left');
    const rightReadings = readings.filter(r => r.deviceType === 'right');
    
    const merged: MergedEEGReading[] = [];
    const minLength = Math.min(leftReadings.length, rightReadings.length);
    
    for (let i = 0; i < minLength; i++) {
      const leftReading = leftReadings[i];
      const rightReading = rightReadings[i];
      
      merged.push({
        timestamp: leftReading.timestamp,
        sampleNumber: leftReading.sampleNumber,
        ch1: leftReading.ch1,   // Left Ch1
        ch2: leftReading.ch2,   // Left Ch2
        ch3: leftReading.ch3,   // Left Ch3
        ch4: rightReading.ch1,  // Right Ch1
        ch5: rightReading.ch2,  // Right Ch2
        ch6: rightReading.ch3,  // Right Ch3
      });
    }
    
    return merged;
  }

  private convertToEEGFormat(mergedData: MergedEEGReading[]): EEGData {
    const records: EEGSample[] = mergedData.map((reading, index) => ({
      sample_index: this.sampleIndex + index,
      timestamp: reading.timestamp,
      eeg: [reading.ch1, reading.ch2, reading.ch3, reading.ch4, reading.ch5, reading.ch6]
    }));
    
    this.sampleIndex += records.length;
    
    return {
      records,
      duration: (COLLECTION_DURATION / 1000).toString()
    };
  }

  private async sendToBackend(eegData: EEGData): Promise<void> {
    try {
      logDebug(`📤 Sending ${eegData.records.length} EEG samples to backend...`);
      
      // Debug: Log first sample to verify format
      if (eegData.records.length > 0) {
        const firstSample = eegData.records[0];
        logDebug(`📊 Sample format check:`, {
          sample_index: firstSample.sample_index,
          timestamp: firstSample.timestamp,
          eeg_channels: firstSample.eeg.length,
          eeg_values: firstSample.eeg,
          duration: eegData.duration
        });
      }
      
      const response = await fetch(BACKEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eegData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      logDebug('✅ EEG data sent successfully:', result);
      
    } catch (error) {
      logDebug('❌ Error sending EEG data to backend:', error);
    }
  }

  private async sendCommand(device: Device, config: typeof LEFT_BUD_CONFIG, command: string): Promise<void> {
    try {
      const encodedCommand = encode(command);
      
      await device.writeCharacteristicWithoutResponseForService(
        config.serviceUUID,
        config.rxUUID,
        encodedCommand
      );
      
    } catch (error) {
      logDebug(`❌ Error sending command to ${config.deviceName}:`, error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      logDebug('🔌 Disconnecting from earbuds...');
      
      this.isCollecting = false;
      
      if (this.collectionTimer) {
        clearTimeout(this.collectionTimer);
        this.collectionTimer = null;
      }
      
      const disconnectPromises = [];
      
      if (this.leftDevice) {
        disconnectPromises.push(this.bleManager.cancelDeviceConnection(this.leftDevice.id));
      }
      
      if (this.rightDevice) {
        disconnectPromises.push(this.bleManager.cancelDeviceConnection(this.rightDevice.id));
      }
      
      await Promise.all(disconnectPromises);
      
      this.leftDevice = null;
      this.rightDevice = null;
      this.isConnected = false;
      
      this.updateConnectionStatus();
      
    } catch (error) {
      logDebug('❌ Error disconnecting:', error);
      throw error;
    }
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.isCollecting = false;
    this.leftDevice = null;
    this.rightDevice = null;
    
    if (this.collectionTimer) {
      clearTimeout(this.collectionTimer);
      this.collectionTimer = null;
    }
    
    this.updateConnectionStatus();
  }

  private updateConnectionStatus(): void {
    this.onConnectionStatusChanged?.(this.isConnected);
  }

  // Callback setters
  public setOnConnectionStatusChanged(callback: (isConnected: boolean) => void): void {
    this.onConnectionStatusChanged = callback;
  }

  public setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  // Getters
  public get connectionStatus() {
    return {
      isConnected: this.isConnected,
      leftConnected: !!this.leftDevice,
      rightConnected: !!this.rightDevice
    };
  }

  public get isDataCollectionActive(): boolean {
    return this.isCollecting;
  }
}

export default EEGBLEService; 