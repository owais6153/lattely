import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

export type InteractionStatus =
  | 'PENDING'
  | 'CALL_READY'
  | 'AWAITING_DECISIONS'
  | 'MATCHED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PostCallDecision = 'YES' | 'NO';

@Entity('date_requests')
export class InteractionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: InteractionStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  recipient: User;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  reel: Reel;

  @Column({ type: 'datetime' })
  windowStartAt: Date;

  @Column({ type: 'datetime' })
  windowEndAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 3, nullable: true })
  requesterDecision: PostCallDecision | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  recipientDecision: PostCallDecision | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  reminderSentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  feedbackReminderSentAt: Date | null;

  // Final agreed time (on ACCEPT)
  @Column({ type: 'datetime', nullable: true })
  acceptedStartAt: Date | null;

  @Column({ type: 'int', nullable: true })
  acceptedDurationSec: number | null;

  // Final restaurant (on ACCEPT)
  @Column({ type: 'varchar', length: 120, nullable: true })
  acceptedGooglePlaceId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  acceptedRestaurantName: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  acceptedRestaurantAddress: string | null;

  @Column({ type: 'double', nullable: true })
  acceptedRestaurantLat: number | null;

  @Column({ type: 'double', nullable: true })
  acceptedRestaurantLng: number | null;

  // For 30-day cooldown
  @Column({ type: 'datetime', nullable: true })
  rejectedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
