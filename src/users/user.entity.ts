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

export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY';
export type InterestedGender =
  | 'MALE'
  | 'FEMALE'
  | 'NON_BINARY'
  | 'DOESNT_MATTER';
export type AvailabilitySlot = 'MORNING' | 'EVENING';

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

  @Column({ type: 'varchar', length: 10, default: 'NON_BINARY' })
  gender: Gender;

  @Column({ type: 'varchar', length: 60 })
  firstName: string;

  @Column({ type: 'varchar', length: 60 })
  lastName: string;

  // Step 2: location (nullable until user completes it)
  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'double', nullable: true })
  lat: number | null;

  @Column({ type: 'double', nullable: true })
  lng: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  // Step 3: preferences (nullable until user completes it)
  @Column({ type: 'varchar', length: 20, nullable: true })
  interestedGender: InterestedGender | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  weekdaysAvailability: AvailabilitySlot | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  weekendsAvailability: AvailabilitySlot | null;

  @OneToOne(() => Reel, (reel) => reel.user)
  reel?: Reel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
