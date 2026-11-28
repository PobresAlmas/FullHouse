import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateRoomInterestDto } from "./create-room-interest.dto.js";
import { CreateRoomListingDto } from "./create-room-listing.dto.js";
import { MyRoomListingsQueryDto } from "./my-room-listings-query.dto.js";
import { RoomListingQueryDto } from "./room-listing-query.dto.js";
import { UpdateRoomInterestDto } from "./update-room-interest.dto.js";
import { UpdateRoomListingDto } from "./update-room-listing.dto.js";

const homeId = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("room listing DTO validation", () => {
  it("accepts valid listing input and transforms string prices", async () => {
    const dto = plainToInstance(CreateRoomListingDto, {
      casaId: homeId,
      titulo: "Quarto mobiliado",
      preco: "450.50",
      cidade: "Quixadá",
      contato: "(88) 99999-0000",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.preco).toBe(450.5);
  });

  it.each([
    {
      casaId: "invalid",
      titulo: "Quarto",
      preco: "450",
      cidade: "Quixadá",
      contato: "123",
    },
    {
      casaId: homeId,
      titulo: " ",
      preco: "450",
      cidade: "Quixadá",
      contato: "123",
    },
    {
      casaId: homeId,
      titulo: "Quarto",
      preco: "abc",
      cidade: "Quixadá",
      contato: "123",
    },
    {
      casaId: homeId,
      titulo: "Quarto",
      preco: "0",
      cidade: "Quixadá",
      contato: "123",
    },
  ])("rejects invalid listing payloads: %j", async (payload) => {
    const dto = plainToInstance(CreateRoomListingDto, payload);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("rejects duplicate or oversized listing photo arrays", async () => {
    const base = {
      casaId: homeId,
      titulo: "Quarto",
      preco: 450,
      cidade: "Quixadá",
      contato: "123",
    };
    const duplicates = plainToInstance(CreateRoomListingDto, {
      ...base,
      fotos: ["same.jpg", "same.jpg"],
    });
    const oversized = plainToInstance(CreateRoomListingDto, {
      ...base,
      fotos: Array.from({ length: 9 }, (_, index) => `${index}.jpg`),
    });

    await expect(validate(duplicates)).resolves.not.toHaveLength(0);
    await expect(validate(oversized)).resolves.not.toHaveLength(0);
  });

  it("transforms listing query defaults, optional filters, and boolean strings", async () => {
    const dto = plainToInstance(RoomListingQueryDto, {
      cidade: "",
      bairro: " Centro ",
      precoMin: "200.5",
      aceitaPets: "false",
      page: "2",
      limit: "25",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      cidade: undefined,
      bairro: " Centro ",
      precoMin: 200.5,
      status: "ABERTO",
      aceitaPets: false,
      page: 2,
      limit: 25,
    });
  });

  it.each([
    { status: "UNKNOWN" },
    { page: "0" },
    { limit: "51" },
    { precoMax: "-1" },
    { aceitaPets: "yes" },
  ])("rejects invalid query values: %j", async (payload) => {
    const dto = plainToInstance(RoomListingQueryDto, payload);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("validates the optional owner's residence filter", async () => {
    const valid = plainToInstance(MyRoomListingsQueryDto, { casaId: homeId });
    const invalid = plainToInstance(MyRoomListingsQueryDto, {
      casaId: "bad-id",
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it("validates partial listing updates without requiring every field", async () => {
    const valid = plainToInstance(UpdateRoomListingDto, {
      preco: "525.25",
      aceitaPets: true,
    });
    const invalid = plainToInstance(UpdateRoomListingDto, {
      titulo: "",
      status: "PENDENTE",
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(valid.preco).toBe(525.25);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it("validates optional interest messages and allowed decision states", async () => {
    const validMessage = plainToInstance(CreateRoomInterestDto, {
      mensagem: "Tenho interesse",
    });
    const longMessage = plainToInstance(CreateRoomInterestDto, {
      mensagem: "x".repeat(1001),
    });
    const accepted = plainToInstance(UpdateRoomInterestDto, {
      status: "ACEITO",
    });
    const invalidState = plainToInstance(UpdateRoomInterestDto, {
      status: "PENDENTE",
    });

    await expect(validate(validMessage)).resolves.toHaveLength(0);
    await expect(validate(longMessage)).resolves.not.toHaveLength(0);
    await expect(validate(accepted)).resolves.toHaveLength(0);
    await expect(validate(invalidState)).resolves.not.toHaveLength(0);
  });
});
