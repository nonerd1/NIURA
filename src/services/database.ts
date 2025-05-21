import * as SQLite from 'expo-sqlite';

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
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('niura.db');
      await this.createTables();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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
    if (!this.db) throw new Error('Database not initialized');

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
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.db.getAllAsync<{
        id: number;
        timestamp: string;
        value: number;
        type: string;
      }>(
        'SELECT * FROM readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startDate.toISOString(), endDate.toISOString()]
      );

      return rows.map(row => ({
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
    if (!this.db) throw new Error('Database not initialized');

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

  // New method for syncing with backend
  async syncWithBackend(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get all unsynced readings
      const unsynced = await this.db.getAllAsync<{
        id: number;
        timestamp: string;
        value: number;
        type: string;
      }>('SELECT * FROM readings WHERE synced = 0');

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
}

export const databaseService = new DatabaseService(); 