import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { MessageList, type ChatMessage } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { useEncryption } from "../hooks/useEncryption";

const API_BASE = import.meta.env.VITE_API_BASE;

type Props = {
  user: string;
  jwt?: string;
  transport: HttpTransportType;
  protocol: "json" | "msgpack";
};

export const RoomPage: React.FC<Props> = ({
  user,
  jwt,
  transport,
  protocol,
}) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState<string | null>(
    sessionStorage.getItem("RoomName")
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);

  const connectionRef = useRef<HubConnection | null>(null);
  const { encryptMessage, decryptIfEncrypted } = useEncryption();
  const decryptRef = useRef(decryptIfEncrypted);

  useEffect(() => {
    decryptRef.current = decryptIfEncrypted;
  }, [decryptIfEncrypted]);

  // --- Hämta roomName om saknas ---
  useEffect(() => {
    if (!roomId || !jwt) return;
    if (roomName) return;

    const fetchRoomName = async () => {
      try {
        const token = jwt ?? sessionStorage.getItem("jwt");
        const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch room (${res.status})`);
        const data = await res.json();
        if (data?.room) {
          setRoomName(data.room);
          sessionStorage.setItem("RoomName", data.room);
        }
      } catch (err) {
        console.error("Failed to fetch room name:", err);
        toast.error("Failed to load room");
      }
    };

    fetchRoomName();
  }, [roomId, jwt, roomName]);

  // --- Connect to Private Hub ---
  useEffect(() => {
    if (!roomName || !jwt) return;

    const hubProtocol =
      protocol === "msgpack"
        ? new MessagePackHubProtocol()
        : new JsonHubProtocol();

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/privatechathub`, {
        transport,
        accessTokenFactory: () => jwt,
      })
      .withHubProtocol(hubProtocol)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    connectionRef.current = conn;

    conn.on("ReceiveMessage", async (sender: string, msg: string) => {
      const displayed = await decryptRef.current(msg).catch(() => msg);
      setMessages((prev) => [
        ...prev,
        {
          user: DOMPurify.sanitize(sender),
          text: DOMPurify.sanitize(displayed),
        },
      ]);
    });

    conn.on(
      "RoomHistory",
      async (_roomKey, msgs: { username: string; message: string }[]) => {
        if (_roomKey === roomName) {
          const hist: ChatMessage[] = await Promise.all(
            msgs.map(async (m) => ({
              user: DOMPurify.sanitize(m.username),
              text: DOMPurify.sanitize(
                await decryptRef.current(m.message).catch(() => m.message)
              ),
            }))
          );
          setMessages(hist);
        }
      }
    );

    conn.onclose((err) => {
      console.error("Hub closed:", err);
      toast.error("Connection closed. Please refresh or rejoin the room.");
      setIsConnected(false);
      setJoinedRoom(false);
    });

    conn.onreconnecting((err) => {
      console.warn("Hub reconnecting:", err);
      toast.warning("Reconnecting to room...");
      setIsConnected(false);
      setJoinedRoom(false);
    });

    conn.onreconnected(() => {
      toast.success("Reconnected!");
      conn
        .invoke("JoinRoom", roomName)
        .then(() => setJoinedRoom(true))
        .catch(console.error);
      setIsConnected(true);
    });

    const startConnection = async () => {
      try {
        await conn.start();
        setIsConnected(true);
        await conn.invoke("JoinRoom", roomName);
        setJoinedRoom(true);
        toast.success(`Joined room ${roomName}`);
      } catch (err) {
        console.error("Failed to connect or join room:", err);
        toast.error("Failed to connect to room. Make sure you are logged in.");
      }
    };

    startConnection();

    return () => {
      conn.stop().catch(() => {});
      setIsConnected(false);
      setJoinedRoom(false);
    };
  }, [roomName, jwt, transport, protocol]);

  const sendMessage = async () => {
    if (!isConnected || !joinedRoom) {
      toast.error("Not connected to room yet");
      return;
    }
    if (!message) return;

    const conn = connectionRef.current!;
    const encrypted = await encryptMessage(message).catch(() => message);

    try {
      await conn.invoke("SendMessageToRoom", roomName, encrypted);
      setMessage("");
    } catch (err) {
      console.error("SendMessageToRoom error:", err);
      toast.error("Failed to send message");
    }
  };

  const leaveRoom = async () => {
    const conn = connectionRef.current;
    if (!conn) return;

    try {
      await conn.invoke("LeaveRoom", roomName);
      if (conn.state === HubConnectionState.Connected) await conn.stop();
      navigate("/rooms");
    } catch (err) {
      console.error(err);
      toast.error("Failed to leave room");
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">{roomName ?? `Room ${roomId}`}</h2>
        <button className="btn btn-error btn-sm" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>
      <div className="flex-1 mb-2">
        <MessageList messages={messages} currentUser={user} />
      </div>
      <MessageComposer
        user={user}
        message={message}
        onChangeMessage={setMessage}
        onSend={sendMessage}
      />
      <ToastContainer />
    </div>
  );
};
