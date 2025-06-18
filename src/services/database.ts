// Fallback database service when SQLite is not available
let SQLite: any = null;

try {
  SQLite = require('expo-sqlite');
} catch (error) {
  console.warn('SQLite not available, using fallback implementation');
}

interface BLEReading {
  id?: number;
  timestamp: Date;
  value: number;
  type: string;
}

interface SQLiteTransaction {
  executeSql: (
    sql: string,
    args?: any[],
    callback?: (tx: SQLiteTransaction, result: SQLiteResult) => void
  ) => void;
}

interface SQLiteResult {
  insertId: number;
  rows: {
    length: number;
    item: (index: number) => any;
  };
}

export class DatabaseService {
  private db: any = null;
  private isAvailable: boolean = false;

  constructor() {
    this.isAvailable = SQLite !== null;
  }

  async initDatabase(): Promise<void> {
    if (!this.isAvailable) {
      console.warn('Database not available - using fallback mode');
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync('niura.db');
      await this.createTables();
    } catch (error) {
      console.error('Error initializing database:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db || !this.isAvailable) return;

    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          value REAL NOT NULL,
          type TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        )
      `);
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async storeReading(reading: BLEReading): Promise<number> {
    if (!this.db || !this.isAvailable) {
      console.warn('Database not available - reading not stored:', reading);
      return Math.random(); // Return fake ID
    }

    try {
      const result = await this.db.runAsync(
        'INSERT INTO readings (value, type) VALUES (?, ?)',
        [reading.value, reading.type]
      );
      
      if (result.lastInsertRowId === undefined) {
        throw new Error('Failed to insert reading');
      }
      
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error storing reading:', error);
      throw error;
    }
  }

  async getReadings(startDate: Date, endDate: Date): Promise<BLEReading[]> {
    if (!this.db || !this.isAvailable) {
      console.warn('Database not available - returning empty readings');
      return []; // Return empty array
    }

    try {
      const rows = await this.db.getAllAsync(
        'SELECT * FROM readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startDate.toISOString(), endDate.toISOString()]
      );

      return rows.map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        value: row.value,
        type: row.type,
      }));
    } catch (error) {
      console.error('Error getting readings:', error);
      throw error;
    }
  }

  async cleanOldData(daysToKeep: number = 30): Promise<void> {
    if (!this.db || !this.isAvailable) {
      console.warn('Database not available - skipping cleanup');
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await this.db.runAsync(
        'DELETE FROM readings WHERE timestamp < ?',
        [cutoffDate.toISOString()]
      );
    } catch (error) {
      console.error('Error cleaning old data:', error);
      throw error;
    }
  }

  async syncWithBackend(): Promise<void> {
    if (!this.db || !this.isAvailable) {
      console.warn('Database not available - skipping sync');
      return;
    }

    try {
      // Get all unsynced readings
      const unsynced = await this.db.getAllAsync(
        'SELECT * FROM readings WHERE synced = 0'
      );

      // TODO: Implement your backend sync logic here
      // const syncedIds = await yourBackendService.syncReadings(unsynced);

      // Mark readings as synced
      await this.db.withTransactionAsync(async () => {
        for (const reading of unsynced) {
          await this.db!.runAsync(
            'UPDATE readings SET synced = 1 WHERE id = ?',
            [reading.id]
          );
        }
      });
    } catch (error) {
      console.error('Error syncing with backend:', error);
      throw error;
    }
  }

  // Helper method to check if database is available
  isDatabaseAvailable(): boolean {
    return this.isAvailable;
  }
}

export const databaseService = new DatabaseService(); 