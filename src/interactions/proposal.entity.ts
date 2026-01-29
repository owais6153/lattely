import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { InteractionRequest } from './interaction.entity';

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

  @Column({ type: 'int' })
  durationSec: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: ProposalStatus;

  // System-chosen single restaurant for THIS proposal/time
  @Column({ type: 'varchar', length: 120 })
  googlePlaceId: string;

  @Column({ type: 'varchar', length: 200 })
  restaurantName: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  restaurantAddress: string | null;

  @Column({ type: 'double' })
  restaurantLat: number;

  @Column({ type: 'double' })
  restaurantLng: number;

  // best-effort computed
  @Column({ type: 'boolean', default: false })
  openAtProposedTime: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
