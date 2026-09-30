import { Injectable } from "@nestjs/common";

@Injectable()
export class CodeGeneratorService {
    private static readonly CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static readonly LENGTH = 6;

    generate(): string {
        return Array.from(
            { length: CodeGeneratorService.LENGTH },
            () => CodeGeneratorService.CHARS[Math.floor(Math.random() * CodeGeneratorService.CHARS.length)]
        ).join("");
    }
}