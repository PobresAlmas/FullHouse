import {
    BadRequestException,
    ConflictException,
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
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { cleanPantryCategoryName, normalizePantryCategoryName } from "./pantry-categories.js";
import { CreatePantryCategoryDto } from "./dto/create-pantry-category.dto.js";
import { UpdatePantryCategoryDto } from "./dto/update-pantry-category.dto.js";

function dateFromString(value: string) {
    return new Date(value + "T00:00:00.000Z");
}

function dateToString(value: Date | null) {
    return value?.toISOString().slice(0, 10) ?? null;
}

@Injectable()
export class PantryService {
    constructor(
        private readonly repository: PantryRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async findMembers(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findMembers(residenceId)).map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
        }));
    }

    async findCategories(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findCategories(residenceId)).map((category) => ({
            id: category.id,
            name: category.nome,
        }));
    }

    async createCategory(residenceId: string, data: CreatePantryCategoryDto, userId: string) {
        await this.residenceAccess.requireCreateEditPermission(residenceId, userId);
        const name = cleanPantryCategoryName(data.name);
        const normalizedName = normalizePantryCategoryName(name);
        if (!normalizedName) throw new BadRequestException("O nome da categoria não é válido.");
        try {
            const category = await this.repository.createCategory({
                residenceId,
                name,
                normalizedName,
            });
            return { id: category.id, name: category.nome };
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException("Já existe uma categoria com esse nome nesta casa.");
            }
            throw error;
        }
    }

    async updateCategory(
        residenceId: string,
        categoryId: string,
        data: UpdatePantryCategoryDto,
        userId: string
    ) {
        await this.residenceAccess.requireCreateEditPermission(residenceId, userId);
        const existing = await this.repository.findCategory(residenceId, categoryId);
        if (!existing) throw new NotFoundException("A categoria não foi encontrada.");
        if (data.name === undefined) return { id: existing.id, name: existing.nome };
        const name = cleanPantryCategoryName(data.name);
        const normalizedName = normalizePantryCategoryName(name);
        if (!normalizedName) throw new BadRequestException("O nome da categoria não é válido.");
        try {
            const renamed = await this.repository.renameCategory({
                residenceId,
                categoryId,
                name,
                normalizedName,
            });
            if (!renamed) throw new NotFoundException("A categoria não foi encontrada.");
            return { id: categoryId, name };
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException("Já existe uma categoria com esse nome nesta casa.");
            }
            throw error;
        }
    }

    async removeCategory(residenceId: string, categoryId: string, userId: string) {
        await this.residenceAccess.requireCreateEditPermission(residenceId, userId);
        const category = await this.repository.findCategory(residenceId, categoryId);
        if (!category) throw new NotFoundException("A categoria não foi encontrada.");
        if ((await this.repository.countItemsInCategory(categoryId)) > 0) {
            throw new ConflictException(
                "Esta categoria está sendo usada por itens da despensa. Reclassifique os itens antes de removê-la."
            );
        }
        try {
            await this.repository.deleteCategory(residenceId, categoryId);
        } catch (error) {
            if (this.isForeignKeyViolation(error)) {
                throw new ConflictException(
                    "Esta categoria está sendo usada por itens da despensa. Reclassifique os itens antes de removê-la."
                );
            }
            throw error;
        }
        return { id: categoryId, deleted: true };
    }

    async findItems(residenceId: string, userId: string, search?: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const memberId = membership.memberId;
        const items = await this.repository.findItems(
            residenceId,
            memberId,
            search?.trim() || undefined
        );
        return items.map((item) => this.mapItem(item, memberId));
    }

    async createItem(residenceId: string, data: CreatePantryItemDto, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const memberId = membership.memberId;
        const category = await this.repository.findCategory(residenceId, data.categoryId);
        if (!category) throw new BadRequestException("Selecione uma categoria desta residência.");
        const ownerMemberId =
            data.property === "COMUNITARIO"
                ? null
                : data.property === "PRIVADO"
                  ? memberId
                  : data.ownerMemberId || memberId;
        if (ownerMemberId) await this.requireActiveMember(residenceId, ownerMemberId);

        const itemId = await this.repository.createItem({
            residenceId,
            creatorMemberId: memberId,
            name: data.name,
            categoryId: category.id,
            categoryName: category.nome,
            property: data.property as propriedade_item_enum,
            ownerMemberId,
            unit: data.unit as unidade_item_enum,
            minimumQuantity: data.minimumQuantity ?? null,
            expirationDate: data.expirationDate ? dateFromString(data.expirationDate) : null,
            initialQuantity: data.initialQuantity,
        });
        return this.findItemResponse(residenceId, itemId, memberId);
    }

    async updateItem(
        residenceId: string,
        itemId: string,
        data: UpdatePantryItemDto,
        userId: string
    ) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const member = { id: membership.memberId, papel: membership.role };
        const existing = await this.repository.findItem(residenceId, itemId, membership.memberId);
        if (!existing) throw new NotFoundException("O item não está disponível nesta residência.");
        const category = data.categoryId
            ? await this.repository.findCategory(residenceId, data.categoryId)
            : null;
        if (data.categoryId && !category) {
            throw new BadRequestException("Selecione uma categoria desta residência.");
        }
        this.assertCanManageOwnedItem(existing, member);
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
        else if (property === "PRIVADO") ownerMemberId = membership.memberId;
        else if (ownerMemberId === undefined) {
            ownerMemberId = existing.dono_participacao_id ?? membership.memberId;
        }

        if (property !== "COMUNITARIO") {
            if (!ownerMemberId) throw new BadRequestException("Selecione o responsável pelo item.");
            await this.requireActiveMember(residenceId, ownerMemberId);
        }

        await this.repository.updateItem(itemId, {
            name: data.name,
            categoryId: category?.id,
            categoryName: category?.nome,
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
        return this.findItemResponse(residenceId, itemId, membership.memberId);
    }

    async createMovement(
        residenceId: string,
        itemId: string,
        data: CreatePantryMovementDto,
        userId: string
    ) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const member = { id: membership.memberId, papel: membership.role };
        const item = await this.repository.findItem(residenceId, itemId, membership.memberId);
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        this.assertCanUseOwnedItem(item, member);

        await this.repository.createMovement({
            itemId,
            memberId: membership.memberId,
            type: data.type as tipo_movimentacao_despensa_enum,
            quantity: data.quantity,
        });
        return this.findItemResponse(residenceId, itemId, membership.memberId);
    }

    async removeItem(residenceId: string, itemId: string, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const member = { id: membership.memberId, papel: membership.role };
        const item = await this.repository.findItem(residenceId, itemId, membership.memberId);
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        this.assertCanManageOwnedItem(item, member);
        await this.repository.deleteItem(itemId);
        return { id: itemId, deleted: true };
    }

    private async findItemResponse(residenceId: string, itemId: string, currentMemberId: string) {
        const item = await this.repository.findItem(residenceId, itemId, currentMemberId);
        if (!item) throw new NotFoundException("O item não está disponível nesta residência.");
        return this.mapItem(item, currentMemberId);
    }

    private async requireActiveMember(residenceId: string, memberId: string) {
        const member = await this.residenceAccess.requireActiveMember(residenceId, memberId);
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

    private isUniqueViolation(error: unknown): boolean {
        return (
            typeof error === "object" && error !== null && "code" in error && error.code === "P2002"
        );
    }

    private isForeignKeyViolation(error: unknown): boolean {
        return (
            typeof error === "object" && error !== null && "code" in error && error.code === "P2003"
        );
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
            categoryId: item.categoria_id,
            category: item.categoria_despensa.nome,
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
