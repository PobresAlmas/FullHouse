import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
    let service: PrismaService;

    beforeEach(() => {
        service = new PrismaService();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
