import { Injectable } from '@nestjs/common';

@Injectable()
export class ElevatorService {
  getPing() {
    return { ok: true };
  }
}
