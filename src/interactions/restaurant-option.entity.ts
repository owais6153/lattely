import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InteractionProposal } from './proposal.entity';

@Entity('date_restaurant_options')
export class RestaurantOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InteractionProposal, (p) => p.restaurantOptions, {
    onDelete: 'CASCADE',
  })
  proposal: InteractionProposal;

  @Column({ type: 'varchar', length: 120 })
  googlePlaceId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'double' })
  lat: number;

  @Column({ type: 'double' })
  lng: number;

  // Best-effort computed open-at-proposed-time
  @Column({ type: 'boolean', default: false })
  openAtProposedTime: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
