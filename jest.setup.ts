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

jest.mock('@react-native-community/netinfo', () => {
  const NetInfoStateType = {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  };

  return {
    __esModule: true,
    default: {
      fetch: jest.fn(async () => ({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.wifi,
      })),
      addEventListener: jest.fn(() => jest.fn()),
    },
    NetInfoStateType,
  };
});

jest.mock('react-native-video', () => {
  const React = require('react');
  const {View} = require('react-native');

  function MockVideo(props: Record<string, unknown>): React.JSX.Element {
    return React.createElement(View, {
      ...props,
      testID: 'login-video',
    });
  }

  return {
    __esModule: true,
    default: MockVideo,
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const {FlatList} = require('react-native');

  function FlashList(props: Record<string, unknown>): React.JSX.Element {
    return React.createElement(FlatList, props);
  }

  return {FlashList};
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const {Text} = require('react-native');

  function createIcon(name: string) {
    return function MockIcon(): React.JSX.Element {
      return React.createElement(Text, {accessibilityElementsHidden: true}, name);
    };
  }

  return {
    AlertCircle: createIcon('AlertCircle'),
    AlertTriangle: createIcon('AlertTriangle'),
    Check: createIcon('Check'),
    CheckCheck: createIcon('CheckCheck'),
    CheckCircle2: createIcon('CheckCircle2'),
    Clock3: createIcon('Clock3'),
    Database: createIcon('Database'),
    Loader2: createIcon('Loader2'),
    LogIn: createIcon('LogIn'),
    RefreshCw: createIcon('RefreshCw'),
    Send: createIcon('Send'),
    Wifi: createIcon('Wifi'),
    WifiOff: createIcon('WifiOff'),
    XCircle: createIcon('XCircle'),
  };
});
