export interface FashConfig {
  algorithm: 'md5' | 'sha1' | 'sha256';
  exclude?: string[];
}

export interface FileMapping {
  originalPath: string;
  hashedPath: string;
  isDirectory: boolean;
  hash: string;
  timestamp: number;
}

export interface FashMap {
  version: string;
  created: number;
  mappings: FileMapping[];
  config: FashConfig;
}

export interface FashLog {
  action: 'init' | 'config' | 'show' | 'commit' | 'undo' | 'status' | 'log' | 'rekey';
  timestamp: number;
  details: string;
}

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256';

export interface CliOptions {
  help?: boolean;
  version?: boolean;
  algorithm?: HashAlgorithm;
  exclude?: string[];
  all?: boolean;
  files?: boolean;
  directories?: boolean;
  config?: boolean;
}
