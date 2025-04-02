import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtspGateway } from './rtsp/rtsp.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, RtspGateway],
})
export class AppModule {}
