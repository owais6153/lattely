import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

import { InteractionRequest } from './interaction.entity';

@Entity('safety_reports')
export class SafetyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reported: User;

  @ManyToOne(() => InteractionRequest, { nullable: true, onDelete: 'SET NULL' })
  request: InteractionRequest | null;

  @Column({ type: 'varchar', length: 40 })
  reason: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  details: string | null;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: 'OPEN' | 'REVIEWED' | 'CLOSED';

  @CreateDateColumn()
  createdAt: Date;
}
