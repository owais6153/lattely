import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { InteractionRequest } from './interaction.entity';
import { InteractionProposal } from './proposal.entity';
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

  private thirtyDaysAgo() {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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

    // Block if this requester was rejected by this same recipient in last 30 days
    const recentRejection = await this.reqRepo.findOne({
      where: {
        requester: { id: actor.id } as any,
        recipient: { id: recipient.id } as any,
        status: 'REJECTED' as any,
        rejectedAt: MoreThanOrEqual(this.thirtyDaysAgo()),
      } as any,
      order: { rejectedAt: 'DESC' as any },
    });

    if (recentRejection) {
      throw new BadRequestException(
        'You cannot request this user for 30 days due to a previous rejection.',
      );
    }

    // Prevent multiple open requests at once between same pair (optional but recommended)
    const openExisting = await this.reqRepo.findOne({
      where: {
        requester: { id: actor.id } as any,
        recipient: { id: recipient.id } as any,
        status: 'PENDING' as any,
      } as any,
    });
    if (openExisting)
      throw new BadRequestException(
        'You already have a pending request with this user.',
      );

    const dur = durationSec ?? 5400;

    const req = await this.reqRepo.save(
      this.reqRepo.create({
        status: 'PENDING',
        requester: actor as any,
        recipient: recipient as any,
        reel: reel as any,
        acceptedStartAt: null,
        acceptedDurationSec: null,
        acceptedGooglePlaceId: null,
        acceptedRestaurantName: null,
        acceptedRestaurantAddress: null,
        acceptedRestaurantLat: null,
        acceptedRestaurantLng: null,
        rejectedAt: null,
      }),
    );

    const mid = this.midpoint(
      actor.lat,
      actor.lng,
      recipient.lat,
      recipient.lng,
    );
    const { chosen, availabilityMode } = await this.places.pickOneRestaurant(
      mid.lat,
      mid.lng,
      proposedStartAt,
    );

    const proposal = await this.propRepo.save(
      this.propRepo.create({
        request: req as any,
        proposer: actor as any,
        proposedStartAt: startAt,
        durationSec: dur,
        status: 'PENDING',
        googlePlaceId: chosen.googlePlaceId,
        restaurantName: chosen.name,
        restaurantAddress: chosen.address,
        restaurantLat: chosen.lat,
        restaurantLng: chosen.lng,
        openAtProposedTime: chosen.openAtProposedTime,
      }),
    );

    return {
      requestId: req.id,
      status: req.status,
      availabilityMode,
      proposal: {
        id: proposal.id,
        proposedStartAt: proposal.proposedStartAt,
        durationSec: proposal.durationSec,
        restaurant: {
          googlePlaceId: proposal.googlePlaceId,
          name: proposal.restaurantName,
          address: proposal.restaurantAddress,
          lat: proposal.restaurantLat,
          lng: proposal.restaurantLng,
          openAtProposedTime: proposal.openAtProposedTime,
        },
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
      acceptedRestaurant: req.acceptedGooglePlaceId
        ? {
            googlePlaceId: req.acceptedGooglePlaceId,
            name: req.acceptedRestaurantName,
            address: req.acceptedRestaurantAddress,
            lat: req.acceptedRestaurantLat,
            lng: req.acceptedRestaurantLng,
          }
        : null,
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
        restaurant: {
          googlePlaceId: p.googlePlaceId,
          name: p.restaurantName,
          address: p.restaurantAddress,
          lat: p.restaurantLat,
          lng: p.restaurantLng,
          openAtProposedTime: p.openAtProposedTime,
        },
      })),
    };
  }

  async respond(
    userId: string,
    requestId: string,
    body: {
      action: 'ACCEPT' | 'REJECT' | 'COUNTER';
      proposedStartAt?: string;
      durationSec?: number;
    },
  ) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId } as any,
      relations: ['requester', 'recipient', 'proposals', 'proposals.proposer'],
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
      req.rejectedAt = new Date();
      await this.reqRepo.save(req);

      return { message: 'Request rejected.', status: req.status };
    }

    if (body.action === 'ACCEPT') {
      latest.status = 'ACCEPTED';
      await this.propRepo.save(latest);

      req.status = 'ACCEPTED';
      req.acceptedStartAt = latest.proposedStartAt;
      req.acceptedDurationSec = latest.durationSec;

      req.acceptedGooglePlaceId = latest.googlePlaceId;
      req.acceptedRestaurantName = latest.restaurantName;
      req.acceptedRestaurantAddress = latest.restaurantAddress;
      req.acceptedRestaurantLat = latest.restaurantLat;
      req.acceptedRestaurantLng = latest.restaurantLng;

      await this.reqRepo.save(req);

      return {
        message: 'Request accepted.',
        status: req.status,
        acceptedStartAt: req.acceptedStartAt,
        acceptedDurationSec: req.acceptedDurationSec,
        restaurant: {
          googlePlaceId: req.acceptedGooglePlaceId,
          name: req.acceptedRestaurantName,
          address: req.acceptedRestaurantAddress,
          lat: req.acceptedRestaurantLat,
          lng: req.acceptedRestaurantLng,
        },
      };
    }

    // COUNTER
    if (!body.proposedStartAt)
      throw new BadRequestException('proposedStartAt is required for COUNTER.');
    const startAt = new Date(body.proposedStartAt);
    if (Number.isNaN(startAt.getTime()))
      throw new BadRequestException('Invalid proposedStartAt.');

    latest.status = 'SUPERSEDED';
    await this.propRepo.save(latest);

    const proposer = await this.userRepo.findOne({ where: { id: userId } });
    if (!proposer) throw new BadRequestException('User not found.');

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
    const { chosen, availabilityMode } = await this.places.pickOneRestaurant(
      mid.lat,
      mid.lng,
      body.proposedStartAt,
    );

    const duration = body.durationSec ?? latest.durationSec ?? 5400;

    const newProposal = await this.propRepo.save(
      this.propRepo.create({
        request: req as any,
        proposer: proposer as any,
        proposedStartAt: startAt,
        durationSec: duration,
        status: 'PENDING',
        googlePlaceId: chosen.googlePlaceId,
        restaurantName: chosen.name,
        restaurantAddress: chosen.address,
        restaurantLat: chosen.lat,
        restaurantLng: chosen.lng,
        openAtProposedTime: chosen.openAtProposedTime,
      }),
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
        restaurant: {
          googlePlaceId: newProposal.googlePlaceId,
          name: newProposal.restaurantName,
          address: newProposal.restaurantAddress,
          lat: newProposal.restaurantLat,
          lng: newProposal.restaurantLng,
          openAtProposedTime: newProposal.openAtProposedTime,
        },
      },
    };
  }
}
