import SQLite from 'react-native-sqlite-storage';

// Enable SQLite Promises
SQLite.enablePromise(true);

export interface BLEReading {
  id?: number;
  timestamp: string;
  stressLevel?: number;
  attentionLevel?: number;
  rawData: string;
  isUploaded: boolean;
}

export class DatabaseService {
  private database: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.database = await SQLite.openDatabase({
        name: 'niura.db',
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        stress_level REAL,
        attention_level REAL,
        raw_data TEXT NOT NULL,
        is_uploaded INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_retry DATETIME,
        status TEXT DEFAULT 'pending',
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reading_id) REFERENCES readings (id) ON DELETE CASCADE
      )`
    ];

    for (const query of queries) {
      await this.database.executeSql(query);
    }
  }

  async addToSyncQueue(readingId: number): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      await this.database.executeSql(
        'INSERT INTO sync_queue (reading_id) VALUES (?)',
        [readingId]
      );
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  async getPendingSyncItems(maxRetries: number = 3): Promise<Array<{ id: number, readingId: number }>> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        `SELECT id, reading_id FROM sync_queue 
         WHERE status = 'pending' 
         AND (retry_count < ? OR retry_count IS NULL)
         ORDER BY created_at ASC`,
        [maxRetries]
      );

      const items = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        items.push({
          id: row.id,
          readingId: row.reading_id
        });
      }
      return items;
    } catch (error) {
      console.error('Error getting pending sync items:', error);
      throw error;
    }
  }

  async updateSyncStatus(queueId: number, success: boolean, error?: string): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      if (success) {
        await this.database.executeSql(
          "UPDATE sync_queue SET status = 'completed' WHERE id = ?",
          [queueId]
        );
      } else {
        await this.database.executeSql(
          `UPDATE sync_queue 
           SET status = 'failed',
               retry_count = retry_count + 1,
               last_retry = CURRENT_TIMESTAMP,
               error = ?
           WHERE id = ?`,
          [error || 'Unknown error', queueId]
        );
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  async storeReading(reading: BLEReading): Promise<number> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      await this.database.executeSql('BEGIN TRANSACTION');

      const { timestamp, stressLevel, attentionLevel, rawData, isUploaded } = reading;
      const [result] = await this.database.executeSql(
        `INSERT INTO readings (timestamp, stress_level, attention_level, raw_data, is_uploaded)
         VALUES (?, ?, ?, ?, ?)`,
        [timestamp, stressLevel, attentionLevel, rawData, isUploaded ? 1 : 0]
      );
      
      const readingId = result.insertId;
      
      // Add to sync queue if not already uploaded
      if (!isUploaded) {
        await this.addToSyncQueue(readingId);
      }

      await this.database.executeSql('COMMIT');
      return readingId;
    } catch (error) {
      await this.database.executeSql('ROLLBACK');
      console.error('Error storing reading:', error);
      throw error;
    }
  }

  async getUnsyncedReadings(): Promise<BLEReading[]> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM readings WHERE is_uploaded = 0 ORDER BY timestamp ASC'
      );
      
      return this.mapResultsToReadings(results);
    } catch (error) {
      console.error('Error getting unsynced readings:', error);
      throw error;
    }
  }

  async markReadingsAsSynced(ids: number[]): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.database.executeSql(
        `UPDATE readings SET is_uploaded = 1 WHERE id IN (${placeholders})`,
        ids
      );
    } catch (error) {
      console.error('Error marking readings as synced:', error);
      throw error;
    }
  }

  async getReadings(startDate: Date, endDate: Date): Promise<BLEReading[]> {
    if (!this.database) throw new Error('Database not initialized');

    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startDate.toISOString(), endDate.toISOString()]
      );
      
      return this.mapResultsToReadings(results);
    } catch (error) {
      console.error('Error getting readings:', error);
      throw error;
    }
  }

  private mapResultsToReadings(results: SQLite.ResultSet): BLEReading[] {
    const readings: BLEReading[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      readings.push({
        id: row.id,
        timestamp: row.timestamp,
        stressLevel: row.stress_level,
        attentionLevel: row.attention_level,
        rawData: row.raw_data,
        isUploaded: Boolean(row.is_uploaded)
      });
    }
    
    return readings;
  }

  async cleanOldData(daysToKeep: number = 30): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      await this.database.executeSql(
        'DELETE FROM readings WHERE timestamp < ? AND is_uploaded = 1',
        [cutoffDate.toISOString()]
      );
    } catch (error) {
      console.error('Error cleaning old data:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService(); 