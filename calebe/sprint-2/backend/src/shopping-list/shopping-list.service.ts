import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type {
    status_item_lista_compras_enum,
    unidade_item_enum,
} from "../generated/prisma/enums.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { CreateShoppingListItemDto } from "./dto/create-shopping-list-item.dto.js";
import { UpdateShoppingListItemDto } from "./dto/update-shopping-list-item.dto.js";
import { UpdateShoppingListStatusDto } from "./dto/update-shopping-list-status.dto.js";
import { ShoppingListItemRecord, ShoppingListRepository } from "./shopping-list.repository.js";

@Injectable()
export class ShoppingListService {
    constructor(
        private readonly repository: ShoppingListRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async findItems(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const items = await this.repository.findItems(residenceId);
        items.sort((left, right) => {
            if (left.status !== right.status) return left.status === "PENDENTE" ? -1 : 1;
            const leftDate = left.status === "PENDENTE" ? left.criado_em : left.comprado_em;
            const rightDate = right.status === "PENDENTE" ? right.criado_em : right.comprado_em;
            return (
                (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0) ||
                left.id.localeCompare(right.id)
            );
        });
        return items.map((item) => this.mapItem(item));
    }

    async createItem(residenceId: string, data: CreateShoppingListItemDto, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        this.assertQuantityAndUnit(data.quantity, data.unit);
        const item = await this.repository.createItem({
            residenceId,
            memberId: membership.memberId,
            name: data.name,
            quantity: data.quantity ?? null,
            unit: (data.unit ?? null) as unidade_item_enum | null,
            notes: data.notes || null,
        });
        return this.mapItem(item);
    }

    async updateItem(
        residenceId: string,
        itemId: string,
        data: UpdateShoppingListItemDto,
        userId: string
    ) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const existing = await this.repository.findItem(residenceId, itemId);
        if (!existing) throw new NotFoundException("O item não foi encontrado nesta lista.");
        const quantity =
            data.quantity === undefined ? Number(existing.quantidade) || null : data.quantity;
        const unit = data.unit === undefined ? existing.unidade : data.unit;
        this.assertQuantityAndUnit(quantity, unit);
        const updated = await this.repository.updateItem({
            residenceId,
            itemId,
            version: data.version,
            name: data.name,
            quantity: data.quantity,
            unit: data.unit as unidade_item_enum | null | undefined,
            notes: data.notes === undefined ? undefined : data.notes || null,
        });
        if (!updated.found) throw new NotFoundException("O item não foi encontrado nesta lista.");
        if (!updated.item) throw new ConflictException(this.conflictMessage);
        return this.mapItem(updated.item);
    }

    async updateStatus(
        residenceId: string,
        itemId: string,
        data: UpdateShoppingListStatusDto,
        userId: string
    ) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const result = await this.repository.updateStatus({
            residenceId,
            itemId,
            version: data.version,
            memberId: membership.memberId,
            status: data.status as status_item_lista_compras_enum,
        });
        if (!result.found) throw new NotFoundException("O item não foi encontrado nesta lista.");
        if (!result.item) throw new ConflictException(this.conflictMessage);
        return this.mapItem(result.item);
    }

    async removeItem(residenceId: string, itemId: string, version: number, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        if (await this.repository.deleteItem(residenceId, itemId, version)) {
            return { id: itemId, deleted: true };
        }
        if (!(await this.repository.findItem(residenceId, itemId))) {
            throw new NotFoundException("O item não foi encontrado nesta lista.");
        }
        throw new ConflictException(this.conflictMessage);
    }

    private assertQuantityAndUnit(
        quantity: number | null | undefined,
        unit: string | null | undefined
    ) {
        if ((quantity == null) !== (unit == null)) {
            throw new BadRequestException(
                quantity == null
                    ? "Informe a quantidade para usar uma unidade."
                    : "Selecione a unidade da quantidade informada."
            );
        }
        if (quantity != null && quantity <= 0) {
            throw new BadRequestException("A quantidade precisa ser maior que zero.");
        }
    }

    private mapItem(item: ShoppingListItemRecord) {
        const creator = item.participacao_item_lista_compras_criado_por?.usuario;
        const purchaser = item.participacao_item_lista_compras_comprado_por?.usuario;
        return {
            id: item.id,
            name: item.nome,
            quantity: item.quantidade === null ? null : Number(item.quantidade),
            unit: item.unidade,
            notes: item.observacao,
            status: item.status,
            createdByName: creator ? creator.apelido || creator.nome : null,
            createdAt: item.criado_em.toISOString(),
            updatedAt: item.atualizado_em.toISOString(),
            purchasedByName: purchaser ? purchaser.apelido || purchaser.nome : null,
            purchasedAt: item.comprado_em?.toISOString() ?? null,
            version: item.versao,
        };
    }

    private get conflictMessage() {
        return "Este item foi alterado por outro morador. Atualize os dados antes de salvar novamente.";
    }
}
