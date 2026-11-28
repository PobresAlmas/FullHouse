"use client";
import { SystemSelect } from "@/components/ui/system-select";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  CircleUserRound,
  LogOut,
  MessageSquare,
  Pencil,
  PlusCircle,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  createResidence,
  getResidences,
  RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
  type Residence,
} from "@/features/residences/api/residences.api";
import { canCreateOrEditResidenceContent } from "@/features/residences/permissions";
import {
  getTasks,
  getTaskMembers,
  type Task,
  type TaskMember,
} from "@/features/tasks/api/tasks.api";
import {
  getExpenses,
  type Expense,
} from "@/features/expenses/api/expenses.api";
import {
  createHouseNotice,
  deleteHouseNotice,
  getHouseNotices,
  getPersonalHome,
  type HouseNotice,
  type PersonalHomeData,
  updateHouseNotice,
} from "../api/home.api";
import {
  dayInBusinessTime,
  dayOf,
  getHomeTaskMetrics,
  HOME_TIME_ZONE,
} from "../lib/home-metrics";

type Context = "residence" | "personal";
type DashboardData = {
  tasks: Task[];
  members: TaskMember[];
  expenses: Expense[];
};
type HomeExpense = {
  id: string;
  description: string;
  amount: string;
  dueAt: string | null;
  paymentStatus: string;
  paidAt: string | null;
};
const cardClass =
  "overflow-hidden rounded-xl border border-[#d2c8d5] bg-white/75";

function assigneeName(task: Task | PersonalHomeData["tasks"][number]) {
  return "assignee" in task ? ((task as Task).assignee?.name ?? "") : "";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: HOME_TIME_ZONE,
    dateStyle: "short",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00-03:00`));
}

function noticeDateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: HOME_TIME_ZONE,
  }).format(new Date(value));
}

function CardHeading({
  icon,
  children,
  action,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-[#d2c8d5] px-4 py-2">
      <h2 className="flex items-center gap-2 font-semibold text-[#28252b]">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-sm text-[#8e8991]">{children}</p>;
}

function errorMessage(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "Não foi possível carregar este bloco.";
}

export function HomePage() {
  const { user, logout } = useAuth();
  const [residences, setResidences] = useState<Residence[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState<Context>("residence");
  const [loadingResidences, setLoadingResidences] = useState(true);
  const [residenceError, setResidenceError] = useState("");
  const [homeData, setHomeData] = useState<DashboardData | null>(null);
  const [houseNotices, setHouseNotices] = useState<HouseNotice[]>([]);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<HouseNotice | null>(
    null,
  );
  const [noticeDraft, setNoticeDraft] = useState("");
  const [noticeError, setNoticeError] = useState("");
  const [postingNotice, setPostingNotice] = useState(false);
  const [deletingNotice, setDeletingNotice] = useState(false);
  const [homeErrors, setHomeErrors] = useState<Record<string, string>>({});
  const [personalData, setPersonalData] = useState<PersonalHomeData | null>(
    null,
  );
  const [personalError, setPersonalError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [loadedContextKey, setLoadedContextKey] = useState("");
  const [name, setName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const requestId = useRef(0);
  const residenceRequestId = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const selectedResidence =
    residences.find((residence) => residence.id === selectedId) ?? null;
  const canEditSelectedResidenceContent = canCreateOrEditResidenceContent(
    selectedResidence?.membership?.role,
    selectedResidence?.creationEditPolicy,
    selectedResidence?.membership?.canEditContent,
  );
  const requestKey =
    context === "personal" ? "personal" : `residence:${selectedId}`;
  const today = useMemo(() => dayInBusinessTime(), []);
  const userName =
    user?.name?.trim() || user?.email?.split("@")[0] || "bem-vindo(a)";
  const avatarName =
    user?.nickname?.trim() || user?.name?.trim() || user?.email?.trim() || "?";

  const applyResidenceList = useCallback((items: Residence[]) => {
    setResidences(items);
    const savedId = window.localStorage.getItem("fullhouse.home.residence");
    const nextId = items.some((item) => item.id === savedId)
      ? savedId!
      : (items[0]?.id ?? "");
    setSelectedId(nextId);
    if (nextId) window.localStorage.setItem("fullhouse.home.residence", nextId);
    else window.localStorage.removeItem("fullhouse.home.residence");
  }, []);

  const loadResidences = useCallback(async () => {
    const currentRequest = ++residenceRequestId.current;
    setLoadingResidences(true);
    setResidenceError("");
    setLoadedContextKey("");
    try {
      const items = await getResidences();
      if (residenceRequestId.current === currentRequest)
        applyResidenceList(items);
    } catch (error) {
      if (residenceRequestId.current === currentRequest) {
        setResidenceError(errorMessage(error));
      }
    } finally {
      if (residenceRequestId.current === currentRequest)
        setLoadingResidences(false);
    }
  }, [applyResidenceList]);

  useEffect(() => {
    const refreshResidences = () => void loadResidences();
    refreshResidences();
    window.addEventListener(
      RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
      refreshResidences,
    );
    return () => {
      window.removeEventListener(
        RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
        refreshResidences,
      );
      residenceRequestId.current += 1;
    };
  }, [loadResidences]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !profileMenuRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!noticeModalOpen && !noticeToDelete) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (noticeModalOpen && !postingNotice) setNoticeModalOpen(false);
      if (noticeToDelete && !deletingNotice) setNoticeToDelete(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [noticeModalOpen, noticeToDelete, postingNotice, deletingNotice]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (loadingResidences || residenceError) return;

    if (context === "personal") {
      void getPersonalHome()
        .then((data) => {
          if (requestId.current === currentRequest) {
            setPersonalData(data);
            setPersonalError(null);
            setHomeErrors({
              ...(data.errors?.tasks ? { tasks: data.errors.tasks } : {}),
              ...(data.errors?.expenses ? { bills: data.errors.expenses } : {}),
            });
            setLoadedContextKey(requestKey);
          }
        })
        .catch((error: unknown) => {
          if (requestId.current === currentRequest) {
            setPersonalError({ key: requestKey, message: errorMessage(error) });
            setLoadedContextKey(requestKey);
          }
        });
      return;
    }

    if (
      !selectedId ||
      !residences.some((residence) => residence.id === selectedId)
    ) {
      return;
    }
    void Promise.allSettled([
      getTasks(selectedId),
      getTaskMembers(selectedId),
      getExpenses(),
      getHouseNotices(selectedId),
    ]).then((results) => {
      if (requestId.current !== currentRequest) return;
      const [tasks, members, expenses, notices] = results;
      setHomeData({
        tasks: tasks.status === "fulfilled" ? tasks.value : [],
        members: members.status === "fulfilled" ? members.value : [],
        expenses:
          expenses.status === "fulfilled"
            ? expenses.value.filter((expense) => expense.homeId === selectedId)
            : [],
      });
      setHomeErrors({
        ...(tasks.status === "rejected"
          ? { tasks: errorMessage(tasks.reason) }
          : {}),
        ...(members.status === "rejected"
          ? { members: errorMessage(members.reason) }
          : {}),
        ...(expenses.status === "rejected"
          ? { bills: errorMessage(expenses.reason) }
          : {}),
        ...(notices.status === "rejected"
          ? { notices: errorMessage(notices.reason) }
          : {}),
      });
      setHouseNotices(notices.status === "fulfilled" ? notices.value : []);
      setLoadedContextKey(requestKey);
    });
  }, [
    context,
    loadingResidences,
    residenceError,
    residences,
    requestKey,
    selectedId,
  ]);

  async function submitResidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized) {
      setCreateError("Informe o nome da casa.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const residence = await createResidence(normalized);
      const next = [...residences, residence].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      setResidences(next);
      setSelectedId(residence.id);
      setContext("residence");
      window.localStorage.setItem("fullhouse.home.residence", residence.id);
      setName("");
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function submitHouseNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = noticeDraft.trim();
    if (!selectedId || !content || postingNotice) return;
    setPostingNotice(true);
    setNoticeError("");
    try {
      if (editingNoticeId) {
        const notice = await updateHouseNotice(
          selectedId,
          editingNoticeId,
          content,
        );
        setHouseNotices((current) =>
          current.map((item) => (item.id === notice.id ? notice : item)),
        );
      } else {
        const notice = await createHouseNotice(selectedId, content);
        setHouseNotices((current) => [notice, ...current].slice(0, 8));
      }
      setNoticeDraft("");
      setEditingNoticeId(null);
      setNoticeModalOpen(false);
    } catch (error: unknown) {
      setNoticeError(errorMessage(error));
    } finally {
      setPostingNotice(false);
    }
  }

  async function confirmDeleteNotice() {
    if (!selectedId || !noticeToDelete || deletingNotice) return;
    setDeletingNotice(true);
    setNoticeError("");
    try {
      await deleteHouseNotice(selectedId, noticeToDelete.id);
      setHouseNotices((current) =>
        current.filter((item) => item.id !== noticeToDelete.id),
      );
      setNoticeToDelete(null);
    } catch (error: unknown) {
      setNoticeError(errorMessage(error));
    } finally {
      setDeletingNotice(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(errorMessage(error));
      setLoggingOut(false);
    }
  }

  function chooseResidence(id: string) {
    if (!residences.some((residence) => residence.id === id)) return;
    setSelectedId(id);
    setContext("residence");
    window.localStorage.setItem("fullhouse.home.residence", id);
  }

  const hasCurrentContextData = loadedContextKey === requestKey;
  const currentHomeData =
    context === "residence" && hasCurrentContextData ? homeData : null;
  const currentPersonalData =
    context === "personal" && hasCurrentContextData ? personalData : null;
  const currentHomeErrors = hasCurrentContextData ? homeErrors : {};
  const currentPersonalError =
    personalError?.key === requestKey ? personalError.message : "";
  const isContextLoading =
    !loadingResidences &&
    !residenceError &&
    (context === "personal" || selectedResidence !== null) &&
    !hasCurrentContextData &&
    !currentPersonalError;
  const tasks =
    context === "personal"
      ? (currentPersonalData?.tasks ?? [])
      : (currentHomeData?.tasks ?? []);
  const tasksHref = context === "personal" ? "/tasks?scope=personal" : "/tasks";
  const taskMetrics = getHomeTaskMetrics(tasks, today);
  const overdueTasks = taskMetrics.overdue;
  const todayTasks = taskMetrics.today;
  const expenses: HomeExpense[] =
    context === "personal"
      ? (currentPersonalData?.expenses ?? [])
      : (currentHomeData?.expenses ?? []).map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          dueAt: expense.date,
          paymentStatus: expense.paymentStatus,
          paidAt: expense.paidAt,
        }));
  const nextDay = new Date(`${today}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 7);
  const bills = expenses.filter(
    (expense) =>
      expense.paymentStatus === "PENDING" &&
      expense.dueAt &&
      expense.dueAt >= today &&
      expense.dueAt < nextDay.toISOString().slice(0, 10),
  );
  const completedWeek = taskMetrics.completedWeek;
  const progress = taskMetrics.progress;
  const paidWeek = expenses.filter((expense) => {
    const paidDay = dayOf(expense.paidAt) ?? "";
    return (
      expense.paymentStatus === "PAID" &&
      paidDay >= taskMetrics.weekStart &&
      paidDay < taskMetrics.weekEnd
    );
  }).length;
  const members = currentHomeData?.members ?? [];
  const topError = residenceError;

  return (
    <div className="min-h-screen bg-[#f7f2fa] text-[#28252b] md:flex">
      <AppSidebar
        activeSection="home"
        residenceName={selectedResidence?.name}
        noResidence={
          loadingResidences ||
          Boolean(residenceError) ||
          residences.length === 0
        }
      />
      <main className="min-w-0 flex-1">
        <AppPageHeader
          greetingName={userName}
          residenceName={
            context === "residence" ? selectedResidence?.name : undefined
          }
          subtitle={
            context === "personal"
              ? "Seu espaço pessoal"
              : "Você ainda não pertence a nenhuma casa"
          }
          residenceControl={
            !loadingResidences && !residenceError ? (
              <div
                className="flex rounded-xl bg-[#e8e7eb] p-1"
                aria-label="Contexto da Home"
              >
                <button
                  type="button"
                  onClick={() => setContext("personal")}
                  aria-pressed={context === "personal"}
                  className={`min-w-28 rounded-lg px-5 py-2 text-xs ${context === "personal" ? "bg-[#4e812f] text-white" : "text-[#3e3a41]"}`}
                >
                  Pessoal
                </button>
                {residences.length <= 1 ? (
                  <button
                    type="button"
                    onClick={() => setContext("residence")}
                    aria-pressed={context === "residence"}
                    className={`rounded-lg px-5 py-2 text-xs ${context === "residence" ? "bg-[#4e812f] text-white" : "text-[#3e3a41]"}`}
                  >
                    {selectedResidence?.name ?? "Início"}
                  </button>
                ) : (
                  <SystemSelect
                    aria-label="Residência"
                    value={selectedId}
                    onChange={(event) => chooseResidence(event.target.value)}
                    className="max-w-48 rounded-lg bg-[#4e812f] px-3 py-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f]"
                  >
                    {residences.map((residence) => (
                      <option key={residence.id} value={residence.id}>
                        {residence.name}
                      </option>
                    ))}
                  </SystemSelect>
                )}
              </div>
            ) : null
          }
          profile={
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setLogoutError("");
                }}
                aria-label={`Abrir menu da conta de ${userName}`}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="grid size-10 place-items-center rounded-xl transition hover:ring-2 hover:ring-[#4e812f]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
              >
                <UserAvatar
                  name={avatarName}
                  photo={user?.photo}
                  backgroundColor={user?.avatarBackgroundColor}
                />
              </button>
              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Menu da conta"
                  className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-[#d2c8d5] bg-white p-3 shadow-lg"
                >
                  <div className="border-b border-[#eee8ef] px-2 pb-3">
                    <p className="truncate text-sm font-semibold">{userName}</p>
                    {user?.email && (
                      <p className="truncate text-xs text-[#77717a]">
                        {user.email}
                      </p>
                    )}
                  </div>
                  {logoutError && (
                    <p role="alert" className="px-2 pt-2 text-xs text-red-700">
                      Não foi possível sair: {logoutError}
                    </p>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-[#514c56] transition hover:bg-[#f7f2fa] disabled:cursor-wait disabled:opacity-60"
                  >
                    <LogOut size={16} />
                    {loggingOut ? "Saindo…" : "Sair"}
                  </button>
                </div>
              )}
            </div>
          }
        />

        <div className="p-5 md:p-6">
          {loadingResidences ? (
            <p role="status" className="text-sm text-[#77717a]">
              Carregando suas residências…
            </p>
          ) : residenceError ? (
            <section
              className="max-w-2xl rounded-xl border border-red-200 bg-white p-6"
              role="alert"
            >
              <p className="mb-4 text-sm text-red-700">
                Não foi possível carregar suas residências: {residenceError}
              </p>
              <Button onClick={() => void loadResidences()}>
                Tentar novamente
              </Button>
            </section>
          ) : residences.length === 0 && context === "residence" ? (
            <section className="max-w-[680px] rounded-xl border border-[#d2c8d5] bg-white p-7 md:px-10 md:py-8">
              <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-[#dce8d8] text-[#4e812f]">
                <PlusCircle size={34} />
              </div>
              <h2 className="mb-2 text-center text-base font-bold">
                Crie sua casa
              </h2>
              <p className="mx-auto mb-5 max-w-md text-center text-xs leading-4 text-[#8d8790]">
                Organize tarefas, finanças e a rotina com seus moradores.
                <br />
                Você será definido automaticamente como administrador.
              </p>
              <form
                onSubmit={submitResidence}
                className="mx-auto max-w-[420px]"
              >
                <label
                  htmlFor="residence-name"
                  className="mb-1 block text-xs font-semibold"
                >
                  Nome da casa
                </label>
                <input
                  id="residence-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={150}
                  aria-required="true"
                  placeholder="Ex.: Casa Bom Samaritano"
                  aria-invalid={Boolean(createError)}
                  aria-describedby={createError ? "residence-error" : undefined}
                  className="h-9 w-full rounded-md border border-[#d2c8d5] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f]"
                />
                {createError && (
                  <p
                    id="residence-error"
                    role="alert"
                    className="mt-2 text-sm text-red-700"
                  >
                    {createError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={creating}
                  className="mt-5 h-9 w-full bg-[#4e812f] hover:bg-[#426e29]"
                >
                  {creating ? "Criando casa…" : "Criar casa"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link
                  href="/tasks?scope=personal"
                  className="text-sm font-semibold text-[#356a22] underline"
                >
                  Ver tarefas pessoais
                </Link>
              </div>
            </section>
          ) : (
            <>
              {topError && (
                <p
                  role="alert"
                  className="mb-4 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700"
                >
                  {topError}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (context === "personal") setContext("residence");
                      else void loadResidences();
                    }}
                    className="ml-2 underline"
                  >
                    Tentar novamente
                  </button>
                </p>
              )}
              {isContextLoading && (
                <p role="status" className="mb-3 text-xs text-[#8d8790]">
                  Atualizando painel…
                </p>
              )}
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)]">
                <div className="grid gap-5">
                  <section className="overflow-hidden rounded-xl border border-red-200 bg-white/75">
                    <CardHeading
                      icon={<AlertCircle size={17} className="text-red-600" />}
                    >
                      {context === "personal" ? "Você tem" : "A casa tem"}{" "}
                      {overdueTasks.length} tarefa
                      {overdueTasks.length === 1 ? "" : "s"} atrasada
                      {overdueTasks.length === 1 ? "" : "s"}
                    </CardHeading>
                    {currentHomeErrors.tasks ||
                    (context === "personal" && currentPersonalError) ? (
                      <Empty>
                        {currentHomeErrors.tasks || currentPersonalError}
                      </Empty>
                    ) : overdueTasks.length ? (
                      overdueTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-3 border-t border-red-100 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {task.title}
                            </p>
                            <p className="text-xs text-red-600">
                              Atrasada · {dateLabel(task.dueAt)}
                            </p>
                          </div>
                          <Link
                            href={tasksHref}
                            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                          >
                            Ver
                          </Link>
                        </div>
                      ))
                    ) : (
                      <Empty>Nenhuma tarefa atrasada.</Empty>
                    )}
                  </section>

                  <section className={cardClass}>
                    <CardHeading
                      icon={
                        <CalendarDays size={16} className="text-[#4e812f]" />
                      }
                      action={
                        <Link
                          href={tasksHref}
                          className="text-xs font-semibold text-[#4e812f]"
                        >
                          {context === "personal"
                            ? "Ver todas as tarefas pessoais →"
                            : "Ver tarefas →"}
                        </Link>
                      }
                    >
                      Tarefas de hoje{" "}
                      <span className="rounded bg-[#e7f0e7] px-2 py-0.5 text-xs text-[#4e812f]">
                        {todayTasks.length}
                      </span>
                    </CardHeading>
                    {currentHomeErrors.tasks ||
                    (context === "personal" && currentPersonalError) ? (
                      <Empty>
                        {currentHomeErrors.tasks || currentPersonalError}
                      </Empty>
                    ) : todayTasks.length ? (
                      todayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between border-b border-[#e3dce5] px-4 py-3 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <CheckSquare
                              size={17}
                              className="mt-0.5 text-[#c6becb]"
                            />
                            <div>
                              <p className="text-sm font-semibold">
                                {task.title}
                              </p>
                              <p className="text-xs text-[#98929d]">
                                Hoje
                                {assigneeName(task)
                                  ? ` · ${assigneeName(task)}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#c6becb]" />
                        </div>
                      ))
                    ) : (
                      <Empty>Você não tem tarefas para hoje.</Empty>
                    )}
                  </section>

                  <section className={cardClass}>
                    <CardHeading
                      icon={<Wallet size={16} className="text-[#4e812f]" />}
                      action={
                        <Link
                          href="/finance"
                          className="text-xs font-semibold text-[#4e812f]"
                        >
                          Ver detalhes →
                        </Link>
                      }
                    >
                      Contas próximas
                    </CardHeading>
                    {currentHomeErrors.bills ||
                    (context === "personal" && currentPersonalError) ? (
                      <Empty>
                        {currentHomeErrors.bills || currentPersonalError}
                      </Empty>
                    ) : bills.length ? (
                      bills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {bill.description}
                            </p>
                            <p className="text-xs text-[#98929d]">
                              R${" "}
                              {Number(bill.amount).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              · vence {bill.dueAt ? dateLabel(bill.dueAt) : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty>
                        Nenhuma conta pendente com vencimento nos próximos 7
                        dias.
                      </Empty>
                    )}
                  </section>
                </div>

                <div className="grid gap-5">
                  {context === "personal" ? (
                    <section
                      className={`${cardClass} flex flex-row items-start gap-4 p-4`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#4e812f] text-white">
                        <CircleUserRound size={25} />
                      </span>
                      <div>
                        <h2 className="mb-1 text-sm font-bold">Modo pessoal</h2>
                        <p className="text-sm leading-5 text-[#4b4650]">
                          Estas são suas tarefas e despesas pessoais. Elas são
                          privadas e não ficam visíveis para os outros
                          moradores.
                        </p>
                      </div>
                    </section>
                  ) : (
                    <section className={cardClass}>
                      <CardHeading
                        icon={
                          <MessageSquare size={16} className="text-[#4e812f]" />
                        }
                        action={
                          canEditSelectedResidenceContent ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNoticeDraft("");
                                setEditingNoticeId(null);
                                setNoticeError("");
                                setNoticeModalOpen(true);
                              }}
                              aria-label="Adicionar novo aviso da casa"
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#3f7029] transition hover:bg-[#eef5e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                            >
                              <PlusCircle size={15} aria-hidden="true" />
                              <span>Adicionar aviso</span>
                            </button>
                          ) : undefined
                        }
                      >
                        Aviso da casa
                      </CardHeading>
                      {currentHomeErrors.notices ? (
                        <Empty>{currentHomeErrors.notices}</Empty>
                      ) : houseNotices.length ? (
                        <ul className="max-h-80 divide-y divide-[#eee8ef] overflow-y-auto">
                          {houseNotices.map((notice) => (
                            <li key={notice.id} className="px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="whitespace-pre-wrap break-words text-sm leading-5 text-[#38343c]">
                                  {notice.content}
                                </p>
                                {canEditSelectedResidenceContent &&
                                  notice.authorId === user?.id && (
                                    <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5">
                                      <button
                                        type="button"
                                        aria-label="Editar meu aviso"
                                        title="Editar aviso"
                                        onClick={() => {
                                          setEditingNoticeId(notice.id);
                                          setNoticeDraft(notice.content);
                                          setNoticeError("");
                                          setNoticeModalOpen(true);
                                        }}
                                        className="grid size-8 place-items-center rounded-lg text-[#625c66] transition hover:bg-[#f1edf3] hover:text-[#3f7029] focus-visible:outline-2 focus-visible:outline-[#4e812f]"
                                      >
                                        <Pencil size={14} aria-hidden="true" />
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Excluir meu aviso"
                                        title="Excluir aviso"
                                        onClick={() => {
                                          setNoticeError("");
                                          setNoticeToDelete(notice);
                                        }}
                                        className="grid size-8 place-items-center rounded-lg text-[#8c5555] transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
                                      >
                                        <Trash2 size={14} aria-hidden="true" />
                                      </button>
                                    </div>
                                  )}
                              </div>
                              <p className="mt-1.5 text-[11px] text-[#89828d]">
                                {notice.authorName} ·{" "}
                                {noticeDateLabel(notice.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Empty>
                          Nenhum aviso por enquanto. Compartilhe algo importante
                          com a casa.
                        </Empty>
                      )}
                    </section>
                  )}

                  <section className={cardClass}>
                    <CardHeading
                      icon={<span className="text-[#4e812f]">▮</span>}
                    >
                      Resumo da semana
                    </CardHeading>
                    <div className="grid grid-cols-3 gap-3 px-4 pt-4">
                      <div className="rounded-xl border border-[#e0dce2] bg-[#fafbfc] p-3">
                        <strong className="block text-xl">
                          {completedWeek}
                        </strong>
                        <span className="text-[11px] text-[#98929d]">
                          Tarefas concluídas
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#e0dce2] bg-[#fafbfc] p-3">
                        <strong className="block text-xl">{paidWeek}</strong>
                        <span className="text-[11px] text-[#98929d]">
                          Contas pagas
                        </span>
                      </div>
                      <div className="rounded-xl border border-[#e0dce2] bg-[#fafbfc] p-3">
                        <strong className="block text-xl">—</strong>
                        <span className="text-[11px] text-[#98929d]">
                          Avisos novos
                        </span>
                      </div>
                    </div>
                    <div className="px-4 pb-4 pt-4">
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Progresso das tarefas</span>
                        <strong className="text-[#4e812f]">{progress}%</strong>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="Progresso das tarefas na semana"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2 rounded-full bg-[#e2e1e5]"
                      >
                        <div
                          className="h-2 rounded-full bg-[#4e8161]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </section>

                  {context === "residence" && (
                    <section className={cardClass}>
                      <CardHeading
                        icon={
                          <UsersRound size={16} className="text-[#4e812f]" />
                        }
                      >
                        Membros da casa
                      </CardHeading>
                      {currentHomeErrors.members ? (
                        <Empty>{currentHomeErrors.members}</Empty>
                      ) : members.length ? (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 border-b border-[#e3dce5] px-4 py-2.5 last:border-0"
                          >
                            <UserAvatar
                              name={member.name}
                              photo={member.photo}
                              backgroundColor={member.avatarBackgroundColor}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {member.name}
                              </p>
                              <p className="text-xs text-[#98929d]">
                                {member.role === "LIDER"
                                  ? "Líder"
                                  : member.role === "ADMINISTRADOR"
                                    ? "Administrador"
                                    : "Morador"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty>Nenhum membro disponível.</Empty>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      {noticeModalOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[#17131a]/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !postingNotice)
              setNoticeModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="house-notice-title"
            aria-describedby="house-notice-help"
            className="w-full max-w-[440px] rounded-2xl border border-[#e2dbe5] bg-[#fffaff] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf5e9] text-[#4e812f]">
                  <MessageSquare size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="house-notice-title"
                    className="text-lg font-semibold text-[#29252d]"
                  >
                    {editingNoticeId ? "Editar aviso" : "Novo aviso da casa"}
                  </h2>
                  <p
                    id="house-notice-help"
                    className="mt-1 text-sm leading-5 text-[#716b74]"
                  >
                    Compartilhe uma informação breve com todos os moradores.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                disabled={postingNotice}
                onClick={() => setNoticeModalOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[#625c66] transition hover:bg-[#f1edf3] disabled:opacity-50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submitHouseNotice}>
              <label
                htmlFor="house-notice-content"
                className="mb-1.5 block text-sm font-medium text-[#514c56]"
              >
                Aviso
              </label>
              <textarea
                id="house-notice-content"
                autoFocus
                value={noticeDraft}
                onChange={(event) => setNoticeDraft(event.target.value)}
                maxLength={280}
                rows={4}
                placeholder="Ex.: A manutenção da internet será amanhã às 10h."
                aria-invalid={Boolean(noticeError)}
                aria-describedby={
                  noticeError
                    ? "house-notice-error house-notice-count"
                    : "house-notice-count"
                }
                className="w-full resize-y rounded-xl border border-[#d8d1da] bg-white px-3 py-2.5 text-sm leading-5 text-[#29252d] outline-none transition placeholder:text-[#a19aa4] focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20"
              />
              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="text-xs text-[#89828d]">Até 280 caracteres</p>
                <p
                  id="house-notice-count"
                  aria-live="polite"
                  className="shrink-0 text-xs text-[#89828d]"
                >
                  {noticeDraft.length}/280
                </p>
              </div>
              {noticeError && (
                <p
                  id="house-notice-error"
                  role="alert"
                  className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {noticeError}
                </p>
              )}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={postingNotice}
                  onClick={() => setNoticeModalOpen(false)}
                  className="min-h-10 rounded-lg border border-[#d8d1da] px-4 text-sm font-medium text-[#514c56] transition hover:bg-[#f5f1f6] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!noticeDraft.trim() || postingNotice}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4e812f] px-4 text-sm font-semibold text-white transition hover:bg-[#426e29] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle size={16} aria-hidden="true" />
                  {postingNotice
                    ? editingNoticeId
                      ? "Salvando…"
                      : "Publicando…"
                    : editingNoticeId
                      ? "Salvar alterações"
                      : "Publicar aviso"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {noticeToDelete && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#17131a]/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingNotice)
              setNoticeToDelete(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-house-notice-title"
            className="w-full max-w-[380px] rounded-2xl border border-[#e2dbe5] bg-[#fffaff] p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                <Trash2 size={17} aria-hidden="true" />
              </span>
              <h2
                id="delete-house-notice-title"
                className="font-semibold text-[#29252d]"
              >
                Excluir este aviso?
              </h2>
            </div>
            <p className="line-clamp-3 text-sm leading-5 text-[#716b74]">
              “{noticeToDelete.content}” deixará de aparecer para os moradores
              da casa.
            </p>
            {noticeError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {noticeError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingNotice}
                onClick={() => setNoticeToDelete(null)}
                className="min-h-9 rounded-lg border border-[#d8d1da] px-3 text-sm font-medium text-[#514c56] hover:bg-[#f5f1f6] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingNotice}
                onClick={() => void confirmDeleteNotice()}
                className="min-h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingNotice ? "Excluindo…" : "Excluir aviso"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
