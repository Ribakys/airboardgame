import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";

import fileStorage from "./fileStorage.js";
import store from "./store.js";
import { defineSocket } from "./socket.js";

import { NeDBBackend, memoryBackend } from "./storeBackends.js";

import exec from "./exec.js";

import {
  HOST,
  PORT,
  API_URL,
  FILE_STORAGE,
  DISK_DESTINATION,
  S3_SECRET_KEY,
  S3_ACCESS_KEY,
  S3_BUCKET,
  S3_ENDPOINT,
  STORE_BACKEND,
  STORE_PREFIX,
  NEDB_BACKEND_DIRNAME,
} from "./settings.js";

const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileStorage({
    type: FILE_STORAGE,
    config: {
      url: API_URL,
      destination: DISK_DESTINATION,
      bucket: S3_BUCKET,
      endpoint: S3_ENDPOINT,
      accessKey: S3_ACCESS_KEY,
      secretKey: S3_SECRET_KEY,
    },
  })
);

let storeBackend;

switch (STORE_BACKEND) {
  case "nedb":
    storeBackend = NeDBBackend({ dirname: NEDB_BACKEND_DIRNAME });
    app.use(
      store({
        prefix: STORE_PREFIX,
        backend: storeBackend,
      })
    );
    break;
  default:
    storeBackend = memoryBackend();
    app.use(store({ prefix: STORE_PREFIX, backend: storeBackend }));
}

app.use(exec({ context: { store: storeBackend } }));

defineSocket(httpServer);

const __dirname = path.resolve();

// Serve statice file from frontend
app.use(express.static(path.join(__dirname, "./build")));

// Handles any requests that don't match the ones above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./build/index.html"));
});

httpServer.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`);
});