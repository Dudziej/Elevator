import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { ElevatorService } from '../elevator/elevator.service';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*' },
  path: '/socket.io',
})
export class ElevatorGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly svc: ElevatorService) {}

  onModuleInit() {
    const interval = this.svc['getState']().config.tickMs ?? 200;
    this.timer = setInterval(() => {
      try {
        const snapshot = this.svc.getState();
        this.server.emit('state', snapshot);
      } catch {
        // ignore pojedyncze błędy emisji
      }
    }, interval);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
