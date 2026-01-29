import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Reel } from '../reels/reel.entity';
import { InteractionProposal } from './proposal.entity';
import { RestaurantOption } from './restaurant-option.entity';

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

  @Column({ type: 'datetime', nullable: true })
  acceptedStartAt: Date | null;

  @Column({ type: 'int', nullable: true })
  acceptedDurationSec: number | null;

  @OneToOne(() => RestaurantOption, { nullable: true })
  @JoinColumn()
  chosenRestaurantOption: RestaurantOption | null;

  @OneToMany(() => InteractionProposal, (p) => p.request)
  proposals: InteractionProposal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
