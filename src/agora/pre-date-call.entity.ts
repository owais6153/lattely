import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InteractionRequest } from '../interactions/interaction.entity';

export type PreCallStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

@Entity('pre_date_calls')
export class PreDateCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InteractionRequest, { onDelete: 'CASCADE' })
  request: InteractionRequest;

  @Column({ type: 'varchar', length: 120 })
  channelName: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: PreCallStatus;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
