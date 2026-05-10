type MockScalar = string | number | boolean | null;

interface MockQueryResult {
  rows: Array<Record<string, MockScalar>>;
  rowsAffected: number;
}

interface MockDatabase {
  executeSync: jest.Mock<MockQueryResult, [string, MockScalar[]?]>;
  close: jest.Mock<void, []>;
  closeAsync: jest.Mock<Promise<void>, []>;
  delete: jest.Mock<void, []>;
}

const mockDb: MockDatabase = {
  executeSync: jest.fn((query: string): MockQueryResult => {
    const normalized = query.trim().toLowerCase();

    if (normalized.startsWith('pragma journal_mode')) {
      return {rows: [{journal_mode: 'wal'}], rowsAffected: 0};
    }

    if (normalized.startsWith('pragma synchronous')) {
      return {rows: [{synchronous: 2}], rowsAffected: 0};
    }

    if (normalized.startsWith('pragma user_version')) {
      return {rows: [{user_version: 1}], rowsAffected: 0};
    }

    if (normalized.startsWith('update messages')) {
      return {rows: [], rowsAffected: 0};
    }

    return {rows: [], rowsAffected: 0};
  }),
  close: jest.fn(),
  closeAsync: jest.fn(async () => undefined),
  delete: jest.fn(),
};

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => mockDb),
}));

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    STATUS_RESTRICTED: 0,
    STATUS_DENIED: 1,
    STATUS_AVAILABLE: 2,
    NETWORK_TYPE_NONE: 0,
    NETWORK_TYPE_ANY: 1,
    NETWORK_TYPE_UNMETERED: 2,
    configure: jest.fn(async () => 2),
    scheduleTask: jest.fn(async () => true),
    status: jest.fn(async () => 2),
    finish: jest.fn(),
    registerHeadlessTask: jest.fn(),
  },
}));
