import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionRequest } from './interaction.entity';
import { InteractionProposal } from './proposal.entity';
import { RestaurantOption } from './restaurant-option.entity';
import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';
import { GooglePlacesService } from './google-places.service';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(InteractionRequest)
    private readonly reqRepo: Repository<InteractionRequest>,
    @InjectRepository(InteractionProposal)
    private readonly propRepo: Repository<InteractionProposal>,
    @InjectRepository(RestaurantOption)
    private readonly optRepo: Repository<RestaurantOption>,
    @InjectRepository(Reel) private readonly reelRepo: Repository<Reel>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly places: GooglePlacesService,
  ) {}

  private midpoint(aLat: number, aLng: number, bLat: number, bLng: number) {
    return { lat: (aLat + bLat) / 2, lng: (aLng + bLng) / 2 };
  }

  private ensureParty(userId: string, req: InteractionRequest) {
    const ok = req.requester?.id === userId || req.recipient?.id === userId;
    if (!ok) throw new ForbiddenException('Not allowed.');
  }

  async createDateRequest(
    actorId: string,
    reelId: string,
    proposedStartAt: string,
    durationSec?: number,
  ) {
    const actor = await this.userRepo.findOne({ where: { id: actorId } });
    if (!actor) throw new BadRequestException('User not found.');

    const reel = await this.reelRepo.findOne({
      where: { id: reelId },
      relations: ['user'],
    });
    if (!reel) throw new NotFoundException('Reel not found.');

    const recipientId = (reel as any).user?.id;
    const recipient = await this.userRepo.findOne({
      where: { id: recipientId },
    });
    if (!recipient) throw new BadRequestException('Recipient not found.');
    if (recipient.id === actor.id)
      throw new BadRequestException('You cannot request yourself.');

    const startAt = new Date(proposedStartAt);
    if (Number.isNaN(startAt.getTime()))
      throw new BadRequestException('Invalid proposedStartAt.');

    // Optional: prevent spamming multiple pending requests for same reel
    const existing = await this.reqRepo.findOne({
      where: {
        reel: { id: reelId } as any,
        requester: { id: actorId } as any,
        status: 'PENDING' as any,
      } as any,
    });
    if (existing)
      throw new BadRequestException('A pending request already exists.');

    const dur = durationSec ?? 5400; // 90 min default

    const req = await this.reqRepo.save(
      this.reqRepo.create({
        status: 'PENDING',
        requester: actor as any,
        recipient: recipient as any,
        reel: reel as any,
        acceptedStartAt: null,
        acceptedDurationSec: null,
        chosenRestaurantOption: null,
      }),
    );

    const proposal = await this.propRepo.save(
      this.propRepo.create({
        request: req as any,
        proposer: actor as any,
        proposedStartAt: startAt,
        durationSec: dur,
        status: 'PENDING',
      }),
    );

    // Google restaurants near midpoint
    const mid = this.midpoint(
      actor.lat,
      actor.lng,
      recipient.lat,
      recipient.lng,
    );
    const { items, availabilityMode } = await this.places.nearbyRestaurants(
      mid.lat,
      mid.lng,
      proposedStartAt,
    );

    const options = await this.optRepo.save(
      items.map((r) =>
        this.optRepo.create({
          proposal: proposal as any,
          googlePlaceId: r.googlePlaceId,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          openAtProposedTime: r.openAtProposedTime,
        }),
      ),
    );

    return {
      requestId: req.id,
      status: req.status,
      availabilityMode,
      proposal: {
        id: proposal.id,
        proposedStartAt: proposal.proposedStartAt,
        durationSec: proposal.durationSec,
        restaurantOptions: options,
      },
      recipient: {
        id: recipient.id,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        gender: recipient.gender,
      },
    };
  }

  async listInbox(userId: string) {
    const items = await this.reqRepo.find({
      where: { recipient: { id: userId } } as any,
      relations: ['requester', 'recipient', 'reel'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return items.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      requester: {
        id: r.requester.id,
        firstName: r.requester.firstName,
        lastName: r.requester.lastName,
        gender: r.requester.gender,
      },
      reelId: (r.reel as any).id,
    }));
  }

  async listOutbox(userId: string) {
    const items = await this.reqRepo.find({
      where: { requester: { id: userId } } as any,
      relations: ['requester', 'recipient', 'reel'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return items.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      recipient: {
        id: r.recipient.id,
        firstName: r.recipient.firstName,
        lastName: r.recipient.lastName,
        gender: r.recipient.gender,
      },
      reelId: (r.reel as any).id,
    }));
  }

  async getRequest(userId: string, requestId: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: [
        'requester',
        'recipient',
        'reel',
        'proposals',
        'proposals.proposer',
        'proposals.restaurantOptions',
        'chosenRestaurantOption',
      ],
    });

    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    const proposals = (req.proposals || []).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return {
      id: req.id,
      status: req.status,
      acceptedStartAt: req.acceptedStartAt,
      acceptedDurationSec: req.acceptedDurationSec,
      chosenRestaurantOption: req.chosenRestaurantOption,
      requester: {
        id: req.requester.id,
        firstName: req.requester.firstName,
        lastName: req.requester.lastName,
        gender: req.requester.gender,
      },
      recipient: {
        id: req.recipient.id,
        firstName: req.recipient.firstName,
        lastName: req.recipient.lastName,
        gender: req.recipient.gender,
      },
      reelId: (req.reel as any).id,
      proposals: proposals.map((p) => ({
        id: p.id,
        status: p.status,
        proposedStartAt: p.proposedStartAt,
        durationSec: p.durationSec,
        proposer: {
          id: p.proposer.id,
          firstName: p.proposer.firstName,
          lastName: p.proposer.lastName,
        },
        restaurantOptions: p.restaurantOptions,
      })),
    };
  }

  async respond(
    userId: string,
    requestId: string,
    body: {
      action: 'ACCEPT' | 'REJECT' | 'COUNTER';
      chosenRestaurantOptionId?: string;
      proposedStartAt?: string;
      durationSec?: number;
    },
  ) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: [
        'requester',
        'recipient',
        'proposals',
        'proposals.proposer',
        'proposals.restaurantOptions',
      ],
    });

    if (!req) throw new NotFoundException('Request not found.');
    this.ensureParty(userId, req);

    if (
      req.status === 'ACCEPTED' ||
      req.status === 'REJECTED' ||
      req.status === 'CANCELLED'
    ) {
      throw new BadRequestException('Request is closed.');
    }

    const latest = (req.proposals || [])
      .filter((p) => p.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!latest) throw new BadRequestException('No active proposal found.');

    // Only the other party responds
    if (latest.proposer.id === userId)
      throw new BadRequestException('Wait for the other user to respond.');

    if (body.action === 'REJECT') {
      latest.status = 'REJECTED';
      await this.propRepo.save(latest);

      req.status = 'REJECTED';
      await this.reqRepo.save(req);

      return { message: 'Request rejected.', status: req.status };
    }

    if (body.action === 'ACCEPT') {
      if (!body.chosenRestaurantOptionId)
        throw new BadRequestException('chosenRestaurantOptionId is required.');

      const option = latest.restaurantOptions?.find(
        (o) => o.id === body.chosenRestaurantOptionId,
      );
      if (!option) throw new BadRequestException('Invalid restaurant option.');

      latest.status = 'ACCEPTED';
      await this.propRepo.save(latest);

      req.status = 'ACCEPTED';
      req.acceptedStartAt = latest.proposedStartAt;
      req.acceptedDurationSec = latest.durationSec;
      req.chosenRestaurantOption = option as any;

      await this.reqRepo.save(req);

      return {
        message: 'Request accepted.',
        status: req.status,
        acceptedStartAt: req.acceptedStartAt,
        acceptedDurationSec: req.acceptedDurationSec,
        chosenRestaurantOption: option,
      };
    }

    // COUNTER
    if (!body.proposedStartAt)
      throw new BadRequestException('proposedStartAt is required for COUNTER.');
    const startAt = new Date(body.proposedStartAt);
    if (Number.isNaN(startAt.getTime()))
      throw new BadRequestException('Invalid proposedStartAt.');

    // supersede old proposal
    latest.status = 'SUPERSEDED';
    await this.propRepo.save(latest);

    const proposer = await this.userRepo.findOne({ where: { id: userId } });
    if (!proposer) throw new BadRequestException('User not found.');

    const duration = body.durationSec ?? latest.durationSec ?? 5400;

    const newProposal = await this.propRepo.save(
      this.propRepo.create({
        request: req as any,
        proposer: proposer as any,
        proposedStartAt: startAt,
        durationSec: duration,
        status: 'PENDING',
      }),
    );

    // Re-generate restaurants from Google for the counter time
    const requester = await this.userRepo.findOne({
      where: { id: req.requester.id },
    });
    const recipient = await this.userRepo.findOne({
      where: { id: req.recipient.id },
    });
    if (!requester || !recipient)
      throw new BadRequestException('Users missing.');

    const mid = this.midpoint(
      requester.lat,
      requester.lng,
      recipient.lat,
      recipient.lng,
    );
    const { items, availabilityMode } = await this.places.nearbyRestaurants(
      mid.lat,
      mid.lng,
      body.proposedStartAt,
    );

    const options = await this.optRepo.save(
      items.map((r) =>
        this.optRepo.create({
          proposal: newProposal as any,
          googlePlaceId: r.googlePlaceId,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          openAtProposedTime: r.openAtProposedTime,
        }),
      ),
    );

    req.status = 'NEGOTIATING';
    await this.reqRepo.save(req);

    return {
      message: 'Counter proposal sent.',
      status: req.status,
      availabilityMode,
      proposal: {
        id: newProposal.id,
        proposedStartAt: newProposal.proposedStartAt,
        durationSec: newProposal.durationSec,
        restaurantOptions: options,
      },
    };
  }
}
