import React, { createContext, useContext, useEffect, useState } from 'react';
import { DatabaseService } from '../services/database';

interface DatabaseContextType {
  databaseService: DatabaseService;
  isInitialized: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [databaseService] = useState(() => new DatabaseService());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await databaseService.initDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initDb();
  }, [databaseService]);

  return (
    <DatabaseContext.Provider value={{ databaseService, isInitialized }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}; 