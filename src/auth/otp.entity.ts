import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type OtpPurpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  purpose: OtpPurpose;

  @Column({ type: 'varchar', length: 255, select: false })
  codeHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', nullable: true })
  lastSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
