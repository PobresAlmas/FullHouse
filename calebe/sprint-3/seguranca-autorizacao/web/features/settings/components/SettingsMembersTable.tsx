"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { EllipsisVertical, Info, UsersRound } from "lucide-react";
import { SystemSelect } from "@/components/ui/system-select";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { ResidenceMember } from "@/features/residences/api/residences.api";

type Mode = "house" | "members" | "permissions";

export function SettingsMembersTable({
  mode,
  members,
  loading,
  manager,
  currentUserId,
  busy,
  headerAction,
  onAccessChange,
  onRemove,
}: {
  mode: Mode;
  members: ResidenceMember[];
  loading: boolean;
  manager: boolean;
  currentUserId?: string;
  busy: boolean;
  headerAction?: ReactNode;
  onAccessChange: (member: ResidenceMember, allowed: boolean) => void;
  onRemove: (member: ResidenceMember) => void;
}) {
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const permissions = mode === "permissions";
  const house = mode === "house";
  const title = permissions
    ? "Permissões dos moradores"
    : house
      ? "Membros da casa"
      : "Moradores da casa";
  const description = permissions
    ? "Defina o que cada morador pode fazer na casa"
    : mode === "members"
      ? "Gerencie os moradores e consulte o acesso de cada um"
      : undefined;

  return (
    <section className="overflow-visible rounded-xl border border-[#d9d0dc] bg-[#fffaff]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          {(house || permissions) && (
            <UsersRound size={17} className="shrink-0 text-[#4e812f]" />
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-[#9a94a0]">{description}</p>
            )}
          </div>
        </div>
        {mode === "members" && headerAction}
      </header>
      {loading ? (
        <p role="status" className="px-4 py-6 text-sm text-[#77717c]">
          Carregando moradores…
        </p>
      ) : members.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[#77717c]">
          Nenhum morador ativo encontrado.
        </p>
      ) : (
        <>
          {permissions && (
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(120px,.42fr)_minmax(220px,.65fr)] border-b border-[#e8e0eb] px-5 py-3 text-xs text-[#8d8791] md:grid">
              <span>Morador</span>
              <span>Função</span>
              <span>Permissão</span>
            </div>
          )}
          <ul className="divide-y divide-[#d9d0dc]">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const canRemove = manager && member.role !== "LIDER" && !isSelf;
              const managerMember =
                member.canManage ??
                (member.role === "LIDER" || member.role === "ADMINISTRADOR");
              return (
                <li
                  key={member.id}
                  className={`relative min-h-[62px] px-5 py-2 ${permissions ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_minmax(120px,.42fr)_minmax(220px,.65fr)]" : "flex items-center gap-3"}`}
                >
                  <span
                    className={`flex min-w-0 items-center gap-3 ${permissions ? "col-span-2 md:col-span-1" : "flex-1"}`}
                  >
                    <UserAvatar
                      name={member.name}
                      photo={member.photo}
                      backgroundColor={member.avatarBackgroundColor}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#29252d]">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs text-[#9a94a0]">
                        {member.email ?? roleName(member.role)}
                      </span>
                    </span>
                  </span>
                  {permissions ? (
                    <>
                      <span className="hidden text-xs text-[#918b95] md:block">
                        {roleName(member.role)}
                      </span>
                      <SystemSelect
                        aria-label={`Permissão de ${member.name}`}
                        value={
                          managerMember
                            ? "admin"
                            : member.canEditContent
                              ? "edit"
                              : "read"
                        }
                        disabled={!manager || managerMember || busy}
                        onChange={(event) =>
                          onAccessChange(member, event.target.value === "edit")
                        }
                        className="h-11 rounded-lg px-4 pr-4 text-sm"
                      >
                        {managerMember ? (
                          <option value="admin">Administrador</option>
                        ) : (
                          <>
                            <option value="edit">Pode editar</option>
                            <option value="read">Somente leitura</option>
                          </>
                        )}
                      </SystemSelect>
                    </>
                  ) : (
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {!house && (
                        <span
                          className={`hidden rounded-md px-2 py-1 text-[9px] font-semibold md:inline ${managerMember || member.canEditContent ? "bg-[#e8f2eb] text-[#4e8059]" : "bg-[#e5e3e5] text-[#5e5a60]"}`}
                        >
                          {managerMember
                            ? "Admin"
                            : member.canEditContent
                              ? "Pode editar"
                              : "Somente leitura"}
                        </span>
                      )}
                      {house && managerMember && (
                        <span className="rounded-md bg-[#e8f2eb] px-2 py-1 text-[9px] font-semibold text-[#4e8059]">
                          Admin
                        </span>
                      )}
                      {mode === "members" && manager && (
                        <div className="relative">
                          <button
                            type="button"
                            aria-label={`Abrir ações de ${member.name}`}
                            aria-expanded={menuMemberId === member.id}
                            onClick={() =>
                              setMenuMemberId(
                                menuMemberId === member.id ? null : member.id,
                              )
                            }
                            className="grid size-7 place-items-center rounded text-[#504b54] hover:bg-[#f1edf3]"
                          >
                            <EllipsisVertical size={17} />
                          </button>
                          {menuMemberId === member.id && (
                            <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-[#ded6e2] bg-white p-1 shadow-lg">
                              <button
                                type="button"
                                disabled={!canRemove || busy}
                                title={
                                  isSelf
                                    ? "Você não pode remover a si mesmo."
                                    : member.role === "LIDER"
                                      ? "Transfira a liderança antes de remover o líder."
                                      : undefined
                                }
                                onClick={() => {
                                  setMenuMemberId(null);
                                  onRemove(member);
                                }}
                                className="w-full rounded px-3 py-2 text-left text-xs text-[#8d3030] hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[#a9a3ac]"
                              >
                                Remover morador
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {permissions && (
        <div className="flex items-start gap-3 border-t border-[#e8e0eb] bg-[#edf5ef] px-4 py-3 text-[10px] leading-5 text-[#4c8060]">
          <Info
            size={17}
            className="mt-0.5 shrink-0 fill-[#4c8060] text-white"
          />
          <p>
            Moradores com acesso somente leitura podem ver as informações da
            casa, mas não podem criar ou editar tarefas, despesas, itens da
            despensa, pets, lista de compras ou avisos da casa.
          </p>
        </div>
      )}
    </section>
  );
}

function roleName(role: ResidenceMember["role"]) {
  if (role === "LIDER") return "Líder";
  if (role === "ADMINISTRADOR") return "Administrador";
  return "Morador";
}
