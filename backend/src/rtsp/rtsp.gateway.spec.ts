import { Test, TestingModule } from '@nestjs/testing';
import { RtspGateway } from './rtsp.gateway';

describe('RtspGateway', () => {
  let gateway: RtspGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RtspGateway],
    }).compile();

    gateway = module.get<RtspGateway>(RtspGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
