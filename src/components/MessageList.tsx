import React from "react";

export type ChatMessage = {
  user: string;
  text: string;
  time?: string;
};

type Props = {
  messages: ChatMessage[];
  currentUser: string;
};

export const MessageList: React.FC<Props> = ({ messages, currentUser }) => {
  return (
    <div className="overflow-auto max-h-96 space-y-1 flex flex-col">
      {messages.map((m, idx) => (
        <div
          key={idx}
          className={`p-1 rounded max-w-xs break-words ${
            m.user === currentUser
              ? "bg-blue-100 self-end"
              : "bg-gray-200 self-start"
          }`}
        >
          <div className="flex justify-between items-baseline">
            <strong>{m.user}</strong>
            {m.time && (
              <span className="text-xs text-gray-500 ml-2">{m.time}</span>
            )}
          </div>
          <div>{m.text}</div>
        </div>
      ))}
    </div>
  );
};
