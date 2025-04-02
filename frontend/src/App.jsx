import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:8081");

export default function RTSPStream() {
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("Status: Not Connected");
  const [frame, setFrame] = useState(null);
  const [connectionFailed, setConnectionFailed] = useState(false); // Track if connection failed
  const [loading, setLoading] = useState(false); // Track loading state

  useEffect(() => {
    socket.on("streamStatus", (data) => {
      console.log("Status Update:", data);
      setStatus(`Status: ${data.message}`);

      if (data.status === "active") {
        setStreaming(true);
        setLoading(false); // Stop loading once stream is active
        setConnectionFailed(false); // Reset connection failed state
      }

      if (data.status === "inactive" || data.status === "error") {
        setStreaming(false);
        setLoading(false); // Stop loading if connection fails
        if (data.status === "error") {
          setConnectionFailed(true); // Mark connection as failed
        }
      }

      if (data.status === "retrying") {
        setLoading(true); // Keep loading if retrying
      }
    });

    socket.on("frame", (data) => {
      setFrame(`data:image/jpeg;base64,${data}`);
    });

    return () => {
      socket.off("streamStatus");
      socket.off("frame");
    };
  }, []);

  return (
    <div className="flex flex-col items-center bg-gray-100 p-5">
      <h1 className="text-2xl font-bold">RTSP Live Stream</h1>
      <div className="my-4">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={() => {
            setLoading(true); // Set loading state when attempting to connect
            socket.emit("startStream");
            setConnected(true);
            setConnectionFailed(false); // Reset the failed state when trying to connect
          }}
          disabled={connected}
        >
          Connect Camera
        </button>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={() => {
            socket.emit("stopStream");
            setConnected(false);
            setConnectionFailed(false); // Reset the failed state when disconnecting
            setLoading(false); // Stop loading when disconnecting
          }}
          disabled={!connected}
        >
          Disconnect Camera
        </button>

        {/* Show retry button only after connection fails */}
        {connectionFailed && (
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded mx-2"
            onClick={() => {
              // Trigger retry logic manually
              socket.emit("startStream");
              setConnectionFailed(false); // Reset the failed state
              setLoading(true); // Start loading when retrying
            }}
          >
            Retry Connection
          </button>
        )}
      </div>

      <p className="text-lg font-semibold">{status}</p>

      {/* Display loading GIF when loading */}
      {loading && (
        <div className="my-4">
          <img src="/loading-gif.gif" alt="Loading..." className="w-12 h-12" />
        </div>
      )}

      {streaming && frame && (
        <div className="mt-4 border-2 border-black">
          <img src={frame} alt="Live Stream" className="w-[640px] h-[360px]" />
        </div>
      )}
    </div>
  );
}
