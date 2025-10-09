import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  JsonHubProtocol,
} from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEncryption } from "../hooks/useEncryption";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const API_BASE = import.meta.env.VITE_API_BASE;

export type ChatMessage = { user: string; text: string };
export type RoomItem = {
  id: number;
  room: string;
  description: string;
  isPrivate: boolean;
};

type Props = {
  user?: string;
  setUser: (u: string) => void;
  jwt?: string;
  setJwt: (t: string) => void;
  isGuest: boolean;
  setIsGuest: (g: boolean) => void;
  transport: HttpTransportType;
  protocol: "json" | "msgpack";
};

export const LobbyPage: React.FC<Props> = ({
  user,
  setUser,
  jwt,
  setJwt,
  isGuest,
  setIsGuest,
  transport,
  protocol,
}) => {
  const [tempUser, setTempUser] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [hubReady, setHubReady] = useState(false);

  const connectionRef = useRef<HubConnection | null>(null);
  const navigate = useNavigate();
  const { encryptMessage, decryptIfEncrypted } = useEncryption();

  // --- Läs JWT och user från sessionStorage på mount ---
  useEffect(() => {
    const storedJwt = sessionStorage.getItem("jwt");
    const storedUser = sessionStorage.getItem("username");
    if (storedJwt && !jwt) setJwt(storedJwt);
    if (storedUser && !user) {
      setUser(storedUser);
      setIsGuest(false);
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!jwt) return;
    if (isGuest) return;
    const activeJwt = jwt ?? sessionStorage.getItem("jwt");
    fetchRooms(activeJwt);
  }, [jwt, isGuest]);

  const fetchRooms = async (token?: string) => {
    const activeJwt = token ?? jwt ?? sessionStorage.getItem("jwt");
    if (!activeJwt) {
      console.error("No JWT available to fetch rooms");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        headers: { Authorization: `Bearer ${activeJwt}` },
      });
      if (!res.ok) throw new Error(`Could not fetch rooms: ${res.status}`);
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error("fetchRooms error:", err);
      toast.error("Failed to fetch rooms");
    }
  };

  // --- Connect public hub for guest ---
  const connectPublicHub = async (username?: string) => {
    const effectiveUser =
      username ?? user ?? sessionStorage.getItem("username");
    if (!effectiveUser) {
      toast.error("No username");
      return;
    }

    if (connectionRef.current?.state === HubConnectionState.Connected) {
      await connectionRef.current.stop().catch(() => {});
      connectionRef.current = null;
      setHubReady(false);
    }

    const hubProtocol =
      protocol === "msgpack"
        ? new MessagePackHubProtocol()
        : new JsonHubProtocol();

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/publicchathub`, { transport })
      .withHubProtocol(hubProtocol)
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveMessage", async (u: string, msg: string) => {
      const displayed = await decryptIfEncrypted(msg).catch(() => msg);
      setMessages((prev) => [
        ...prev,
        { user: DOMPurify.sanitize(u), text: DOMPurify.sanitize(displayed) },
      ]);
    });

    conn.onclose(() => setHubReady(false));

    try {
      await conn.start();
      await conn.invoke("SetUsername", effectiveUser);
      connectionRef.current = conn;
      setHubReady(true);
      toast.success(`Connected as ${effectiveUser}`);
    } catch (err) {
      console.error("connectPublicHub error:", err);
      toast.error("Failed to connect to public chat hub");
    }
  };

  // --- Guest submit ---
  const submitUsername = async () => {
    if (!tempUser.trim()) return;
    const username = tempUser.trim();

    setUser(username);
    setIsGuest(true);
    sessionStorage.setItem("username", username);
    connectPublicHub(username);
  };

  // --- Send message ---
  const sendMessage = async () => {
    if (!hubReady) return toast.warning("Hub not ready");
    const conn = connectionRef.current;
    if (!conn || conn.state !== HubConnectionState.Connected)
      return toast.error("Not connected");
    if (!message) return;

    const encrypted = await encryptMessage(message).catch(() => message);

    try {
      await conn.invoke("SendMessage", encrypted);
      setMessage("");
    } catch (err) {
      console.error("SendMessage invoke failed:", err);
      toast.error("Failed to send message");
    }
  };

  // --- Auth success handler ---
  const handleAuthSuccess = (token: string, username: string) => {
    setJwt(token);
    setUser(username);
    setIsGuest(false);
    sessionStorage.setItem("jwt", token);
    sessionStorage.setItem("username", username);
    fetchRooms(token);
  };

  // --- Create Room component ---
  const CreateRoom: React.FC<{ jwt: string; onCreated: () => void }> = ({
    jwt,
    onCreated,
  }) => {
    const [room, setRoom] = useState<string>("");

    const create = async () => {
      if (!room.trim()) return;
      try {
        const res = await fetch(`${API_BASE}/rooms/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            Room: room.trim(),
            Description: "",
            IsPrivate: true,
          }),
        });
        if (!res.ok) throw new Error("Failed to create room");
        setRoom("");
        onCreated();
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    return (
      <div className="flex space-x-2 mt-2">
        <input
          className="input input-bordered flex-1"
          placeholder="New room name"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button className="btn btn-success" onClick={create}>
          Create
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col p-6">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-xl mb-2">Type your name</h2>
            <input
              className="input input-bordered w-64 mb-2"
              placeholder="Your name"
              value={tempUser}
              onChange={(e) => setTempUser(e.target.value)}
            />
            <button className="btn btn-primary w-64" onClick={submitUsername}>
              Join as Guest
            </button>
          </div>
        ) : isGuest ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Public Chat (Guest)</h1>
            <div className="flex-1 my-4 overflow-y-auto">
              {messages.length === 0 && (
                <small className="text-gray-400">No messages yet 😞</small>
              )}
              {messages.map((m, i) => (
                <div
                  key={`${m.user}-${i}`}
                  className={`chat ${
                    m.user === user ? "chat-end" : "chat-start"
                  }`}
                >
                  <div className="chat-header font-semibold">{m.user}</div>
                  <div
                    className={`chat-bubble text-white ${
                      m.user === user ? "bg-gray-700" : "bg-blue-600"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={user}
                disabled
                className="input input-bordered w-1/3"
              />
              <input
                type="text"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="input input-bordered flex-1"
              />
              <button className="btn btn-primary" onClick={sendMessage}>
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Rooms</h1>
            <button
              className="btn btn-sm btn-primary mb-2"
              onClick={() => fetchRooms(jwt)}
            >
              Refresh Rooms
            </button>
            <CreateRoom
              jwt={jwt ?? sessionStorage.getItem("jwt")!}
              onCreated={() => fetchRooms(jwt)}
            />
            <ul className="mt-2 space-y-1">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    navigate(`/room/${r.id}`);
                    sessionStorage.setItem("RoomName", r.room);
                  }}
                >
                  {r.room} {r.isPrivate && "(Private)"}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="w-80 bg-gray-800 p-4 border-l text-white">
        <h2 className="text-lg font-bold mb-2">Login / Register</h2>
        <LoginForm onAuthSuccess={handleAuthSuccess} />
        <RegisterForm onAuthSuccess={handleAuthSuccess} />
      </div>

      <ToastContainer />
    </div>
  );
};
