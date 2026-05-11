// Hermes exposes the Web Crypto API at `globalThis.crypto` in React Native.
// The base tsconfig lib does not include `dom`, so we declare the minimal subset used.
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};
