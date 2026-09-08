import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

@Entity('cooldowns')
@Index(['userA', 'userB'], { unique: true })
export class Cooldown {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  userA: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  userB: User;

  @Column({ type: 'varchar', length: 30 })
  reason: 'DECLINED' | 'POST_CALL_NO';

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
