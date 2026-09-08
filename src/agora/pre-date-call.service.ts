import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InteractionRequest } from '../interactions/interaction.entity';

import { AgoraService } from './agora.service';
import { PreDateCall } from './pre-date-call.entity';

@Injectable()
export class PreDateCallService {
  constructor(
    @InjectRepository(PreDateCall)
    private readonly repo: Repository<PreDateCall>,
    @InjectRepository(InteractionRequest)
    private readonly reqRepo: Repository<InteractionRequest>,
    private readonly agora: AgoraService,
  ) {}

  private ensureParty(userId: string, req: InteractionRequest) {
    const ok = req.requester?.id === userId || req.recipient?.id === userId;
    if (!ok) throw new ForbiddenException('Not allowed.');
  }

  async ensureCreatedForConfirmedRequest(requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    if (!['CALL_READY', 'AWAITING_DECISIONS'].includes(req.status))
      throw new BadRequestException(
        'Call is available only after the coffee request is confirmed.',
      );
    if (req.expiresAt.getTime() <= Date.now())
      throw new BadRequestException('The coffee request window has expired.');

    const existing = await this.repo.findOne({
      where: { request: { id: requestId } },
    });
    if (existing) return existing;

    const channelName = `coffee_${requestId}`;
    return this.repo.save(
      this.repo.create({
        request: req,
        channelName,
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
        endsAt: null,
      }),
    );
  }

  async getToken(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForConfirmedRequest(requestId);
    if (
      call.status === 'COMPLETED' ||
      (call.endsAt && call.endsAt.getTime() <= Date.now())
    ) {
      throw new BadRequestException('The 60-second call has ended.');
    }
    const uid = req.requester.id === userId ? 1 : 2;

    return {
      appId: this.agora.getAppId(),
      channelName: call.channelName,
      uid,
      token: this.agora.generateRtcToken(call.channelName, uid),
      durationSec: 60,
      startedAt: call.startedAt,
      endsAt: call.endsAt,
    };
  }

  async markStarted(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForConfirmedRequest(requestId);
    if (call.status === 'PENDING') {
      call.status = 'IN_PROGRESS';
      call.startedAt = new Date();
      call.endsAt = new Date(call.startedAt.getTime() + 60_000);
      call.completedAt = null;
      await this.repo.save(call);
    }
    if (call.endsAt && call.endsAt.getTime() <= Date.now()) {
      call.status = 'COMPLETED';
      call.completedAt = call.endsAt;
      await this.repo.save(call);
    }

    return {
      status: call.status,
      startedAt: call.startedAt,
      endsAt: call.endsAt,
      durationSec: 60,
    };
  }

  async markCompleted(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForConfirmedRequest(requestId);

    call.status = 'COMPLETED';
    call.completedAt =
      call.endsAt && call.endsAt < new Date() ? call.endsAt : new Date();
    await this.repo.save(call);

    return { status: call.status, completedAt: call.completedAt };
  }
}
