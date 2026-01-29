import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { InteractionRequest } from './interaction.entity';
import { RestaurantOption } from './restaurant-option.entity';

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';

@Entity('date_proposals')
export class InteractionProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InteractionRequest, (r) => r.proposals, {
    onDelete: 'CASCADE',
  })
  request: InteractionRequest;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  proposer: User;

  @Column({ type: 'datetime' })
  proposedStartAt: Date;

  // Date duration in seconds (default 90 min)
  @Column({ type: 'int' })
  durationSec: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: ProposalStatus;

  @OneToMany(() => RestaurantOption, (o) => o.proposal)
  restaurantOptions: RestaurantOption[];

  @CreateDateColumn()
  createdAt: Date;
}
