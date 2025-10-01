import React, { useEffect, useRef, useState } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  JsonHubProtocol,
} from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import DOMPurify from "dompurify";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type ChatMessage = {
  user: string;
  text: string;
};

export default function App() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [user, setUser] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [protocol, setProtocol] = useState<"json" | "msgpack">("json");
  const [transport, setTransport] = useState<HttpTransportType>(
    HttpTransportType.WebSockets
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const startConnection = async () => {
    if (connection) {
      await connection.stop();
    }

    // hämta JWT från servern
    const res = await fetch("http://localhost:5214/auth/token");
    const data = (await res.json()) as { token: string };
    const token = data.token;
    sessionStorage.setItem("jwt", token);
    toast.success(`Token: ${token}`);

    // välja meddelandeprotokoll
    const hubProtocol =
      protocol === "msgpack"
        ? new MessagePackHubProtocol()
        : new JsonHubProtocol();

    // skapa anslutning
    const conn = new HubConnectionBuilder()
      .withUrl("http://localhost:5214/chathub", {
        accessTokenFactory: () => token,
        transport: transport,
      })
      .withHubProtocol(hubProtocol)
      .withAutomaticReconnect()
      .build();

    // event handler med typer
    conn.on("ReceiveMessage", (u: string, msg: string) => {
      const safeUser = DOMPurify.sanitize(u);
      const safeMsg = DOMPurify.sanitize(msg);
      setMessages((prev) => [...prev, { user: safeUser, text: safeMsg }]);
    });

    await conn.start();
    setConnection(conn);
    console.log(`Connected with: ${transport}, ${protocol}`);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (connection && message && user) {
      try {
        // invoke med void-typ
        await connection.invoke<void>("SendMessage", user, message);
        setMessage("");
      } catch (err) {
        console.error("Send error:", err);
      }
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto mt-10 space-y-4">
      <div className="flex gap-2">
        <select
          value={transport}
          onChange={(e) =>
            setTransport(Number(e.target.value) as HttpTransportType)
          }
          className="select select-bordered"
        >
          <option value={HttpTransportType.WebSockets}>WebSockets</option>
          <option value={HttpTransportType.ServerSentEvents}>SSE</option>
          <option value={HttpTransportType.LongPolling}>LongPolling</option>
        </select>

        <select
          value={protocol}
          onChange={(e) => setProtocol(e.target.value as "json" | "msgpack")}
          className="select select-bordered"
        >
          <option value="json">JSON</option>
          <option value="msgpack">MessagePack</option>
        </select>

        <button className="btn btn-primary" onClick={startConnection}>
          Connect
        </button>
      </div>

      <div
        className={`h-96 overflow-y-scroll border rounded-lg p-4 ${
          connection ? "bg-primary" : "bg-neutral"
        }`}
      >
        {messages.length === 0 && (
          <small className="text-gray-400">Inga meddelanden ännu 😞</small>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat ${m.user === user ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-header">{m.user}</div>
            <div
              className={`chat-bubble ${m.user === user ? "bg-gray-700" : ""}`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Name"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="input input-bordered w-1/3"
        />
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          className="input input-bordered flex-1"
        />
        <button className="btn btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}
