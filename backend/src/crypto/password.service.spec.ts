import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
    it("hashes passwords and can verify the resulting hash", async () => {
        const service = new PasswordService();
        const hash = await service.hash("secret");
        expect(hash).not.toBe("secret");
        await expect(service.compare("secret", hash)).resolves.toBe(true);
        await expect(service.compare("wrong", hash)).resolves.toBe(false);
    });
});
