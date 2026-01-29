import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('reels')
export class Reel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  // Public URL served by main.ts static assets
  @Column({ type: 'varchar', length: 500 })
  videoUrl: string;

  @Column({ type: 'int' })
  durationSec: number;

  @Column({ type: 'double', nullable: true })
  lat: number | null;

  @Column({ type: 'double', nullable: true })
  lng: number | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
