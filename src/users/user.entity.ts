import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reel } from '../reels/reel.entity';

export enum Gender {
  'MALE',
  'FEMALE',
  'OTHER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  role: 'USER' | 'ADMIN';

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  reelUploaded: boolean;

  @Column({ type: 'varchar', length: 10, default: 'OTHER' })
  gender: Gender;

  // Required identity fields
  @Column({ type: 'varchar', length: 60 })
  firstName: string;

  @Column({ type: 'varchar', length: 60 })
  lastName: string;

  // Required address + location on signup
  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ type: 'double', nullable: false })
  lat: number;

  @Column({ type: 'double', nullable: false })
  lng: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @OneToOne(() => Reel, (reel) => reel.user)
  reel?: Reel;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  fcmToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
