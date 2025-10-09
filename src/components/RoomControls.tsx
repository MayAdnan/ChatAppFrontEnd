import React from "react";

type Props = {
  room: string;
  onChangeRoom: (room: string) => void;
  onJoin: () => void;
  onLeave: () => void;
};

export const RoomControls: React.FC<Props> = ({
  room,
  onChangeRoom,
  onJoin,
  onLeave,
}) => {
  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Room name"
        value={room}
        onChange={(e) => onChangeRoom(e.target.value)}
        className="input input-bordered w-full"
      />
      <div className="flex space-x-2">
        <button className="btn btn-success flex-1" onClick={onJoin}>
          Join
        </button>
        <button className="btn btn-error flex-1" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  );
};
