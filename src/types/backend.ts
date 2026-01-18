// src/types/backend.ts

export type BackendCapabilities = {
  auth: boolean;
  sync: boolean;
  cloudStorage: boolean;
};

export const DEFAULT_CAPABILITIES: BackendCapabilities = {
  auth: false,
  sync: false,
  cloudStorage: false,
};
