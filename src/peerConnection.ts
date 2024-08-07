import Peer, { DataConnection, PeerError } from "peerjs";

let peer: Peer | undefined;

export const initializePeer = (
  id: string,
  onConnection: (connection: DataConnection) => void
): Promise<Peer> => {
  return new Promise((resolve, reject) => {
    if (peer) {
      peer.destroy();
    }

    peer = new Peer(id, { host: "localhost", port: 9000, path: "/" });

    peer.on("open", () => {
      if (peer) {
        peer.on("connection", onConnection);
        resolve(peer);
      } else {
        reject(new Error("Peer instance is undefined after creation"));
      }
    });

    peer.on("error", (err: PeerError<string>) => reject(err));
  });
};

export const connectToPeer = (id: string): Promise<DataConnection> => {
  return new Promise((resolve, reject) => {
    if (!peer) {
      reject(new Error("Peer instance is not initialized"));
      return;
    }
    const connection = peer.connect(id);
    connection.on("open", () => resolve(connection));
    connection.on("error", (err: PeerError<string>) => reject(err));
  });
};

export const sendFile = (
  connection: DataConnection,
  file: File,
  fileData: Uint8Array
) => {
  if (!connection) {
    throw new Error("Connection is undefined");
  }
  connection.send({
    file: { name: file.name, size: file.size, type: file.type, data: fileData },
  });
};

export const onData = (
  connection: DataConnection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (data: any) => void
) => {
  if (!connection) {
    throw new Error("Connection is undefined");
  }
  connection.on("data", onMessage);
};
