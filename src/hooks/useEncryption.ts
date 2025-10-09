import { useState } from "react";

// 256-bit AES-GCM key i Base64
const DEFAULT_KEY = "TdImJpORy3GNBcQt5IFaQ9I6qMzUt41uBn3fK/2u0wU=";

export const useEncryption = () => {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // --- Initiera nyckel ---
  const getKey = async () => {
    if (cryptoKey) return cryptoKey;

    const rawKey = Uint8Array.from(atob(DEFAULT_KEY), (c) => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    );
    setCryptoKey(key);
    return key;
  };

  // --- Kryptera meddelande ---
  const encryptMessage = async (message: string) => {
    const key = await getKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    // Returnera Base64 IV + cipher
    const buffer = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + buffer.length);
    combined.set(iv);
    combined.set(buffer, iv.length);

    return btoa(String.fromCharCode(...combined));
  };

  // --- Dekryptera meddelande ---
  const decryptIfEncrypted = async (cipherText: string) => {
    try {
      const combined = Uint8Array.from(atob(cipherText), (c) =>
        c.charCodeAt(0)
      );
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      const key = await getKey();
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
      );
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch {
      // Om det inte är krypterat, returnera som-is
      return cipherText;
    }
  };

  return { encryptMessage, decryptIfEncrypted };
};
