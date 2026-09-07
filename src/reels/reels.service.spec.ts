import { ConflictException, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import { getVideoDurationSec } from './video-metadata';
import { ReelsService } from './reels.service';

jest.mock('fs/promises', () => ({ unlink: jest.fn() }));
jest.mock('./video-metadata', () => ({ getVideoDurationSec: jest.fn() }));

const mockedUnlink = jest.mocked(unlink);
const mockedDuration = jest.mocked(getVideoDurationSec);

function makeFile(filename = 'new.mp4') {
  return {
    filename,
    path: resolve(`public/uploads/reels/${filename}`),
  } as Express.Multer.File;
}

function makeReel() {
  return {
    id: 'reel-1',
    videoUrl: 'public/uploads/reels/old.mp4',
    durationSec: 20,
    lat: 1,
    lng: 2,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('ReelsService current reel management', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const requestsRepo = { count: jest.fn() };
  const users = {
    findById: jest.fn(),
    markReelUploaded: jest.fn(),
  };
  let service: ReelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReelsService(repo as never, requestsRepo as never, users as never);
    mockedDuration.mockResolvedValue(30);
    mockedUnlink.mockResolvedValue();
  });

  it('returns the authenticated user reel', async () => {
    const reel = makeReel();
    repo.findOne.mockResolvedValue(reel);

    await expect(service.getCurrentReel('user-1')).resolves.toEqual({
      id: reel.id,
      videoUrl: reel.videoUrl,
      durationSec: reel.durationSec,
      createdAt: reel.createdAt,
    });
  });

  it('returns not found when the user has no reel', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getCurrentReel('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces the row before removing the old file', async () => {
    const reel = makeReel();
    const file = makeFile();
    const user = { id: 'user-1', reelUploaded: true };
    repo.findOne.mockResolvedValue(reel);
    repo.save.mockResolvedValue(reel);
    users.findById.mockResolvedValue(user);

    const result = await service.replaceReel('user-1', file, { lat: 3 });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ videoUrl: 'public/uploads/reels/new.mp4', durationSec: 30, lat: 3 }),
    );
    expect(mockedUnlink).toHaveBeenCalledWith(resolve('public/uploads/reels/old.mp4'));
    expect(result).toEqual(expect.objectContaining({ message: 'Reel replaced.', user }));
  });

  it('removes the new file and preserves old values when replacement persistence fails', async () => {
    const reel = makeReel();
    const file = makeFile();
    repo.findOne.mockResolvedValue(reel);
    repo.save.mockRejectedValue(new Error('database unavailable'));

    await expect(service.replaceReel('user-1', file, {})).rejects.toThrow('database unavailable');
    expect(mockedUnlink).toHaveBeenCalledWith(file.path);
    expect(reel).toEqual(expect.objectContaining({
      videoUrl: 'public/uploads/reels/old.mp4',
      durationSec: 20,
    }));
  });

  it('protects date-request history from cascading deletion', async () => {
    repo.findOne.mockResolvedValue(makeReel());
    requestsRepo.count.mockResolvedValue(1);

    await expect(service.deleteReel('user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
    expect(mockedUnlink).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced reel and resets onboarding state', async () => {
    const reel = makeReel();
    const user = { id: 'user-1', reelUploaded: false };
    repo.findOne.mockResolvedValue(reel);
    requestsRepo.count.mockResolvedValue(0);
    repo.remove.mockResolvedValue(reel);
    users.markReelUploaded.mockResolvedValue(user);
    users.findById.mockResolvedValue(user);

    await expect(service.deleteReel('user-1')).resolves.toEqual({
      message: 'Reel deleted.',
      user,
    });
    expect(users.markReelUploaded).toHaveBeenCalledWith('user-1', false);
    expect(repo.remove).toHaveBeenCalledWith(reel);
    expect(mockedUnlink).toHaveBeenCalledWith(resolve(reel.videoUrl));
  });

  it('restores the user flag if deletion persistence fails', async () => {
    repo.findOne.mockResolvedValue(makeReel());
    requestsRepo.count.mockResolvedValue(0);
    users.markReelUploaded.mockResolvedValue({ id: 'user-1' });
    repo.remove.mockRejectedValue(new Error('database unavailable'));

    await expect(service.deleteReel('user-1')).rejects.toThrow('database unavailable');
    expect(users.markReelUploaded).toHaveBeenNthCalledWith(1, 'user-1', false);
    expect(users.markReelUploaded).toHaveBeenNthCalledWith(2, 'user-1', true);
    expect(mockedUnlink).not.toHaveBeenCalled();
  });
});
