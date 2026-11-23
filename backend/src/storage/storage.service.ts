import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import {
    GetBucketPolicyCommand,
    PutBucketPolicyCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

@Injectable()
export class StorageService {
    private readonly s3: S3Client;
    private pendingPublicPolicy: Promise<void> = Promise.resolve();

    constructor(private readonly configService: ConfigService) {
        this.s3 = new S3Client({
            endpoint: this.configService.getOrThrow<string>("MINIO_ENDPOINT"),

            region: this.configService.getOrThrow<string>("MINIO_REGION"),
            credentials: {
                accessKeyId: this.configService.getOrThrow<string>("MINIO_ACCESS_KEY"),
                secretAccessKey: this.configService.getOrThrow<string>("MINIO_SECRET_KEY"),
            },
            forcePathStyle: true,
        });
    }

    async upload(file: Express.Multer.File, folder = "avatars") {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `${folder}/${randomUUID()}-${safeName}`;
        const bucket = this.configService.getOrThrow<string>("MINIO_BUCKET");

        await this.s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );

        if (folder === "avatars" || folder === "room-listings") {
            // Concurrent uploads must not overwrite one another's bucket policy updates.
            const update = this.pendingPublicPolicy.then(() =>
                this.allowPublicRead(bucket, folder)
            );
            this.pendingPublicPolicy = update.catch(() => undefined);
            await update;
        }

        const publicEndpoint =
            this.configService.get<string>("MINIO_PUBLIC_ENDPOINT") ?? "http://localhost:9000";
        return `${publicEndpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    }

    private async allowPublicRead(bucket: string, folder: "avatars" | "room-listings") {
        let policy: { Version: string; Statement: unknown } = {
            Version: "2012-10-17",
            Statement: [],
        };
        try {
            const existing = await this.s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
            if (existing.Policy) policy = JSON.parse(existing.Policy) as typeof policy;
        } catch (error: unknown) {
            if (
                !(error instanceof Error) ||
                !/NoSuchBucketPolicy|PolicyNotFound/i.test(error.name)
            ) {
                throw error;
            }
        }

        const statementId =
            folder === "avatars" ? "FullHousePublicAvatarRead" : "FullHousePublicRoomListingRead";
        const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
        const retained = statements.filter(
            (statement) =>
                typeof statement !== "object" ||
                statement === null ||
                !("Sid" in statement) ||
                statement.Sid !== statementId
        );
        retained.push({
            Sid: statementId,
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/${folder}/*`],
        });
        await this.s3.send(
            new PutBucketPolicyCommand({
                Bucket: bucket,
                Policy: JSON.stringify({ ...policy, Statement: retained }),
            })
        );
    }
}
