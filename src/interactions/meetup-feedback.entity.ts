import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

import { InteractionRequest } from './interaction.entity';

@Entity('meetup_feedback')
@Index(['request', 'author'], { unique: true })
export class MeetupFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InteractionRequest, { onDelete: 'CASCADE' })
  request: InteractionRequest;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  author: User;

  @Column({ type: 'boolean' })
  attended: boolean;

  @Column({ type: 'boolean' })
  feltSafe: boolean;

  @Column({ type: 'boolean' })
  wouldMeetAgain: boolean;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
