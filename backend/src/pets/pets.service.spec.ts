import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PetCareType } from "./dto/create-pet-care-log.dto.js";
import { PetsService } from "./pets.service.js";

describe("PetsService", () => {
    const membership = { id: "participation-1", papel: "MORADOR" };
    const residence = {
        id: "residence-1",
        nome: "Casa do Vale",
        cidade: "Fortaleza",
        bairro: "Centro",
        participacao: [membership],
    };
    const pet = {
        id: "pet-1",
        casa_id: "residence-1",
        nome: "Mel",
        especie: "Cachorro",
        raca: null,
        data_nascimento: null,
        foto_url: null,
        criado_por_participacao_id: membership.id,
        criado_em: new Date("2026-10-11T00:00:00.000Z"),
    };
    let repository: Record<string, ReturnType<typeof vi.fn>>;
    let residenceAccess: Record<string, ReturnType<typeof vi.fn>>;
    let service: PetsService;

    beforeEach(() => {
        repository = {
            findResidenceMembers: vi.fn().mockResolvedValue([]),
            findPets: vi.fn().mockResolvedValue([]),
            findPet: vi.fn().mockResolvedValue(pet),
            findPetForAccess: vi.fn().mockResolvedValue({
                ...pet,
                participacao: { usuario_id: "user-1" },
                casa: { id: residence.id },
            }),
            createPet: vi.fn().mockResolvedValue(pet),
            updatePet: vi.fn().mockResolvedValue(pet),
            deletePet: vi.fn().mockResolvedValue(pet),
            findPetCareLogs: vi.fn().mockResolvedValue([]),
            findResidenceExpense: vi.fn().mockResolvedValue({ id: "expense-1" }),
            findCareLog: vi.fn().mockResolvedValue({ id: "care-1" }),
            createCareLog: vi.fn().mockResolvedValue({
                id: "care-1",
                pet_id: "pet-1",
                tipo: "VACCINE",
                titulo: "Vacina anual",
                descricao: null,
                data_cuidado: new Date("2026-10-11T00:00:00.000Z"),
                valor: null,
                pago_por_participacao_id: null,
                despesa_id: null,
                registrado_por_participacao_id: membership.id,
                criado_em: new Date("2026-10-11T12:00:00.000Z"),
            }),
            updateCareLog: vi.fn(),
            deleteCareLog: vi.fn(),
        };
        residenceAccess = {
            requireMembership: vi.fn().mockResolvedValue({
                residenceId: residence.id,
                memberId: membership.id,
                role: membership.papel,
                creationEditPolicy: "TODOS",
            }),
            requireCreateEditPermission: vi.fn().mockResolvedValue({
                residenceId: residence.id,
                memberId: membership.id,
                role: membership.papel,
                creationEditPolicy: "TODOS",
            }),
            requireManager: vi.fn().mockResolvedValue({
                residenceId: residence.id,
                memberId: membership.id,
                role: membership.papel,
                creationEditPolicy: "TODOS",
            }),
            requireActiveMember: vi.fn().mockResolvedValue({ id: "participation-2" }),
        };
        service = new PetsService(repository as never, residenceAccess as never);
    });

    it("creates a pet under the authenticated member's active residence", async () => {
        await expect(
            service.create("residence-1", { name: "Mel", species: "Cachorro" }, "user-1")
        ).resolves.toMatchObject({ id: "pet-1", name: "Mel", residenceId: "residence-1" });
        expect(repository.createPet).toHaveBeenCalledWith(
            expect.objectContaining({
                residenceId: "residence-1",
                createdById: membership.id,
            })
        );
    });

    it("does not expose a residence outside the user's active memberships", async () => {
        residenceAccess.requireMembership.mockRejectedValue(
            new NotFoundException("A residência não está disponível.")
        );
        await expect(service.findAll("other-residence", "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.findPets).not.toHaveBeenCalled();
    });

    it("updates pet fields without allowing residence or creator changes", async () => {
        await expect(
            service.update("residence-1", "pet-1", { name: "Luna" }, "user-1")
        ).resolves.toMatchObject({ id: "pet-1", residenceId: "residence-1" });
        expect(repository.updatePet).toHaveBeenCalledWith("pet-1", { name: "Luna" });
    });

    it("allows pet deletion only to a leader or administrator", async () => {
        residenceAccess.requireManager.mockRejectedValueOnce(
            new ForbiddenException("Somente líderes e administradores podem fazer isso.")
        );
        await expect(service.remove("residence-1", "pet-1", "user-1")).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.deletePet).not.toHaveBeenCalled();

        await expect(service.remove("residence-1", "pet-1", "user-1")).resolves.toEqual({
            id: "pet-1",
            deleted: true,
        });
        expect(repository.deletePet).toHaveBeenCalledWith("pet-1");
    });

    it("rejects a care log with a payer from another residence", async () => {
        residenceAccess.requireActiveMember.mockResolvedValue(null);
        await expect(
            service.createCareLog(
                "pet-1",
                {
                    type: PetCareType.VACCINE,
                    title: "Vacina anual",
                    date: "2026-10-11",
                    paidById: "foreign-participation",
                },
                "user-1"
            )
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.createCareLog).not.toHaveBeenCalled();
    });

    it("validates optional expenses before persisting care", async () => {
        repository.findResidenceExpense.mockResolvedValue(null);
        await expect(
            service.createCareLog(
                "pet-1",
                {
                    type: PetCareType.FOOD,
                    title: "Ração",
                    date: "2026-10-11",
                    expenseId: "foreign-expense",
                },
                "user-1"
            )
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.createCareLog).not.toHaveBeenCalled();
    });

    it("creates care records with the active participation as author", async () => {
        await expect(
            service.createCareLog(
                "pet-1",
                {
                    type: PetCareType.VACCINE,
                    title: "Vacina anual",
                    date: "2026-10-11",
                },
                "user-1"
            )
        ).resolves.toMatchObject({
            petId: "pet-1",
            createdById: membership.id,
            type: PetCareType.VACCINE,
        });
        expect(repository.createCareLog).toHaveBeenCalledWith(
            expect.objectContaining({
                petId: "pet-1",
                createdById: membership.id,
            })
        );
    });

    it("updates and removes care records only after checking the pet scope", async () => {
        const updatedCare = {
            id: "care-1",
            pet_id: "pet-1",
            tipo: "VACCINE",
            titulo: "Dose reforço",
            descricao: null,
            data_cuidado: new Date("2026-10-11T00:00:00.000Z"),
            valor: null,
            pago_por_participacao_id: null,
            despesa_id: null,
            registrado_por_participacao_id: membership.id,
            criado_em: new Date("2026-10-11T12:00:00.000Z"),
        };
        repository.updateCareLog.mockResolvedValue(updatedCare);
        await expect(
            service.updateCareLog("pet-1", "care-1", { title: "Dose reforço" }, "user-1")
        ).resolves.toMatchObject({ title: "Dose reforço" });
        expect(repository.findCareLog).toHaveBeenCalledWith("pet-1", "care-1");
        expect(repository.updateCareLog).toHaveBeenCalledWith("care-1", {
            title: "Dose reforço",
            type: undefined,
        });

        await expect(service.removeCareLog("pet-1", "care-1", "user-1")).resolves.toEqual({
            id: "care-1",
            deleted: true,
        });
        expect(repository.deleteCareLog).toHaveBeenCalledWith("care-1");
    });
});
