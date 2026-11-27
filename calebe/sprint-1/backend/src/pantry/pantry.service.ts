import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type {
    propriedade_item_enum,
    tipo_movimentacao_despensa_enum,
    unidade_item_enum,
} from "../generated/prisma/enums.js";
import { CreatePantryItemDto } from "./dto/create-pantry-item.dto.js";
import { CreatePantryMovementDto } from "./dto/create-pantry-movement.dto.js";
import { UpdatePantryItemDto } from "./dto/update-pantry-item.dto.js";
import { PantryItemListRecord, PantryItemRecord, PantryRepository } from "./pantry.repository.js";

function dateFromString(value: string) {
    return new Date(value + "T00:00:00.000Z");
}

function dateToString(value: Date | null) {
    return value?.toISOString().slice(0, 10) ?? null;
}

@Injectable()
export class PantryService {
    constructor(private readonly repository: PantryRepository) {}

    async findMembers(residenceId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        return (await this.repository.findMembers(residenceId)).map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
        }));
    }

    async findItems(residenceId: string, userId: string, search?: string) {
        const membership = await this.requireResidence(residenceId, userId);
        const memberId = membership.participacao[0].id;
        const items = await this.repository.findItems(
            residenceId,
            memberId,
            search?.trim() || undefined
        );
        return items.map((item) => this.mapItem(item, memberId));
    }

    async createItem(residenceId: string, data: CreatePantryItemDto, userId: string) {
        const membership = await this.requireResidence(residenceId, userId);
        const memberId = membership.participacao[0].id;
        const ownerMemberId =
            data.property === "COMUNITARIO"
                ? null
                : data.property === "PRIVADO"
                  ? memberId
                  : data.ownerMemberId || memberId;
        if (ownerMemberId) await this.requireActiveMember(residenceId, ownerMemberId);

        const itemId = await this.repository.createItem({
            residenceId,
            creatorMemberId: membership.participacao[0].id,
            name: data.name,
            category: data.category,
            property: data.property as propriedade_item_enum,
            ownerMemberId,
            unit: data.unit as unidade_item_enum,
            minimumQuantity: data.minimumQuantity ?? null,
            expirationDate: data.expirationDate ? dateFromString(data.expirationDate) : null,
            initialQuantity: data.initialQuantity,
        });
        return this.findItemResponse(residenceId, itemId, membership.participacao[0].id);
    }

    async updateItem(
        residenceId: string,
        itemId: string,
        data: UpdatePantryItemDto,
        userId: string
    ) {
        const membership = await this.requireResidence(residenceId, userId);
        const existing = await this.repository.findItem(
            residenceId,
            itemId,
            membership.participacao[0].id
        );
        if (!existing) throw new NotFoundException("O item não está disponível nesta residência.");
        this.assertCanManageOwnedItem(existing, membership.participacao[0]);
        if (
            data.unit &&
            data.unit !== existing.unidade &&
            (await this.repository.countMovements(itemId)) > 0
        ) {
            throw new BadRequestException(
                "Não é possível trocar a unidade de um item que já possui movimentações."
            );
        }

        const property = (data.property ?? existing.propriedade) as propriedade_item_enum;
        let ownerMemberId: string | null | undefined = data.ownerMemberId;
        if (property === "COMUNITARIO") ownerMemberId = null;
        else if (property === "PRIVADO") ownerMemberId = membership.participacao[0].id;
        else if (ownerMemberId === undefined) {
            ownerMemberId = existing.dono_participacao_id ?? membership.participacao[0].id;
        }

        if (property !== "COMUNITARIO") {
            if (!ownerMemberId) throw new BadRequestException("Selecione o responsável pelo item.");
            await this.requireActiveMember(residenceId, ownerMemberId);
        }

        await this.repository.updateItem(itemId, {
            name: data.name,
            category: data.category,
            property,
            ownerMemberId,
            unit: data.unit as unidade_item_enum | undefined,
            minimumQuantity: data.minimumQuantity,
            expirationDate:
                data.expirationDate === undefined
                    ? undefined
                    : data.expirationDate
                      ? dateFromString(data.expirationDate)
                      : null,
        });
        return this.findItemResponse(residenceId, itemId, membership.participacao[0].id);
    }

    async createMovement(
        residenceId: string,
        itemId: string,
        data: CreatePantryMovementDto,
        userId: string
    ) {
        const membership = await this.requireResidence(residenceId, userId);
        const item = await this.repository.findItem(
            residenceId,
            itemId,
            membership.participacao[0].id
        );
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        this.assertCanUseOwnedItem(item, membership.participacao[0]);

        await this.repository.createMovement({
            itemId,
            memberId: membership.participacao[0].id,
            type: data.type as tipo_movimentacao_despensa_enum,
            quantity: data.quantity,
        });
        return this.findItemResponse(residenceId, itemId, membership.participacao[0].id);
    }

    async removeItem(residenceId: string, itemId: string, userId: string) {
        const membership = await this.requireResidence(residenceId, userId);
        const item = await this.repository.findItem(
            residenceId,
            itemId,
            membership.participacao[0].id
        );
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        this.assertCanManageOwnedItem(item, membership.participacao[0]);
        if (
            item.participacao_item_despensa_criado_por_participacao_idToparticipacao.id !==
                membership.participacao[0].id &&
            item.dono_participacao_id !== membership.participacao[0].id &&
            membership.participacao[0].papel !== "ADMINISTRADOR" &&
            membership.participacao[0].papel !== "LIDER"
        ) {
            throw new ForbiddenException(
                "Somente quem cadastrou o item ou um administrador pode removê-lo."
            );
        }
        await this.repository.deleteItem(itemId);
        return { id: itemId, deleted: true };
    }

    private async findItemResponse(residenceId: string, itemId: string, currentMemberId: string) {
        const item = await this.repository.findItem(residenceId, itemId, currentMemberId);
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        return this.mapItem(item, currentMemberId);
    }

    private async requireResidence(residenceId: string, userId: string) {
        const residence = await this.repository.findMembership(residenceId, userId);
        if (!residence || residence.participacao.length === 0) {
            throw new NotFoundException("A residência não está disponível.");
        }
        return residence;
    }

    private async requireActiveMember(residenceId: string, memberId: string) {
        const member = await this.repository.findActiveMember(residenceId, memberId);
        if (!member)
            throw new BadRequestException("O responsável não pertence a esta residência ativa.");
    }

    private assertCanManageOwnedItem(
        item: NonNullable<PantryItemRecord>,
        member: { id: string; papel: string }
    ) {
        const isOwner = item.dono_participacao_id === member.id;
        const isManager =
            item.participacao_item_despensa_criado_por_participacao_idToparticipacao.id ===
                member.id ||
            member.papel === "ADMINISTRADOR" ||
            member.papel === "LIDER";

        if (item.propriedade === "PRIVADO" && !isOwner) {
            throw new ForbiddenException("Este item privado pertence a outro morador.");
        }
        if (item.propriedade === "DONO_ESPECIFICO" && !isOwner && !isManager) {
            throw new ForbiddenException("Somente o responsável pode usar este item.");
        }
    }

    private assertCanUseOwnedItem(item: NonNullable<PantryItemRecord>, member: { id: string }) {
        if (item.propriedade !== "COMUNITARIO" && item.dono_participacao_id !== member.id) {
            throw new ForbiddenException("Somente o responsável pode usar este item.");
        }
    }

    private mapItem(item: PantryItemRecord | PantryItemListRecord, currentMemberId: string) {
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        const owner = item.participacao_item_despensa_dono_participacao_idToparticipacao;
        const quantity = item.movimentacao_despensa.reduce((total, movement) => {
            const amount = Number(movement.quantidade);
            return total + (movement.tipo === "ENTRADA" ? amount : -amount);
        }, 0);
        return {
            id: item.id,
            name: item.nome,
            category: item.categoria,
            property: item.propriedade,
            ownerMemberId: owner?.id ?? null,
            ownerName: owner ? owner.usuario.apelido || owner.usuario.nome : "Casa",
            isMine: owner?.id === currentMemberId,
            unit: item.unidade,
            quantity,
            minimumQuantity:
                item.quantidade_minima === null ? null : Number(item.quantidade_minima),
            expirationDate: dateToString(item.data_validade),
        };
    }
}
