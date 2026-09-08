import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';

import { PreDateCall } from '../agora/pre-date-call.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

import { Cooldown } from './cooldown.entity';
import type { FeedbackTag, MeetAgainChoice } from './feedback.constants';
import { GooglePlacesService } from './google-places.service';
import { InteractionRequest } from './interaction.entity';
import { MeetupFeedback } from './meetup-feedback.entity';
import { SafetyReport } from './safety-report.entity';
import {
  assertTodayAndInAvailability,
  buildCoffeeWindow,
  isWeekend,
} from './time-rules';
import { UserBlock } from './user-block.entity';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    @InjectRepository(InteractionRequest)
    private readonly reqRepo: Repository<InteractionRequest>,
    @InjectRepository(Reel) private readonly reelRepo: Repository<Reel>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Cooldown)
    private readonly cooldownRepo: Repository<Cooldown>,
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(SafetyReport)
    private readonly reportRepo: Repository<SafetyReport>,
    @InjectRepository(MeetupFeedback)
    private readonly feedbackRepo: Repository<MeetupFeedback>,
    @InjectRepository(PreDateCall)
    private readonly callRepo: Repository<PreDateCall>,
    private readonly config: ConfigService,
    private readonly places: GooglePlacesService,
    private readonly notifications: NotificationsService,
  ) {}

  private ensureParty(userId: string, request: InteractionRequest) {
    if (request.requester?.id !== userId && request.recipient?.id !== userId) {
      throw new ForbiddenException('Not allowed.');
    }
  }

  private pair(a: User, b: User) {
    return a.id.localeCompare(b.id) < 0
      ? { userA: a, userB: b }
      : { userA: b, userB: a };
  }

  private async applyCooldown(
    request: InteractionRequest,
    reason: Cooldown['reason'],
  ) {
    const pair = this.pair(request.requester, request.recipient);
    const existing = await this.cooldownRepo.findOne({
      where: { userA: { id: pair.userA.id }, userB: { id: pair.userB.id } },
    });
    await this.cooldownRepo.save(
      this.cooldownRepo.create({
        ...existing,
        ...pair,
        reason,
        expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      }),
    );
  }

  private async ensureNoBlockOrCooldown(a: User, b: User): Promise<void> {
    const blocked = await this.blockRepo.findOne({
      where: [
        { blocker: { id: a.id }, blocked: { id: b.id } },
        { blocker: { id: b.id }, blocked: { id: a.id } },
      ],
    });
    if (blocked)
      throw new BadRequestException('This connection is unavailable.');
    const pair = this.pair(a, b);
    const cooldown = await this.cooldownRepo.findOne({
      where: {
        userA: { id: pair.userA.id },
        userB: { id: pair.userB.id },
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });
    if (cooldown)
      throw new BadRequestException('This connection is in a 30-day cooldown.');
  }

  private async enforceQuota(userId: string): Promise<void> {
    const now = Date.now();
    const [hour, day] = await Promise.all([
      this.reqRepo.count({
        where: {
          requester: { id: userId },
          createdAt: MoreThanOrEqual(new Date(now - 3_600_000)),
        },
      }),
      this.reqRepo.count({
        where: {
          requester: { id: userId },
          createdAt: MoreThanOrEqual(new Date(now - 86_400_000)),
        },
      }),
    ]);
    if (hour >= (this.config.get<number>('COFFEE_REQUESTS_PER_HOUR') ?? 5)) {
      throw new BadRequestException('Hourly coffee request limit reached.');
    }
    if (day >= (this.config.get<number>('COFFEE_REQUESTS_PER_DAY') ?? 15)) {
      throw new BadRequestException('Daily coffee request limit reached.');
    }
  }

  private async expireIfNeeded(request: InteractionRequest) {
    if (request.status === 'CALL_READY') {
      const call = await this.callRepo.findOne({
        where: { request: { id: request.id } },
      });
      if (call?.endsAt && call.endsAt.getTime() <= Date.now()) {
        call.status = 'COMPLETED';
        call.completedAt = call.endsAt;
        request.status = 'AWAITING_DECISIONS';
        await Promise.all([
          this.callRepo.save(call),
          this.reqRepo.save(request),
        ]);
      }
    }
    if (
      ['PENDING', 'CALL_READY', 'AWAITING_DECISIONS'].includes(
        request.status,
      ) &&
      request.expiresAt.getTime() <= Date.now()
    ) {
      request.status = 'EXPIRED';
      await this.reqRepo.save(request);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expirePastWindows() {
    await this.reqRepo
      .createQueryBuilder()
      .update(InteractionRequest)
      .set({ status: 'EXPIRED' })
      .where('status IN (:...statuses)', {
        statuses: ['PENDING', 'CALL_READY', 'AWAITING_DECISIONS'],
      })
      .andWhere('expiresAt <= :now', { now: new Date() })
      .execute();

    const venueRetries = await this.reqRepo.find({
      where: {
        status: 'AWAITING_DECISIONS',
        requesterDecision: 'YES',
        recipientDecision: 'YES',
        expiresAt: MoreThan(new Date()),
      },
      relations: ['requester'],
      take: 10,
    });
    await Promise.all(
      venueRetries.map(async (request) => {
        try {
          await this.decide(request.requester.id, request.id, 'YES');
        } catch (error) {
          this.logger.warn(
            `Venue retry failed for request ${request.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }),
    );

    const reminderCutoff = new Date(Date.now() + 30 * 60 * 1000);
    const matches = await this.reqRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.recipient', 'recipient')
      .where('request.status = :status', { status: 'MATCHED' })
      .andWhere('request.reminderSentAt IS NULL')
      .andWhere('request.acceptedStartAt BETWEEN :now AND :cutoff', {
        now: new Date(),
        cutoff: reminderCutoff,
      })
      .take(100)
      .getMany();
    for (const match of matches) {
      const claim = await this.reqRepo
        .createQueryBuilder()
        .update(InteractionRequest)
        .set({ reminderSentAt: new Date() })
        .where('id = :id', { id: match.id })
        .andWhere('reminderSentAt IS NULL')
        .execute();
      if (claim.affected !== 1) continue;
      const url = `/requests/${match.id}`;
      void Promise.all([
        this.notifications.send(
          match.requester.id,
          'Coffee soon',
          `Your meetup at ${match.acceptedRestaurantName ?? 'the selected place'} starts within 30 minutes.`,
          url,
        ),
        this.notifications.send(
          match.recipient.id,
          'Coffee soon',
          `Your meetup at ${match.acceptedRestaurantName ?? 'the selected place'} starts within 30 minutes.`,
          url,
        ),
      ]);
    }
    const completedMeetups = await this.reqRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.recipient', 'recipient')
      .where('request.status = :status', { status: 'MATCHED' })
      .andWhere('request.feedbackReminderSentAt IS NULL')
      .andWhere(
        'DATE_ADD(request.acceptedStartAt, INTERVAL request.acceptedDurationSec SECOND) <= NOW()',
      )
      .take(100)
      .getMany();
    for (const meetup of completedMeetups) {
      const claim = await this.reqRepo
        .createQueryBuilder()
        .update(InteractionRequest)
        .set({ feedbackReminderSentAt: new Date() })
        .where('id = :id', { id: meetup.id })
        .andWhere('feedbackReminderSentAt IS NULL')
        .execute();
      if (claim.affected !== 1) continue;
      const url = `/feedback/${meetup.id}`;
      void Promise.all([
        this.notifications.send(
          meetup.requester.id,
          'How did coffee go?',
          'Share private feedback about your meetup.',
          url,
        ),
        this.notifications.send(
          meetup.recipient.id,
          'How did coffee go?',
          'Share private feedback about your meetup.',
          url,
        ),
      ]);
    }
  }

  async createCoffeeRequest(
    actorId: string,
    reelId: string,
    windowStartIso: string,
    timeZone?: string,
  ) {
    const [actor, reel] = await Promise.all([
      this.userRepo.findOne({ where: { id: actorId } }),
      this.reelRepo.findOne({ where: { id: reelId }, relations: ['user'] }),
    ]);
    if (!actor) throw new BadRequestException('User not found.');
    if (!reel?.user) throw new NotFoundException('Reel not found.');
    const recipient = await this.userRepo.findOne({
      where: { id: reel.user.id },
    });
    if (!recipient) throw new NotFoundException('Recipient not found.');
    if (actor.id === recipient.id)
      throw new BadRequestException('You cannot request yourself.');

    const start = new Date(windowStartIso);
    if (Number.isNaN(start.getTime()))
      throw new BadRequestException('Invalid windowStartAt.');
    const slot = isWeekend(start, timeZone)
      ? actor.weekendsAvailability
      : actor.weekdaysAvailability;
    if (!slot) throw new BadRequestException('Set availability first.');
    const { end } = buildCoffeeWindow(start, slot, timeZone);
    const recipientSlot = isWeekend(start, timeZone)
      ? recipient.weekendsAvailability
      : recipient.weekdaysAvailability;
    if (!recipientSlot) {
      throw new BadRequestException('This person has not set availability.');
    }
    try {
      assertTodayAndInAvailability(start, recipientSlot, timeZone);
    } catch {
      throw new BadRequestException(
        "Selected time is outside this person's availability.",
      );
    }

    await this.enforceQuota(actor.id);
    await this.ensureNoBlockOrCooldown(actor, recipient);
    const open = await this.reqRepo.findOne({
      where: [
        {
          requester: { id: actor.id },
          recipient: { id: recipient.id },
          status: In(['PENDING', 'CALL_READY', 'AWAITING_DECISIONS']),
        },
        {
          requester: { id: recipient.id },
          recipient: { id: actor.id },
          status: In(['PENDING', 'CALL_READY', 'AWAITING_DECISIONS']),
        },
      ],
    });
    if (open)
      throw new BadRequestException(
        'You already have an open request with this user.',
      );

    const request = await this.reqRepo.save(
      this.reqRepo.create({
        status: 'PENDING',
        requester: actor,
        recipient,
        reel,
        windowStartAt: start,
        windowEndAt: end,
        expiresAt: end,
        requesterDecision: null,
        recipientDecision: null,
        confirmedAt: null,
        reminderSentAt: null,
        feedbackReminderSentAt: null,
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
    void this.notifications.send(
      recipient.id,
      'Coffee request',
      `${actor.firstName} wants to meet today.`,
      `/requests/${request.id}`,
    );
    return {
      requestId: request.id,
      status: request.status,
      windowStartAt: start,
      windowEndAt: end,
    };
  }

  async respond(
    userId: string,
    requestId: string,
    action: 'CONFIRM' | 'DECLINE',
  ) {
    const request = await this.load(requestId);
    if (request.recipient.id !== userId)
      throw new ForbiddenException('Only the recipient can respond.');
    await this.expireIfNeeded(request);
    if (request.status !== 'PENDING')
      throw new BadRequestException('Request is no longer pending.');
    if (action === 'DECLINE') {
      request.status = 'REJECTED';
      request.rejectedAt = new Date();
      await this.reqRepo.save(request);
      await this.applyCooldown(request, 'DECLINED');
      void this.notifications.send(
        request.requester.id,
        'Request declined',
        'This connection is now on cooldown.',
        '/(app)/(tabs)/requests',
      );
      return { message: 'Request declined.', status: request.status };
    }
    request.status = 'CALL_READY';
    request.confirmedAt = new Date();
    await this.reqRepo.save(request);
    void this.notifications.send(
      request.requester.id,
      'Coffee request confirmed',
      'Your 60-second call is ready.',
      `/call/${request.id}`,
    );
    return {
      message: 'Request confirmed. Start the 60-second call.',
      status: request.status,
    };
  }

  async decide(userId: string, requestId: string, decision: 'YES' | 'NO') {
    const result = await this.reqRepo.manager.transaction(async (manager) => {
      const requests = manager.getRepository(InteractionRequest);
      const request = await requests.findOne({
        where: { id: requestId },
        relations: ['requester', 'recipient', 'reel'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('Request not found.');
      this.ensureParty(userId, request);
      if (!['CALL_READY', 'AWAITING_DECISIONS'].includes(request.status)) {
        throw new BadRequestException('Post-call decision is not available.');
      }
      const call = await manager.getRepository(PreDateCall).findOne({
        where: { request: { id: request.id } },
      });
      if (
        !call ||
        (call.status !== 'COMPLETED' &&
          (!call.endsAt || call.endsAt.getTime() > Date.now()))
      ) {
        throw new BadRequestException(
          'Complete the 60-second call before deciding.',
        );
      }
      if (request.requester.id === userId) {
        if (request.requesterDecision && request.requesterDecision !== decision)
          throw new BadRequestException('Your decision is already saved.');
        request.requesterDecision = decision;
      } else {
        if (request.recipientDecision && request.recipientDecision !== decision)
          throw new BadRequestException('Your decision is already saved.');
        request.recipientDecision = decision;
      }

      if (decision === 'NO') {
        request.status = 'REJECTED';
        request.rejectedAt = new Date();
        await requests.save(request);
        const pair = this.pair(request.requester, request.recipient);
        const cooldowns = manager.getRepository(Cooldown);
        const existing = await cooldowns.findOne({
          where: {
            userA: { id: pair.userA.id },
            userB: { id: pair.userB.id },
          },
        });
        await cooldowns.save(
          cooldowns.create({
            ...existing,
            ...pair,
            reason: 'POST_CALL_NO',
            expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
          }),
        );
        return {
          kind: 'response' as const,
          response: {
            message: 'Decision saved privately.',
            status: request.status,
          },
        };
      }

      request.status = 'AWAITING_DECISIONS';
      if (
        request.requesterDecision !== 'YES' ||
        request.recipientDecision !== 'YES'
      ) {
        await requests.save(request);
        return {
          kind: 'response' as const,
          response: {
            message: 'Decision saved privately.',
            status: request.status,
          },
        };
      }
      await requests.save(request);

      if (
        request.requester.lat == null ||
        request.requester.lng == null ||
        request.recipient.lat == null ||
        request.recipient.lng == null
      ) {
        return { kind: 'missing-location' as const };
      }
      const earliest = Math.max(
        request.windowStartAt.getTime(),
        Date.now() + 30 * 60 * 1000,
      );
      const lockedStart = new Date(
        Math.ceil(earliest / (15 * 60 * 1000)) * 15 * 60 * 1000,
      );
      if (lockedStart > request.windowEndAt) {
        request.status = 'EXPIRED';
        await requests.save(request);
        return {
          kind: 'response' as const,
          response: {
            message: 'There is no future time left in this coffee window.',
            status: request.status,
          },
        };
      }
      const midpoint = {
        lat: (request.requester.lat + request.recipient.lat) / 2,
        lng: (request.requester.lng + request.recipient.lng) / 2,
      };
      return {
        kind: 'finalize' as const,
        midpoint,
        lockedStart,
      };
    });

    if (result.kind === 'response') return result.response;
    if (result.kind === 'missing-location') {
      throw new BadRequestException('Both users need a current location.');
    }

    // The user's YES is committed before the provider call. If Places is
    // temporarily unavailable, retrying the same YES safely retries matching.
    const { chosen } = await this.places.pickOneRestaurant(
      result.midpoint.lat,
      result.midpoint.lng,
      result.lockedStart.toISOString(),
    );
    const finalized = await this.reqRepo.manager.transaction(
      async (manager) => {
        const requests = manager.getRepository(InteractionRequest);
        const request = await requests.findOne({
          where: { id: requestId },
          relations: ['requester', 'recipient'],
          lock: { mode: 'pessimistic_write' },
        });
        if (!request) throw new NotFoundException('Request not found.');
        if (request.status === 'MATCHED') {
          return {
            response: { message: "It's a match.", status: request.status },
          };
        }
        if (
          request.status !== 'AWAITING_DECISIONS' ||
          request.requesterDecision !== 'YES' ||
          request.recipientDecision !== 'YES'
        ) {
          throw new BadRequestException('Match is no longer available.');
        }

        request.status = 'MATCHED';
        request.acceptedStartAt = result.lockedStart;
        request.acceptedDurationSec = 3600;
        request.acceptedGooglePlaceId = chosen.googlePlaceId;
        request.acceptedRestaurantName = chosen.name;
        request.acceptedRestaurantAddress = chosen.address;
        request.acceptedRestaurantLat = chosen.lat;
        request.acceptedRestaurantLng = chosen.lng;
        await requests.save(request);
        return {
          response: { message: "It's a match.", status: request.status },
          match: {
            requestId: request.id,
            requesterId: request.requester.id,
            recipientId: request.recipient.id,
            placeName: chosen.name,
          },
        };
      },
    );

    if (finalized.match) {
      const url = `/requests/${finalized.match.requestId}`;
      void Promise.all([
        this.notifications.send(
          finalized.match.requesterId,
          "It's a match",
          `Meet at ${finalized.match.placeName}.`,
          url,
        ),
        this.notifications.send(
          finalized.match.recipientId,
          "It's a match",
          `Meet at ${finalized.match.placeName}.`,
          url,
        ),
      ]);
    }
    return finalized.response;
  }

  private async load(id: string) {
    const request = await this.reqRepo.findOne({
      where: { id },
      relations: ['requester', 'recipient', 'reel'],
    });
    if (!request) throw new NotFoundException('Request not found.');
    return request;
  }

  private summary(request: InteractionRequest, viewerId: string) {
    const other =
      request.requester.id === viewerId ? request.recipient : request.requester;
    return {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      windowStartAt: request.windowStartAt,
      windowEndAt: request.windowEndAt,
      otherUser: {
        id: other.id,
        firstName: other.firstName,
        lastName: other.lastName,
        gender: other.gender,
      },
      reel: {
        id: request.reel.id,
        videoUrl: request.reel.videoUrl,
        durationSec: request.reel.durationSec,
      },
    };
  }

  async listInbox(userId: string) {
    const items = await this.reqRepo.find({
      where: { recipient: { id: userId } },
      relations: ['requester', 'recipient', 'reel'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    await Promise.all(items.map((item) => this.expireIfNeeded(item)));
    return items.map((item) => this.summary(item, userId));
  }

  async listOutbox(userId: string) {
    const items = await this.reqRepo.find({
      where: { requester: { id: userId } },
      relations: ['requester', 'recipient', 'reel'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    await Promise.all(items.map((item) => this.expireIfNeeded(item)));
    return items.map((item) => this.summary(item, userId));
  }

  async getRequest(userId: string, requestId: string) {
    const request = await this.load(requestId);
    this.ensureParty(userId, request);
    await this.expireIfNeeded(request);
    const feedback = await this.feedbackRepo.findOne({
      where: { request: { id: request.id }, author: { id: userId } },
    });
    return {
      ...this.summary(request, userId),
      requester: {
        id: request.requester.id,
        firstName: request.requester.firstName,
        lastName: request.requester.lastName,
        gender: request.requester.gender,
      },
      recipient: {
        id: request.recipient.id,
        firstName: request.recipient.firstName,
        lastName: request.recipient.lastName,
        gender: request.recipient.gender,
      },
      myDecision:
        request.requester.id === userId
          ? request.requesterDecision
          : request.recipientDecision,
      acceptedStartAt: request.acceptedStartAt,
      acceptedDurationSec: request.acceptedDurationSec,
      acceptedRestaurant: request.acceptedGooglePlaceId
        ? {
            googlePlaceId: request.acceptedGooglePlaceId,
            name: request.acceptedRestaurantName,
            address: request.acceptedRestaurantAddress,
            lat: request.acceptedRestaurantLat,
            lng: request.acceptedRestaurantLng,
          }
        : null,
      feedbackSubmitted: Boolean(feedback),
    };
  }

  async cancelMeetup(userId: string, requestId: string) {
    const request = await this.load(requestId);
    this.ensureParty(userId, request);
    if (
      request.status !== 'MATCHED' ||
      !request.acceptedStartAt ||
      request.acceptedStartAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Only an upcoming confirmed meetup can be cancelled.',
      );
    }
    request.status = 'CANCELLED';
    await this.reqRepo.save(request);
    const other =
      request.requester.id === userId ? request.recipient : request.requester;
    void this.notifications.send(
      other.id,
      'Meetup cancelled',
      'Your upcoming coffee meetup was cancelled.',
      `/requests/${request.id}`,
    );
    return { message: 'Meetup cancelled.', status: request.status };
  }

  async submitFeedback(
    userId: string,
    requestId: string,
    body: {
      attended: boolean;
      vibeRating: number;
      wouldMeetAgain: MeetAgainChoice;
      tags: FeedbackTag[];
      notes?: string;
    },
  ) {
    const request = await this.load(requestId);
    this.ensureParty(userId, request);
    if (
      request.status !== 'MATCHED' ||
      !request.acceptedStartAt ||
      !request.acceptedDurationSec
    )
      throw new BadRequestException('No completed meetup to review.');
    if (
      Date.now() <
      request.acceptedStartAt.getTime() + request.acceptedDurationSec * 1000
    )
      throw new BadRequestException('Feedback opens after the meetup window.');
    const existing = await this.feedbackRepo.findOne({
      where: { request: { id: requestId }, author: { id: userId } },
    });
    if (existing) throw new BadRequestException('Feedback already submitted.');
    await this.feedbackRepo.save(
      this.feedbackRepo.create({
        request,
        author: { id: userId } as User,
        ...body,
        feltSafe: !body.tags.includes('SAFETY_CONCERN'),
        notes: body.notes?.trim() || null,
      }),
    );
    const otherUserId =
      request.requester.id === userId
        ? request.recipient.id
        : request.requester.id;
    return {
      message: 'Feedback submitted.',
      requiresSafetyAction: body.tags.includes('SAFETY_CONCERN'),
      otherUserId,
    };
  }

  async block(userId: string, targetId: string) {
    if (userId === targetId)
      throw new BadRequestException('You cannot block yourself.');
    const target = await this.userRepo.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found.');
    const existing = await this.blockRepo.findOne({
      where: { blocker: { id: userId }, blocked: { id: targetId } },
    });
    if (!existing)
      await this.blockRepo.save(
        this.blockRepo.create({
          blocker: { id: userId } as User,
          blocked: target,
        }),
      );
    await this.reqRepo
      .createQueryBuilder()
      .update(InteractionRequest)
      .set({ status: 'CANCELLED' })
      .where('status IN (:...statuses)', {
        statuses: ['PENDING', 'CALL_READY', 'AWAITING_DECISIONS', 'MATCHED'],
      })
      .andWhere(
        '((requesterId = :userId AND recipientId = :targetId) OR (requesterId = :targetId AND recipientId = :userId))',
        { userId, targetId },
      )
      .execute();
    return { message: 'User blocked.' };
  }

  async report(
    userId: string,
    targetId: string,
    body: { reason: string; details?: string; requestId?: string },
  ) {
    if (userId === targetId)
      throw new BadRequestException('You cannot report yourself.');
    const reason = body.reason.trim();
    if (!reason) throw new BadRequestException('Report reason is required.');
    const target = await this.userRepo.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found.');
    let request: InteractionRequest | null = null;
    if (body.requestId) {
      request = await this.load(body.requestId);
      this.ensureParty(userId, request);
      if (
        request.requester.id !== targetId &&
        request.recipient.id !== targetId
      )
        throw new BadRequestException(
          'Reported user is not part of this request.',
        );
    }
    const report = await this.reportRepo.save(
      this.reportRepo.create({
        reporter: { id: userId } as User,
        reported: target,
        request,
        reason,
        details: body.details?.trim() || null,
        status: 'OPEN',
      }),
    );
    return { message: 'Report submitted for moderation.', reportId: report.id };
  }

  async listReports() {
    return this.reportRepo.find({
      relations: ['reporter', 'reported', 'request'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async moderateReport(id: string, status: 'REVIEWED' | 'CLOSED') {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found.');
    report.status = status;
    await this.reportRepo.save(report);
    return { message: 'Report updated.', status };
  }
}
