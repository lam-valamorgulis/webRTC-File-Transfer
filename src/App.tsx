import React, { useCallback, useEffect, useState } from "react";
import {
  connectToPeer,
  initializePeer,
  onData,
  sendFile,
} from "./peerConnection";

interface FileData {
  name: string;
  size: number;
  type: string;
  data: Uint8Array;
}

interface IncomingData {
  file?: FileData;
}

const readFileAsync = (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const App: React.FC = () => {
  const [peerId, setPeerId] = useState<string>("");
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [sentFiles, setSentFiles] = useState<string[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<FileData[]>([]);
  const [fileURLs, setFileURLs] = useState<Record<string, string>>({});

  const handlePeerIdChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setPeerId(event.target.value);

  const handleRemotePeerIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => setRemotePeerId(event.target.value);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setFile(file);
  };

  const handleIncomingData = useCallback((data: IncomingData) => {
    if (data.file) {
      setMessage("File received!");
      setReceivedFiles((prevFiles) => {
        return data.file ? [...prevFiles, data.file] : prevFiles;
      });
    }
  }, []);

  const startConnection = async () => {
    try {
      await initializePeer(peerId, (connection) => {
        onData(connection, handleIncomingData);
      });
      setIsInitialized(true);
      setMessage("Peer initialized successfully!");
    } catch (error) {
      console.error("Error initializing peer:", error);
      setMessage("Error initializing peer. Please try again.");
    }
  };

  const sendFileToPeer = async () => {
    if (!isInitialized) {
      setMessage("Peer not initialized. Please start the connection first.");
      return;
    }

    if (!file) {
      setMessage("Please select a file to send.");
      return;
    }

    try {
      const connection = await connectToPeer(remotePeerId);
      if (file) {
        const fileData = await readFileAsync(file);
        sendFile(connection, file, fileData);
        setSentFiles((prevFiles) => [...prevFiles, file.name]);
        setMessage("File sent successfully!");
      }
    } catch (error) {
      console.error("Error connecting to peer:", error);
      setMessage(
        "Error connecting to peer. Please check the remote Peer ID and try again."
      );
    }
  };

  // Use useMemo to avoid creating URLs on every render
  const createDownloadUrl = useCallback((fileData: FileData) => {
    const blob = new Blob([fileData.data], { type: fileData.type });
    const url = URL.createObjectURL(blob);
    setFileURLs((prev) => ({ ...prev, [fileData.name]: url }));
    return url;
  }, []);

  useEffect(() => {
    // Cleanup file URLs
    return () => {
      Object.values(fileURLs).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileURLs]);

  useEffect(() => {
    // Cleanup for received files to avoid too many renders
    setFileURLs((prevURLs) => {
      const newURLs = { ...prevURLs };
      receivedFiles.forEach((fileData) => {
        if (!newURLs[fileData.name]) {
          const url = createDownloadUrl(fileData);
          newURLs[fileData.name] = url;
        }
      });
      return newURLs;
    });
  }, [receivedFiles, createDownloadUrl]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          WebRTC File Transfer
        </h1>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Your Peer ID
          </h2>
          <input
            type="text"
            value={peerId}
            onChange={handlePeerIdChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Peer ID"
          />
          <button
            onClick={startConnection}
            disabled={isInitialized}
            className={`mt-4 px-4 py-2 rounded-lg font-semibold text-white ${
              isInitialized
                ? "bg-green-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isInitialized ? "Connected" : "Start Connection"}
          </button>
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Send File
          </h2>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full mb-4 text-sm text-gray-500 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-lg file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <input
            type="text"
            placeholder="Remote Peer ID"
            value={remotePeerId}
            onChange={handleRemotePeerIdChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendFileToPeer}
            disabled={!isInitialized}
            className={`mt-4 px-4 py-2 rounded-lg font-semibold text-white ${
              !isInitialized
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            Send File
          </button>
        </div>
        {message && <p className="text-lg text-red-600 mb-4">{message}</p>}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Sent Files
          </h2>
          {sentFiles.length > 0 ? (
            <ul className="list-disc pl-5 text-gray-700">
              {sentFiles.map((fileName, index) => (
                <li key={index} className="mb-1">
                  {fileName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No files sent yet.</p>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Received Files
          </h2>
          {receivedFiles.length > 0 ? (
            <ul className="list-disc pl-5 text-gray-700">
              {receivedFiles.map((fileData, index) => (
                <li key={index} className="mb-1">
                  {fileData.name}
                  <a
                    href={fileURLs[fileData.name] || "#"}
                    download={fileData.name}
                    className="ml-4 px-2 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No files received yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
