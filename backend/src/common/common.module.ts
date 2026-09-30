import { Module } from "@nestjs/common";
import { CodeGeneratorService } from "./utils/code-generator.service.js";

@Module({
    providers: [CodeGeneratorService],
    exports: [CodeGeneratorService]
})
export class CommonModule {}