import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LobbyPage } from "./components/LobbyPage";
import { RoomPage } from "./components/RoomPage";
import { HttpTransportType } from "@microsoft/signalr";

export const App: React.FC = () => {
  // jwt kan vara null om inte inloggad
  const [jwt, setJwt] = useState<string | null>(() =>
    sessionStorage.getItem("jwt")
  );
  const [user, setUser] = useState<string>(
    () => sessionStorage.getItem("username") ?? ""
  );
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    // Om en JWT finns => inte guest
    return !sessionStorage.getItem("jwt");
  });

  // Transport & protocol för SignalR
  const transport: HttpTransportType = HttpTransportType.WebSockets;
  const protocol: "json" | "msgpack" = "json";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      sessionStorage.setItem("jwt", token);
      setJwt(token);
      setIsGuest(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (jwt) {
      sessionStorage.setItem("jwt", jwt);
      setIsGuest(false);
    } else {
      sessionStorage.removeItem("jwt");
    }
  }, [jwt]);

  // När username ändras, spara i sessionStorage
  useEffect(() => {
    if (user) sessionStorage.setItem("username", user);
    else sessionStorage.removeItem("username");
  }, [user]);

  const handleLogout = () => {
    setJwt(null);
    setUser("");
    setIsGuest(true);
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("username");
  };

  return (
    <Router>
      <nav className="bg-primary text-white h-12 flex items-center justify-between px-4">
        <span className="font-bold text-lg">My Chat</span>
        {jwt && (
          <button
            onClick={handleLogout}
            className="bg-white text-primary px-2 py-1 rounded text-sm cursor-pointer"
          >
            Logout
          </button>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <LobbyPage
              user={user}
              setUser={setUser}
              jwt={jwt ?? ""}
              setJwt={(t: string) => setJwt(t)}
              isGuest={isGuest}
              setIsGuest={setIsGuest}
              transport={transport}
              protocol={protocol}
            />
          }
        />

        <Route
          path="/room/:roomName"
          element={
            jwt ? (
              <RoomPage
                user={user}
                jwt={jwt!}
                transport={transport}
                protocol={protocol}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};
