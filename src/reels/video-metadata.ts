import ffprobeStatic from 'ffprobe-static';
import { execFile } from 'child_process';

export function getVideoDurationSec(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobePath = ffprobeStatic.path;

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
        if (err) return reject(err);
        const n = Number(String(stdout).trim());
        if (!Number.isFinite(n) || n <= 0)
          return reject(new Error('Invalid duration'));
        resolve(Math.round(n));
      },
    );
  });
}
