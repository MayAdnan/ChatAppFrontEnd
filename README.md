# ChatApp Client (Vite + React + TS)

This client connects to the ASP.NET Core SignalR server, fetches a JWT, and sends/receives encrypted chat messages.

## Run

```
npm install
npm run dev
```

Open the printed URL (e.g., `http://localhost:5173`). Click "Connect", enter a username and a message, then send.

## Notes

- Uses `https://localhost:7291` for token and SignalR hub
- AES-GCM client-side encryption (demo key) and DOMPurify sanitization
