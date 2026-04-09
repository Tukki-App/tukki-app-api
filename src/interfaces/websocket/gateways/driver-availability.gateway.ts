import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { UpdateDriverAvailabilityUseCase } from '../../../application/use-cases/update-driver-availability.use-case';
import { UpdateAvailabilityDto } from '../../../application/use-cases/dtos/update-availability.dto';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/availability' })
export class DriverAvailabilityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DriverAvailabilityGateway.name);

  constructor(
    private readonly updateDriverAvailabilityUseCase: UpdateDriverAvailabilityUseCase,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('driver:availability')
  async handleAvailabilityUpdate(
    @MessageBody() payload: { driverId: string } & UpdateAvailabilityDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { driverId, isOnline } = payload;

    const availability = await this.updateDriverAvailabilityUseCase.execute(driverId, { isOnline });

    this.server.emit('availability:updated', {
      driverId,
      isOnline: availability.isOnline,
      lastSeen: availability.lastSeen,
    });

    return { success: true, isOnline: availability.isOnline };
  }
}
