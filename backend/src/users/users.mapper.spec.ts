import { toUserResponse } from "./users.mapper.js";

describe("toUserResponse", () => {
    const user: {
        id: string;
        codigo_pessoal: string;
        nome: string;
        apelido: string | null;
        email: string;
        foto_url: string | null;
        cor_avatar: string;
        status_moradia: string;
        senha_hash: string;
        anonimizado_em: null;
        excluido_em: null;
    } = {
        id: "u1",
        codigo_pessoal: "ABC123",
        nome: "Ana",
        apelido: null,
        email: "a@example.com",
        foto_url: null,
        cor_avatar: "#5b9635",
        status_moradia: "PROCURANDO",
        senha_hash: "secret",
        anonimizado_em: null,
        excluido_em: null,
    };

    it("maps public user fields and omits null optionals", () => {
        expect(toUserResponse(user)).toEqual({
            id: "u1",
            code: "ABC123",
            name: "Ana",
            nickname: undefined,
            email: "a@example.com",
            photo: undefined,
            avatarBackgroundColor: "#5b9635",
            housingStatus: "PROCURANDO",
        });
        expect(toUserResponse(user)).not.toHaveProperty("senha_hash");
    });

    it("preserves nickname and photo when present", () => {
        expect(
            toUserResponse({ ...user, apelido: "Nina", foto_url: "https://cdn/photo.png" })
        ).toMatchObject({ nickname: "Nina", photo: "https://cdn/photo.png" });
    });

    it("maps the selected avatar color while preserving a profile photo", () => {
        expect(
            toUserResponse({ ...user, foto_url: "https://cdn/photo.png", cor_avatar: "#2f7f6f" })
        ).toMatchObject({ photo: "https://cdn/photo.png", avatarBackgroundColor: "#2f7f6f" });
    });
});
