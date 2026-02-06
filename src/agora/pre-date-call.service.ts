import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionRequest } from '../interactions/interaction.entity';
import { PreDateCall } from './pre-date-call.entity';
import { AgoraService } from './agora.service';

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

  async ensureCreatedForAcceptedRequest(requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    if (req.status !== 'ACCEPTED')
      throw new BadRequestException(
        'Call can be created only after acceptance.',
      );

    const existing = await this.repo.findOne({
      where: { request: { id: requestId } as any } as any,
    });
    if (existing) return existing;

    const channelName = `date_${requestId}`;
    return this.repo.save(
      this.repo.create({
        request: req as any,
        channelName,
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
      }),
    );
  }

  async getToken(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForAcceptedRequest(requestId);

    // simple uid mapping for MVP (stable per user)
    // You can store numeric agoraUid later if you want
    const uid = Math.abs(hashToInt(userId)) % 1000000000;

    return {
      channelName: call.channelName,
      uid,
      token: this.agora.generateRtcToken(call.channelName, uid),
    };
  }

  async markStarted(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForAcceptedRequest(requestId);
    if (call.status === 'COMPLETED') return { status: call.status };

    call.status = 'IN_PROGRESS';
    call.startedAt = call.startedAt ?? new Date();
    await this.repo.save(call);

    return { status: call.status, startedAt: call.startedAt };
  }

  async markCompleted(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: ['requester', 'recipient'],
    });
    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const call = await this.ensureCreatedForAcceptedRequest(requestId);

    call.status = 'COMPLETED';
    call.completedAt = new Date();
    await this.repo.save(call);

    return { status: call.status, completedAt: call.completedAt };
  }
}

function hashToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
