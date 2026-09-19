export interface IStorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  exportBackup(): Promise<string>; // JSON string
  importBackup(jsonString: string): Promise<boolean>;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  app: string;
  theme?: 'light' | 'dark' | 'system';
  regime?: 'CIRCULAR_133' | 'CIRCULAR_200';
  progress?: Record<string, unknown>;
  assessmentResults?: Record<string, unknown>;
  customData?: Record<string, unknown>;
}
