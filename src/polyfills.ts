import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";
import 'assert';
import structuredClone from "@ungap/structured-clone";
import 'react-native-gesture-handler';

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
