import NetInfo from '@react-native-community/netinfo';
import { databaseService, BLEReading } from './database';

interface SyncStatus {
  pendingItems: number;
  lastSyncAttempt: Date | null;
  isCurrentlySyncing: boolean;
}

class SyncService {
  private status: SyncStatus = {
    pendingItems: 0,
    lastSyncAttempt: null,
    isCurrentlySyncing: false
  };

  private syncQueue: BLEReading[] = [];
  private maxRetries = 3;

  constructor() {
    // Initialize network monitoring
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processQueue();
      }
    });
  }

  async addToQueue(reading: BLEReading): Promise<void> {
    try {
      // Store in local database first
      const id = await databaseService.storeReading(reading);
      
      // Add to sync queue if we're online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        this.syncQueue.push({ ...reading, id });
        this.processQueue();
      }
      
      this.status.pendingItems = this.syncQueue.length;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  async processQueue(): Promise<void> {
    if (this.status.isCurrentlySyncing || this.syncQueue.length === 0) {
      return;
    }

    this.status.isCurrentlySyncing = true;
    this.status.lastSyncAttempt = new Date();

    try {
      // Get all unsynced readings from database
      const unsyncedReadings = await databaseService.getUnsyncedReadings();
      
      // Add them to the queue if not already there
      for (const reading of unsyncedReadings) {
        if (!this.syncQueue.find(item => item.id === reading.id)) {
          this.syncQueue.push(reading);
        }
      }

      // Process each item in the queue
      const successfulIds: number[] = [];
      const failedItems: BLEReading[] = [];

      for (const item of this.syncQueue) {
        try {
          // TODO: Replace with your actual API call
          // await api.sendReading(item);
          if (item.id) {
            successfulIds.push(item.id);
          }
        } catch (error) {
          failedItems.push(item);
          console.error('Error syncing item:', error);
        }
      }

      // Mark successful items as synced
      if (successfulIds.length > 0) {
        await databaseService.markReadingsAsSynced(successfulIds);
      }

      // Update queue with only failed items
      this.syncQueue = failedItems;
      this.status.pendingItems = this.syncQueue.length;

    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.status.isCurrentlySyncing = false;
    }
  }

  async handleFailedSync(item: BLEReading): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        // TODO: Replace with your actual API call
        // await api.sendReading(item);
        
        if (item.id) {
          await databaseService.markReadingsAsSynced([item.id]);
        }
        return;
      } catch (error) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }
    
    console.error(`Failed to sync item after ${this.maxRetries} attempts:`, item);
  }

  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  // Force a sync attempt
  async forceSyncNow(): Promise<void> {
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      await this.processQueue();
    } else {
      throw new Error('No network connection available');
    }
  }
}

export const syncService = new SyncService(); 