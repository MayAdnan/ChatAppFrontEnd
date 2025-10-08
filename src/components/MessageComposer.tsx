import React from "react";

type Props = {
  user: string;
  message: string;
  onChangeMessage: (msg: string) => void;
  onSend: () => void;
};

export const MessageComposer: React.FC<Props> = ({
  message,
  onChangeMessage,
  onSend,
}) => {
  return (
    <div className="flex space-x-2">
      <input
        type="text"
        className="input input-bordered flex-1"
        value={message}
        onChange={(e) => onChangeMessage(e.target.value)}
        placeholder="Type a message..."
        onKeyDown={(e) => e.key === "Enter" && onSend()}
      />
      <button className="btn btn-primary" onClick={onSend}>
        Send
      </button>
    </div>
  );
};
