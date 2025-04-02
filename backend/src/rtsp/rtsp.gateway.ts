import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

@WebSocketGateway({ cors: true })
export class RtspGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private activeProcess: ChildProcess | null = null;
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 5000; // 5 seconds delay between retries

  handleConnection(client: Socket) {
    console.log(`🟢 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔴 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('startStream')
  async handleStartStream(client: Socket) {
    if (this.activeProcess) {
      client.emit('streamStatus', {
        message: 'Stream already running',
        status: 'active',
      });
      return;
    }

    const RTSP_URL = process.env.RTSP_URL;
    if (!RTSP_URL) {
      client.emit('streamStatus', {
        message: 'RTSP URL not provided',
        status: 'error',
      });
      return;
    }

    console.log('🔄 Checking RTSP camera availability...');

    // Pass the client to checkRtspStream
    const isAvailable = await this.checkRtspStream(RTSP_URL, client);
    if (!isAvailable) {
      client.emit('streamStatus', {
        message: 'Unable to connect to RTSP camera',
        status: 'error',
      });
      return;
    }

    console.log('🔄 Starting FFmpeg stream...');
    this.activeProcess = spawn('ffmpeg', [
      '-rtsp_transport',
      'tcp',
      '-i',
      RTSP_URL,
      '-vf',
      'scale=640:360',
      '-f',
      'mjpeg',
      'pipe:1',
      '-loglevel',
      'error',
    ]);

    if (this.activeProcess) {
      this.activeProcess.stdout?.on('data', (chunk: Buffer) => {
        client.emit('frame', chunk.toString('base64')); // Send frame as base64
      });

      this.activeProcess.on('error', (err) => {
        console.error('❌ FFmpeg error:', err);
        client.emit('streamStatus', {
          message: 'Stream failed',
          status: 'error',
        });
        this.activeProcess = null;
      });

      this.activeProcess.on('close', (code) => {
        console.log(`⚠️ FFmpeg exited with code ${code}`);
        this.activeProcess = null;
        client.emit('streamStatus', {
          message: 'Stream stopped',
          status: 'inactive',
        });
      });
    }

    client.emit('streamStatus', {
      message: 'Stream started',
      status: 'active',
    });
  }

  @SubscribeMessage('stopStream')
  handleStopStream(client: Socket) {
    if (this.activeProcess) {
      console.log('🛑 Stopping FFmpeg...');
      this.activeProcess.kill('SIGKILL');
      this.activeProcess = null;
      client.emit('streamStatus', {
        message: 'Stream stopped',
        status: 'inactive',
      });
    } else {
      client.emit('streamStatus', {
        message: 'No stream running',
        status: 'inactive',
      });
    }
  }

  // Function to check if RTSP stream is available
  private checkRtspStream(url: string, client: Socket): Promise<boolean> {
    return new Promise((resolve) => {
      let retries = 0;

      const tryConnect = () => {
        exec(
          `ffprobe -v error -i ${url}`,
          { timeout: 10000 },
          (error, stdout, stderr) => {
            if (error) {
              console.error(
                `❌ Error checking RTSP stream: ${stderr || error.message}`,
              );
              retries++;
              if (retries <= this.MAX_RETRIES) {
                // Send retry message to the client
                client.emit('streamStatus', {
                  message: `Retrying... Attempt ${retries}/${this.MAX_RETRIES}`,
                  status: 'retrying',
                });
                setTimeout(tryConnect, this.RETRY_DELAY);
              } else {
                resolve(false);
              }
            } else {
              console.log('✅ RTSP stream is available');
              resolve(true);
            }
          },
        );
      };

      tryConnect();
    });
  }
}
