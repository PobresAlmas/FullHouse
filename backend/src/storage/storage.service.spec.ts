import { ConfigService } from '@nestjs/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  const config: any = { getOrThrow: vi.fn((key: string) => ({ MINIO_ENDPOINT: 'http://minio:9000', MINIO_REGION: 'us-east-1', MINIO_ACCESS_KEY: 'key', MINIO_SECRET_KEY: 'secret', MINIO_BUCKET: 'fullhouse' })[key]) };
  let service: StorageService;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    service = new StorageService(config as ConfigService);
    send = vi.fn().mockResolvedValue({});
    (service as any).s3.send = send;
  });

  afterEach(() => vi.useRealTimers());

  it('uploads file bytes and returns the public avatar URL', async () => {
    const file = { originalname: 'avatar.png', buffer: Buffer.from('image'), mimetype: 'image/png' };
    await expect(service.upload(file)).resolves.toBe('http://localhost:9000/fullhouse/avatars/1767225600000-avatar.png');
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({ Bucket: 'fullhouse', Key: 'avatars/1767225600000-avatar.png', Body: file.buffer, ContentType: file.mimetype });
  });

  it('propagates object storage errors', async () => {
    send.mockRejectedValue(new Error('minio unavailable'));
    await expect(service.upload({ originalname: 'a.png', buffer: Buffer.from('x'), mimetype: 'image/png' })).rejects.toThrow('minio unavailable');
  });
});
