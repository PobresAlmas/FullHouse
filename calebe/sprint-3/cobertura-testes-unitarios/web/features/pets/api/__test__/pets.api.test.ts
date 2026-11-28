import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
  createPet,
  createPetCareLog,
  deletePet,
  deletePetCareLog,
  getPet,
  getPetCareLogs,
  getPetResidenceMembers,
  getPetResidences,
  getPets,
  updatePet,
  updatePetCareLog,
} from "../pets.api";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("pets API client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads residences, members, pet lists, pet details, and care logs", async () => {
    const data = [{ id: "pet-1" }];
    vi.mocked(api.get).mockResolvedValue({ data });

    await expect(getPetResidences()).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/residences");
    await expect(getPetResidenceMembers("home-1")).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/residences/home-1/members");
    await expect(getPets("home-1", "Mimi")).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/residences/home-1/pets", {
      params: { search: "Mimi" },
    });
    vi.mocked(api.get).mockResolvedValueOnce({ data: data[0] });
    await expect(getPet("home-1", "pet-1")).resolves.toEqual(data[0]);
    expect(api.get).toHaveBeenLastCalledWith("/residences/home-1/pets/pet-1");
    await expect(getPetCareLogs("pet-1")).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/pets/pet-1/care-logs");
  });

  it("creates, updates, and deletes pets", async () => {
    const pet = { id: "pet-1" };
    const input = { name: "Mimi", species: "Cat" };
    vi.mocked(api.post).mockResolvedValue({ data: pet });
    vi.mocked(api.patch).mockResolvedValue({ data: pet });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await expect(createPet("home-1", input)).resolves.toEqual(pet);
    expect(api.post).toHaveBeenCalledWith("/residences/home-1/pets", input);
    await expect(
      updatePet("home-1", "pet-1", { ...input, breed: "Tabby" }),
    ).resolves.toEqual(pet);
    expect(api.patch).toHaveBeenCalledWith("/residences/home-1/pets/pet-1", {
      ...input,
      breed: "Tabby",
    });
    await expect(deletePet("home-1", "pet-1")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/residences/home-1/pets/pet-1");
  });

  it("creates, updates, and deletes pet care logs", async () => {
    const log = { id: "log-1" };
    const input = {
      type: "VACCINE" as const,
      title: "Annual vaccine",
      date: "2026-12-10",
    };
    vi.mocked(api.post).mockResolvedValue({ data: log });
    vi.mocked(api.patch).mockResolvedValue({ data: log });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await expect(createPetCareLog("pet-1", input)).resolves.toEqual(log);
    expect(api.post).toHaveBeenCalledWith("/pets/pet-1/care-logs", input);
    await expect(
      updatePetCareLog("pet-1", "log-1", { title: "Booster" }),
    ).resolves.toEqual(log);
    expect(api.patch).toHaveBeenCalledWith("/pets/pet-1/care-logs/log-1", {
      title: "Booster",
    });
    await expect(deletePetCareLog("pet-1", "log-1")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/pets/pet-1/care-logs/log-1");
  });
});
