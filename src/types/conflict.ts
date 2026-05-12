export interface ServerMessageSnapshot {
  clientId: string;
  serverId: string;
  serverBody: string;
  serverCreatedAt: number;
  serverUpdatedAt: number;
  serverVersion: number;
}

export type LastWriteWinsWinner = 'server' | 'local';

export interface LastWriteWinsResolution {
  clientId: string;
  winner: LastWriteWinsWinner;
  localTimestamp: number;
  serverTimestamp: number;
  resolvedBody: string;
  serverVersion: number;
}
