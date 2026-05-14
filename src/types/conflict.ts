export interface ServerMessageSnapshot {
  readonly clientId: string;
  readonly serverId: string;
  readonly serverBody: string;
  readonly serverCreatedAt: number;
  readonly serverUpdatedAt: number;
  readonly serverVersion: number;
}

export type LastWriteWinsWinner = 'server' | 'local';

export interface LastWriteWinsResolution {
  readonly clientId: string;
  readonly winner: LastWriteWinsWinner;
  readonly localTimestamp: number;
  readonly serverTimestamp: number;
  readonly resolvedBody: string;
  readonly serverVersion: number;
}
