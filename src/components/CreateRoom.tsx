import React, { useState } from "react";
import { toast } from "react-toastify";
const API_BASE = import.meta.env.VITE_API_BASE;

type Props = {
  jwt: string;
  onCreated: (roomName: string) => void;
};

export const CreateRoom: React.FC<Props> = ({ jwt, onCreated }) => {
  const [room, setRoom] = useState<string>("");

  const create = async () => {
    const trimmedRoom = room.trim();
    if (!trimmedRoom) return;

    try {
      const res = await fetch(`${API_BASE}/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          Room: trimmedRoom,
          Description: "",
          IsPrivate: true, // alltid privat
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const data = await res.json();
      onCreated(data.Room); // skicka tillbaka rumsnamn
      setRoom("");
      toast.success(`Room "${data.Room}" created!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create room");
    }
  };

  return (
    <div className="mt-2 flex space-x-2">
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
