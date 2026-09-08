import { execFile } from 'child_process';

export function getFfprobePath() {
  return process.env.FFPROBE_PATH || 'ffprobe';
}

export function verifyFfprobeAvailable(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(getFfprobePath(), ['-version'], { timeout: 5000 }, (error) => {
      if (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('Unable to execute ffprobe.'),
        );
      } else resolve();
    });
  });
}

export function getVideoDurationSec(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobePath = getFfprobePath();

    // -v error: only errors
    // -show_entries format=duration: return duration
    // -of default=noprint_wrappers=1:nokey=1: raw duration number
    execFile(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      (err, stdout) => {
        if (err) {
          return reject(
            err instanceof Error ? err : new Error('Unable to inspect video.'),
          );
        }
        const n = Number(String(stdout).trim());
        if (!Number.isFinite(n) || n <= 0)
          return reject(new Error('Invalid duration'));
        resolve(Math.round(n));
      },
    );
  });
}
