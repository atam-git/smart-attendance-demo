# RTSP Live Streaming App

## Overview

This project enables live streaming from an RTSP camera using a backend (Node.js with Express and FFmpeg) and a frontend (React with Vite).

## Features

- Connect and disconnect an RTSP camera.
- Start and stop live streaming.
- Live status updates using Server-Sent Events (SSE).
- Frontend built with React and Vite.

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [FFmpeg](https://ffmpeg.org/download.html)

## Installation

### 1. Clone the Repository

```sh
git clone https://github.com/your-repo.git
cd your-repo
```

### 2. Setup Backend

```sh
cd backend
npm install
```

Create a `.env` file in the `backend` directory and add:

```env
PORT=8081
RTSP_URL=rtsp://your-camera-url
```

### 3. Setup Frontend

```sh
cd ../frontend
npm install
```

## Running the Project

### Start Backend

```sh
cd backend
node server.js
```

### Start Frontend

```sh
cd frontend
npm run dev
```

## Usage

1. Open `http://localhost:5173` in your browser.
2. Click **Connect Camera** to establish an RTSP connection.
3. Click **Start Stream** to begin streaming.
4. Click **Stop Stream** to pause the stream.
5. Click **Disconnect Camera** to close the connection.

## Troubleshooting

- If the stream does not start, verify the `RTSP_URL` in your `.env` file.
- Ensure FFmpeg is installed and available in your system's PATH.
- Check logs in the terminal for any errors.

## License

This project is open-source and free to use.
