import { ConfigService } from "@nestjs/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { StorageService } from "./storage.service.js";

describe("StorageService", () => {
    const config: { getOrThrow: (key: string) => string } = {
        getOrThrow: vi.fn(
            (key: string) =>
                ({
                    MINIO_ENDPOINT: "http://minio:9000",
                    MINIO_REGION: "us-east-1",
                    MINIO_ACCESS_KEY: "key",
                    MINIO_SECRET_KEY: "secret",
                    MINIO_BUCKET: "fullhouse",
                })[key] as string
        ),
    };
    let service: StorageService;
    let send: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        service = new StorageService(config as ConfigService);
        send = vi.fn().mockResolvedValue({});
        (service as { s3: { send: typeof send } }).s3.send = send;
    });

    it("uploads file bytes and returns the public avatar URL", async () => {
        const file = {
            originalname: "avatar.png",
            buffer: Buffer.from("image"),
            mimetype: "image/png",
        };
        const publicUrl = await service.upload(file);
        expect(publicUrl).toMatch(
            /^http:\/\/localhost:9000\/fullhouse\/avatars\/[0-9a-f-]{36}-avatar\.png$/i
        );
        const command = send.mock.calls[0][0] as PutObjectCommand;
        expect(command.input).toMatchObject({
            Bucket: "fullhouse",
            Key: expect.stringMatching(/^avatars\/[0-9a-f-]{36}-avatar\.png$/i),
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        expect(publicUrl.endsWith(command.input.Key as string)).toBe(true);
    });

    it("propagates object storage errors", async () => {
        send.mockRejectedValue(new Error("minio unavailable"));
        await expect(
            service.upload({
                originalname: "a.png",
                buffer: Buffer.from("x"),
                mimetype: "image/png",
            })
        ).rejects.toThrow("minio unavailable");
    });
});
