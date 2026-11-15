export function ExchangeRequests() {
    return (
        <section className="rounded-xl border border-[#e9e2eb] bg-[#fffaff] p-4">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold">Solicitações de troca</h2>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] text-red-600">
                    2 novas
                </span>
            </div>
            {[
                {
                    name: "Ana",
                    initial: "A",
                    color: "bg-blue-600",
                    from: "Limpar banheiro",
                    fromDate: "Seg, 20/09",
                    to: "Lavar louça",
                    toDate: "Qui, 02/10",
                },
                {
                    name: "Clidenor",
                    initial: "C",
                    color: "bg-violet-600",
                    from: "Lavar chão",
                    fromDate: "Seg, 20/09",
                    to: "Lavar louça",
                    toDate: "Qui, 02/10",
                },
            ].map((request) => (
                <article
                    key={request.name}
                    className="mb-2 rounded-lg border border-[#d1c9d3] bg-white p-2.5 last:mb-0"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <span
                            className={`grid size-7 place-items-center rounded-full ${request.color} text-[10px] font-semibold text-white`}
                        >
                            {request.initial}
                        </span>
                        <p className="text-[10px]">
                            <strong>{request.name}</strong> quer trocar uma tarefa para você
                        </p>
                    </div>
                    <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-1 text-[9px]">
                        <div className="rounded bg-[#eee9f0] px-2 py-1.5">
                            <span className="block truncate">{request.from}</span>
                            <span className="text-[#77717c]">{request.fromDate}</span>
                        </div>
                        <span className="grid size-6 place-items-center rounded-full bg-[#f4f0f5] text-[#4e812f]">
                            ⇄
                        </span>
                        <div className="rounded bg-[#eee9f0] px-2 py-1.5">
                            <span className="block truncate">{request.to}</span>
                            <span className="text-[#77717c]">{request.toDate}</span>
                        </div>
                    </div>
                    <p className="mt-2 text-right text-[9px] text-[#8b858e]">Ações indisponíveis</p>
                </article>
            ))}
        </section>
    );
}
