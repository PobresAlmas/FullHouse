import { CodeGeneratorService } from "./code-generator.service.js";

describe("CodeGeneratorService", () => {
    it("generates six uppercase alphanumeric characters", () => {
        const code = new CodeGeneratorService().generate();
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("maps random boundaries to first and last allowed characters", () => {
        const random = vi
            .spyOn(Math, "random")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.999999);
        const code = new CodeGeneratorService().generate();
        expect(code[0]).toBe("A");
        expect(code[1]).toBe("9");
        random.mockRestore();
    });
});
