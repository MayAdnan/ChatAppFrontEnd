import React, { useState } from "react";
import { toast } from "react-toastify";
const API_BASE = import.meta.env.VITE_API_BASE;

type Props = {
  onAuthSuccess: (token: string, username: string) => void;
};

export const LoginForm: React.FC<Props> = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const submit = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, Password: password }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      onAuthSuccess(data.token, username);
    } catch {
      toast.error("Login failed");
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <input
        className="input input-bordered"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="input input-bordered"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" onClick={submit}>
        Login
      </button>
    </div>
  );
};
