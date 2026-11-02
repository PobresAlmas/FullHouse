import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

@Injectable()
export class StorageService {
    private readonly s3: S3Client;

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

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.configService.getOrThrow<string>("MINIO_BUCKET"),
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );

        return `http://localhost:9000/fullhouse/${key}`;
    }
}
