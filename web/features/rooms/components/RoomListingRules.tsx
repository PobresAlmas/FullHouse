"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { getHouseRules, type HouseRule } from "@/features/house-collaboration/api/house-rules.api";
import { roomListingInputClass } from "./RoomListingForm";

type RulesState = { status: "loading" | "error" } | { status: "ready"; rules: HouseRule[] };
const maxProfileLength = 5000;

export function RoomListingRules({
    residenceId,
    initialProfile = "",
    initialAcceptsPets = false,
    required = true,
}: {
    residenceId: string;
    initialProfile?: string;
    initialAcceptsPets?: boolean;
    required?: boolean;
}) {
    const helpId = useId();
    const [request, setRequest] = useState(0);
    const [state, setState] = useState<RulesState>({ status: "loading" });
    const [selected, setSelected] = useState<string[]>([]);
    const [included, setIncluded] = useState<string[]>([]);
    const [profile, setProfile] = useState(initialProfile);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getHouseRules(residenceId).then(
            (rules) => {
                if (active) setState({ status: "ready", rules });
            },
            () => {
                if (active) setState({ status: "error" });
            }
        );
        return () => {
            active = false;
        };
    }, [residenceId, request]);

    function includeRules() {
        if (state.status !== "ready") return;
        const rules = state.rules.filter((rule) => selected.includes(rule.id));
        const text = [profile.trim(), ...rules.map((rule) => `${rule.title}: ${rule.description}`)]
            .filter(Boolean)
            .join("\n\n");
        if (text.length > maxProfileLength) {
            setError(
                "O texto passaria de 5.000 caracteres. Reduza o texto ou selecione menos regras."
            );
            return;
        }
        setProfile(text);
        setIncluded((current) => [...current, ...rules.map((rule) => rule.id)]);
        setSelected([]);
        setError("");
    }

    return (
        <section className="min-w-0 space-y-3 rounded-xl border border-[#d9d0dc] p-4 md:col-span-2">
            <h3 className="text-sm font-semibold">Convivência</h3>
            {state.status === "loading" && (
                <p role="status" className="text-sm text-[#625c66]">
                    Carregando regras da casa…
                </p>
            )}
            {state.status === "error" && (
                <div className="space-y-2 text-sm">
                    <p role="alert">
                        Não foi possível carregar as regras da casa. Você pode escrever o perfil
                        manualmente.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setState({ status: "loading" });
                            setRequest((current) => current + 1);
                        }}
                    >
                        Tentar novamente
                    </Button>
                </div>
            )}
            {state.status === "ready" &&
                (state.rules.length === 0 ? (
                    <p className="text-sm text-[#625c66]">
                        A casa ainda não tem regras registradas. Descreva a convivência no campo
                        abaixo.
                    </p>
                ) : (
                    <fieldset className="min-w-0 space-y-2 text-sm">
                        <legend className="font-medium">Regras da casa</legend>
                        <ul className="max-h-44 space-y-2 overflow-y-auto rounded-lg bg-[#f4eff6] p-3">
                            {state.rules.map((rule) => {
                                const alreadyIncluded = included.includes(rule.id);
                                return (
                                    <li key={rule.id}>
                                        <label className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                className="mt-1 shrink-0 accent-[#315f35]"
                                                checked={
                                                    alreadyIncluded || selected.includes(rule.id)
                                                }
                                                disabled={alreadyIncluded}
                                                onChange={(event) => {
                                                    const checked = event.currentTarget.checked;
                                                    setSelected((current) =>
                                                        checked
                                                            ? [...current, rule.id]
                                                            : current.filter((id) => id !== rule.id)
                                                    );
                                                    setError("");
                                                }}
                                            />
                                            <span className="min-w-0 wrap-anywhere">
                                                <span className="font-medium">{rule.title}</span>
                                                {alreadyIncluded && " (incluída no texto)"}
                                                <span className="block text-[#625c66]">
                                                    {rule.description}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={includeRules}
                            disabled={selected.length === 0}
                        >
                            Incluir regras selecionadas
                        </Button>
                        {error && (
                            <p role="alert" className="text-red-800">
                                {error}
                            </p>
                        )}
                    </fieldset>
                ))}
            <label className="block text-sm">
                Regras e perfil de convivência
                <textarea
                    name="perfilConvivencia"
                    rows={4}
                    required={required}
                    maxLength={maxProfileLength}
                    aria-describedby={helpId}
                    value={profile}
                    onChange={(event) => {
                        setProfile(event.currentTarget.value);
                        setError("");
                    }}
                    className={`${roomListingInputClass} mt-1 h-auto py-2`}
                />
            </label>
            <p id={helpId} className="text-xs text-[#625c66]">
                Revise o texto antes de publicar. Ele ficará visível no anúncio. Você pode incluir
                regras sobre visitas, silêncio ou fumo.
            </p>
            <fieldset className="flex flex-wrap gap-4 text-sm">
                <legend className="mb-1 font-medium">Aceita pets</legend>
                <label className="inline-flex items-center gap-2">
                    <input
                        type="radio"
                        name="aceitaPets"
                        value="nao"
                        defaultChecked={!initialAcceptsPets}
                        className="accent-[#315f35]"
                    />{" "}
                    Não
                </label>
                <label className="inline-flex items-center gap-2">
                    <input
                        type="radio"
                        name="aceitaPets"
                        value="sim"
                        defaultChecked={initialAcceptsPets}
                        className="accent-[#315f35]"
                    />{" "}
                    Sim
                </label>
            </fieldset>
        </section>
    );
}
