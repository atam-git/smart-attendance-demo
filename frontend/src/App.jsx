import { useState, useEffect, useCallback } from "react";

export default function RTSPStream() {
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("Status: Not Connected");
  const [eventSource, setEventSource] = useState(null);

  const closeEventSource = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  }, [eventSource]);

  const connectCamera = async () => {
    try {
      const response = await fetch("http://localhost:8081/start-stream");
      const data = await response.json();
      if (data.status === "active") {
        setStatus("Status: Camera Connected");
        setConnected(true);
        console.log("Camera Connected"); // Debugging Log
        listenForEvents();
      } else {
        setStatus("Status: Failed to Connect");
      }
    } catch (error) {
      setStatus("Status: Error Connecting Camera");
      console.error(error);
    }
  };

  const disconnectCamera = async () => {
    try {
      await fetch("http://localhost:8081/stop-stream");
      setStatus("Status: Camera Disconnected");
      setConnected(false);
      setStreaming(false);
      closeEventSource();
      console.log("Camera Disconnected"); // Debugging Log
    } catch (error) {
      console.error("Error disconnecting camera:", error);
    }
  };

  const listenForEvents = () => {
    closeEventSource();
    const source = new EventSource("http://localhost:8081/events");

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Event received:", data);
      if (data.status === "error") {
        setStatus("Status: Stream Failed!");
        setConnected(false);
        setStreaming(false);
        closeEventSource();
      }
    };

    source.onerror = () => {
      console.error("Event Source connection lost.");
      closeEventSource();
    };

    setEventSource(source);
  };

  useEffect(() => {
    return () => closeEventSource();
  }, [closeEventSource]);

  return (
    <div className="flex flex-col items-center bg-gray-100 p-5">
      <h1 className="text-2xl font-bold">RTSP Live Stream</h1>
      <div className="my-4">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={connectCamera}
          disabled={connected}
        >
          Connect Camera
        </button>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={disconnectCamera}
          disabled={!connected}
        >
          Disconnect Camera
        </button>
      </div>
      <p className="text-lg font-semibold">{status}</p>
      <div className="my-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={() => {
            setStreaming(true);
            console.log("Streaming Started"); // Debugging Log
          }}
          disabled={!connected || streaming}
        >
          Start Stream
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 mx-2"
          onClick={() => {
            setStreaming(false);
            console.log("Streaming Stopped"); // Debugging Log
          }}
          disabled={!connected || !streaming}
        >
          Stop Stream
        </button>
      </div>
      {streaming && (
        <div className="mt-4 border-2 border-black">
          <img
            src="http://localhost:8081/stream"
            alt="Live Stream"
            className="w-[640px] h-[360px]"
          />
        </div>
      )}
    </div>
  );
}
