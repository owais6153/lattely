import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Reel } from '../reels/reel.entity';
import { InteractionProposal } from './proposal.entity';

export type InteractionStatus =
  | 'PENDING'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

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

  @OneToMany(() => InteractionProposal, (p) => p.request)
  proposals: InteractionProposal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
