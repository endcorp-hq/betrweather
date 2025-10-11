import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";
import structuredClone from "@ungap/structured-clone";
import 'react-native-gesture-handler';
import RNEventSource from 'react-native-sse';

// import moduleAlias from 'module-alias';

// moduleAlias.addAlias('@metaplex-foundation/umi/serializers', '@metaplex-foundation/umi-serializers');

global.Buffer = Buffer;

Buffer.prototype.subarray = function subarray(
  begin: number | undefined,
  end: number | undefined
) {
  const result = Uint8Array.prototype.subarray.apply(this, [begin, end]);
  Object.setPrototypeOf(result, Buffer.prototype); // Explicitly add the `Buffer` prototype (adds `readUIntLE`!)
  return result;
};

// getRandomValues polyfill
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== "undefined" ? crypto : new Crypto();

(() => {
  if (typeof crypto === "undefined") {
    Object.defineProperty(window, "crypto", {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();

if (!("structuredClone" in globalThis)) {
    // @ts-expect-error: polyfill signature mismatch is safe here
  globalThis.structuredClone = structuredClone;
}

// EventSource polyfill for React Native environments
(() => {
  try {
    // @ts-ignore - runtime presence check
    const hasEventSource = typeof (global as any).EventSource !== 'undefined';
    if (!hasEventSource && RNEventSource) {
      // @ts-ignore - assign to global
      (global as any).EventSource = RNEventSource as unknown as typeof EventSource;
    }
  } catch {}
})();
