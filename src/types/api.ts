import type { ConflictEnvelope } from './conflict';
import type { ISODateTimeString, Message, MessageId } from './message';
import type { SyncCursor } from './sync';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiFailure {
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<Data> {
  data: Data;
  receivedAt: ISODateTimeString;
  cursor?: SyncCursor;
}

export interface FetchMessagesParams {
  conversationId?: string;
  cursor?: SyncCursor;
  limit?: number;
}

export interface RemoteMessagePage {
  messages: Message[];
  serverTime: ISODateTimeString;
  nextCursor?: SyncCursor;
}

export interface PushMessagesRequest {
  messages: Message[];
  idempotencyKey: string;
  cursor?: SyncCursor;
}

export interface RejectedMessage {
  messageId: MessageId;
  failure: ApiFailure;
}

export interface PushMessagesResult {
  accepted: Message[];
  rejected: RejectedMessage[];
  conflicts: ConflictEnvelope[];
  cursor: SyncCursor;
}

export interface SyncAcknowledgement {
  cursor: SyncCursor;
  acknowledgedMessageIds: MessageId[];
  acknowledgedAt: ISODateTimeString;
}

export interface MessagingApiClient {
  fetchMessages(
    params: FetchMessagesParams,
  ): Promise<ApiResponse<RemoteMessagePage>>;
  pushMessages(
    request: PushMessagesRequest,
  ): Promise<ApiResponse<PushMessagesResult>>;
  acknowledgeSync(
    acknowledgement: SyncAcknowledgement,
  ): Promise<ApiResponse<SyncAcknowledgement>>;
}
