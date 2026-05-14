import { useEffect, useState, useMemo, useCallback } from "react";
import {
    Plus, X, ChevronDown, ChevronRight, Paperclip,
    Trash2, Pencil, CheckCircle2, Clock3, AlertTriangle,
    Zap, ListChecks, Search, Filter
} from "lucide-react";
import { apiClickup } from "../../lib/apiClickup";

const BRAND_BLUE = "#131E5C";

const PRIORITIES = [
    { value: "LOW",    label: "Baja",    color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    { value: "MEDIUM", label: "Media",   color: "bg-sky-100 text-sky-700 border-sky-300" },
    { value: "HIGH",   label: "Alta",    color: "bg-amber-100 text-amber-700 border-amber-300" },
    { value: "URGENT", label: "Urgente", color: "bg-rose-100 text-rose-700 border-rose-300" },
];

const STATUS_COLS = ["Por hacer", "En proceso", "Hecho"];

function cls(...a) { return a.filter(Boolean).join(" "); }

function PriorityBadge({ value }) {
    const p = PRIORITIES.find(x => x.value === value) || PRIORITIES[1];
    return (
        <span className={cls("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold", p.color)}>
            {p.label}
        </span>
    );
}

function StatusBadge({ name }) {
    const color = name?.toLowerCase().includes("hecho")
        ? "bg-emerald-100 text-emerald-700 border-emerald-300"
        : name?.toLowerCase().includes("proceso")
            ? "bg-amber-100 text-amber-700 border-amber-300"
            : "bg-slate-100 text-slate-600 border-slate-300";
    return (
        <span className={cls("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold", color)}>
            {name || "—"}
        </span>
    );
}

function SubtaskRow({ sub, onToggle, onDelete }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-black/5 bg-white px-3 py-2 text-sm">
            <button type="button" onClick={() => onToggle(sub.id)}
                className={cls("shrink-0 rounded-full border-2 h-5 w-5 flex items-center justify-center transition",
                    sub.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}>
                {sub.done ? <CheckCircle2 className="h-3 w-3" /> : null}
            </button>
            <span className={cls("flex-1 min-w-0 truncate", sub.done && "line-through text-black/40")}>
                {sub.title}
            </span>
            <button type="button" onClick={() => onDelete(sub.id)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function EvidenceThumb({ file, url }) {
    if (url) {
        return (
            <a href={url} target="_blank" rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-xl border border-black/10 bg-slate-100 hover:opacity-80">
                <img src={url} alt="evidencia" className="h-full w-full object-cover" />
            </a>
        );
    }
    if (file) {
        const src = URL.createObjectURL(file);
        return (
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                <img src={src} alt={file.name} className="h-full w-full object-cover" />
            </div>
        );
    }
    return null;
}

/* ── Modal principal de tarea enriquecida ── */
function TaskModal({ open, onClose, task, lists, teamId, onSaved }) {
    const [tab, setTab] = useState("info");
    const [title, setTitle]           = useState("");
    const [listId, setListId]         = useState("");
    const [priority, setPriority]     = useState("MEDIUM");
    const [due, setDue]               = useState("");
    const [problema, setProblema]     = useState("");
    const [estrategia, setEstrategia] = useState("");
    const [resultados, setResultados] = useState("");
    const [subtasks, setSubtasks]     = useState([]);
    const [newSub, setNewSub]         = useState("");
    const [evidencias, setEvidencias] = useState([]);
    const [saving, setSaving]         = useState(false);

    useEffect(() => {
        if (!open) return;
        setTab("info");
        setTitle(task?.title || "");
        setListId(task?.list ? String(task.list) : (lists[0]?.id ? String(lists[0].id) : ""));
        setPriority(task?.priority || "MEDIUM");
        setDue(task?.due_date ? String(task.due_date).slice(0, 10) : "");
        setProblema(task?.descripcion_problema || "");
        setEstrategia(task?.desarrollo_estrategia || "");
        setResultados(task?.resultados || "");
        setSubtasks(Array.isArray(task?.subtareas) ? task.subtareas.map(s => ({
            id: s.id || Math.random(),
            title: s.title || s.titulo || "",
            done: !!s.done,
        })) : []);
        setEvidencias([]);
    }, [open, task, lists]);

    function addSubtask() {
        const t = newSub.trim();
        if (!t) return;
        setSubtasks(prev => [...prev, { id: Math.random(), title: t, done: false }]);
        setNewSub("");
    }

    function toggleSubtask(id) {
        setSubtasks(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));
    }

    function deleteSubtask(id) {
        setSubtasks(prev => prev.filter(s => s.id !== id));
    }

    async function handleSave() {
        if (!title.trim() || !listId || !teamId) return;
        setSaving(true);
        try {
            const payload = {
                lista: Number(listId),
                titulo: title.trim(),
                prioridad: priority,
                vence: due ? `${due}T00:00:00` : null,
                descripcion_problema: problema.trim(),
                desarrollo_estrategia: estrategia.trim(),
                resultados: resultados.trim(),
                subtareas: subtasks.map(s => ({ titulo: s.title, done: s.done })),
            };

            if (task?.id) {
                await apiClickup.updateTask(Number(teamId), Number(task.id), payload);
            } else {
                await apiClickup.createTask(Number(teamId), payload);
            }

            if (evidencias.length && task?.id) {
                await apiClickup.uploadTaskEvidence(Number(teamId), Number(task.id), {
                    tipo: "RESOLUTION",
                    comentario: "Evidencias del plan de acción",
                    archivos: evidencias,
                });
            }

            onSaved?.();
            onClose();
        } catch (e) {
            alert(e.message || "Error al guardar");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    const tabs = [
        { id: "info",       label: "Información",  icon: Zap },
        { id: "plan",       label: "Plan de acción", icon: ListChecks },
        { id: "evidencias", label: "Evidencias",   icon: Paperclip },
        { id: "subtareas",  label: "Subtareas",    icon: CheckCircle2 },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
            <button type="button" aria-label="Cerrar"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-t-3xl border border-black/10 bg-white shadow-2xl sm:rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4"
                    style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #1e3282 100%)` }}>
                    <div className="flex items-center gap-2.5">
                        <Zap className="h-5 w-5 text-white/80" />
                        <h3 className="text-[15px] font-black tracking-tight text-white">
                            {task?.id ? "Editar Plan de Acción" : "Nuevo Plan de Acción"}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 text-white/70 hover:bg-white/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-black/[0.07] bg-slate-50">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" onClick={() => setTab(id)}
                            className={cls("flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-extrabold transition",
                                tab === id
                                    ? "border-b-2 text-[#131E5C]"
                                    : "text-black/45 hover:text-black/70"
                            )}
                            style={tab === id ? { borderColor: BRAND_BLUE } : {}}>
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">

                    {/* TAB: Información */}
                    {tab === "info" && (
                        <>
                            <div>
                                <label className="text-xs font-extrabold text-black/60">Título *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]"
                                    placeholder="Nombre del plan de acción" />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-xs font-extrabold text-black/60">Columna</label>
                                    <select value={listId} onChange={e => setListId(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#131E5C]">
                                        {lists.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-extrabold text-black/60">Prioridad</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#131E5C]">
                                        {PRIORITIES.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-extrabold text-black/60">Fecha límite</label>
                                    <input type="date" value={due} onChange={e => setDue(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB: Plan de acción */}
                    {tab === "plan" && (
                        <>
                            <div>
                                <label className="text-xs font-extrabold text-black/60">Descripción del Problema</label>
                                <textarea value={problema} onChange={e => setProblema(e.target.value)}
                                    className="mt-1 w-full min-h-[100px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]"
                                    placeholder="¿Cuál es el problema que se está atendiendo?" />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold text-black/60">Desarrollo de la Estrategia</label>
                                <textarea value={estrategia} onChange={e => setEstrategia(e.target.value)}
                                    className="mt-1 w-full min-h-[100px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]"
                                    placeholder="¿Qué estrategia se va a implementar?" />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold text-black/60">Resultados</label>
                                <textarea value={resultados} onChange={e => setResultados(e.target.value)}
                                    className="mt-1 w-full min-h-[100px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]"
                                    placeholder="¿Qué resultados se esperan o se obtuvieron?" />
                            </div>
                        </>
                    )}

                    {/* TAB: Evidencias */}
                    {tab === "evidencias" && (
                        <>
                            <div className="rounded-xl border border-dashed border-black/20 bg-slate-50 p-4 text-center">
                                <Paperclip className="mx-auto mb-2 h-8 w-8 text-black/30" />
                                <label className="cursor-pointer text-sm font-extrabold text-[#131E5C] hover:underline">
                                    Seleccionar archivos (.png, .jpg, .jpeg)
                                    <input type="file" multiple accept=".png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={e => setEvidencias(prev => [...prev, ...Array.from(e.target.files || [])])} />
                                </label>
                                <p className="mt-1 text-xs text-black/40">Puedes cargar varias imágenes</p>
                            </div>

                            {evidencias.length > 0 && (
                                <div>
                                    <div className="text-xs font-extrabold text-black/50 mb-2">
                                        {evidencias.length} archivo(s) seleccionado(s)
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {evidencias.map((f, i) => (
                                            <div key={i} className="relative">
                                                <EvidenceThumb file={f} />
                                                <button type="button"
                                                    onClick={() => setEvidencias(prev => prev.filter((_, j) => j !== i))}
                                                    className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB: Subtareas */}
                    {tab === "subtareas" && (
                        <>
                            <div className="flex gap-2">
                                <input value={newSub} onChange={e => setNewSub(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && addSubtask()}
                                    className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#131E5C]"
                                    placeholder="Nueva subtarea..." />
                                <button type="button" onClick={addSubtask}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold text-white"
                                    style={{ backgroundColor: BRAND_BLUE }}>
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            {subtasks.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-black/40">
                                    Sin subtareas. Agrega una arriba.
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {subtasks.map(s => (
                                        <SubtaskRow key={s.id} sub={s} onToggle={toggleSubtask} onDelete={deleteSubtask} />
                                    ))}
                                    <div className="text-right text-xs text-black/40">
                                        {subtasks.filter(s => s.done).length}/{subtasks.length} completadas
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-black/[0.07] bg-slate-50/80 px-5 py-3.5">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold text-black/70 hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave}
                        disabled={saving || !title.trim() || !listId}
                        className="rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                        style={{ backgroundColor: BRAND_BLUE }}>
                        {saving ? "Guardando..." : task?.id ? "Guardar cambios" : "Crear plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Tarjeta de plan de acción ── */
function ActionCard({ task, listName, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const subtasks = Array.isArray(task.subtareas) ? task.subtareas : [];
    const done = subtasks.filter(s => s.done).length;

    return (
        <article className="rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-[#131E5C]">{task.title || "Sin título"}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <PriorityBadge value={task.priority} />
                            <StatusBadge name={listName} />
                            {task.due_date ? (
                                <span className="text-[11px] font-semibold text-black/40">
                                    Vence: {String(task.due_date).slice(0, 10)}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <button type="button" onClick={() => onEdit(task)}
                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white p-2 text-black/60 hover:bg-slate-50">
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onDelete(task)}
                            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {task.descripcion_problema ? (
                    <p className="mt-2 line-clamp-2 text-xs text-black/55">{task.descripcion_problema}</p>
                ) : null}

                {subtasks.length > 0 ? (
                    <div className="mt-3">
                        <button type="button" onClick={() => setExpanded(v => !v)}
                            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#131E5C] hover:underline">
                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            Subtareas ({done}/{subtasks.length})
                        </button>

                        {expanded ? (
                            <div className="mt-2 grid gap-1.5">
                                {subtasks.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                                        {s.done
                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            : <Clock3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                        <span className={cls("truncate", s.done && "line-through text-black/40")}>
                                            {s.title || s.titulo}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

/* ── Componente principal ── */
export default function TimeForAction() {
    const [teamId, setTeamId] = useState(() => {
        const v = localStorage.getItem("clickup_team_id");
        return v ? Number(v) : null;
    });
    const [projectId, setProjectId] = useState(() => {
        const v = localStorage.getItem("clickup_project_id");
        return v ? Number(v) : null;
    });

    const [teams, setTeams]   = useState([]);
    const [projects, setProjects] = useState([]);
    const [lists, setLists]   = useState([]);
    const [tasks, setTasks]   = useState([]);
    const [loading, setLoading] = useState(false);

    const [q, setQ]               = useState("");
    const [filterStatus, setFilterStatus] = useState("Todos");

    const [modalOpen, setModalOpen]   = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    /* Carga equipos */
    useEffect(() => {
        apiClickup.listTeams().then(data => {
            const arr = Array.isArray(data) ? data : [];
            setTeams(arr);
            if (!teamId && arr[0]) setTeamId(Number(arr[0].id));
        }).catch(console.error);
    }, []);

    /* Carga proyectos cuando cambia equipo */
    useEffect(() => {
        if (!teamId) return;
        apiClickup.listProjects(teamId).then(data => {
            const arr = Array.isArray(data) ? data : [];
            setProjects(arr);
            if (!projectId && arr[0]) setProjectId(Number(arr[0].id));
        }).catch(console.error);
    }, [teamId]);

    /* Carga tablero cuando cambia proyecto */
    const loadBoard = useCallback(async () => {
        if (!teamId || !projectId) return;
        setLoading(true);
        try {
            const res = await apiClickup.getBoard(Number(teamId), Number(projectId));
            const rawLists = res?.lists || [];
            const tasksByList = res?.tasks_by_list || {};

            setLists(rawLists);

            const flat = rawLists.flatMap(l =>
                (tasksByList[l.id] || []).map(t => ({
                    ...t,
                    list_name: l.name,
                    list_id: l.id,
                }))
            );
            setTasks(flat);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [teamId, projectId]);

    useEffect(() => { loadBoard(); }, [loadBoard]);

    /* Filtros */
    const filtered = useMemo(() => {
        const qn = q.trim().toLowerCase();
        return tasks.filter(t => {
            const matchQ = !qn || (t.title || "").toLowerCase().includes(qn)
                || (t.descripcion_problema || "").toLowerCase().includes(qn);
            const matchS = filterStatus === "Todos" || t.list_name === filterStatus;
            return matchQ && matchS;
        });
    }, [tasks, q, filterStatus]);

    function openCreate() {
        setEditingTask(null);
        setModalOpen(true);
    }

    function openEdit(task) {
        setEditingTask(task);
        setModalOpen(true);
    }

    async function handleDelete(task) {
        if (!window.confirm(`¿Eliminar "${task.title}"?`)) return;
        try {
            await apiClickup.deleteTask(Number(teamId), Number(task.id));
            await loadBoard();
        } catch (e) {
            alert(e.message);
        }
    }

    const statCounts = useMemo(() => {
        const out = {};
        for (const col of STATUS_COLS) {
            out[col] = tasks.filter(t => t.list_name === col).length;
        }
        return out;
    }, [tasks]);

    return (
        <div className="w-full space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-[#131E5C]" />
                        <h2 className="text-lg font-extrabold text-[#131E5C]">TimeForAction</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-black/50">Planes de acción y seguimiento</p>
                </div>

                <button type="button" onClick={openCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-white shadow-sm"
                    style={{ backgroundColor: BRAND_BLUE }}>
                    <Plus className="h-4 w-4" />
                    Nuevo plan
                </button>
            </div>

            {/* Selectors de equipo / proyecto */}
            <div className="flex flex-wrap gap-3 rounded-xl border border-black/10 bg-white p-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-extrabold text-black/50">Equipo</label>
                    <select value={teamId || ""} onChange={e => { setTeamId(Number(e.target.value)); setProjectId(null); }}
                        className="rounded-xl border border-black/10 bg-slate-50 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#131E5C]">
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-extrabold text-black/50">Proyecto</label>
                    <select value={projectId || ""} onChange={e => setProjectId(Number(e.target.value))}
                        className="rounded-xl border border-black/10 bg-slate-50 px-3 py-1.5 text-sm font-bold outline-none focus:border-[#131E5C]">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {STATUS_COLS.map(col => (
                    <button key={col} type="button"
                        onClick={() => setFilterStatus(f => f === col ? "Todos" : col)}
                        className={cls("rounded-xl border p-3 text-left transition",
                            filterStatus === col
                                ? "border-[#131E5C] bg-[#131E5C]/5 ring-1 ring-[#131E5C]/20"
                                : "border-black/10 bg-white hover:bg-slate-50")}>
                        <div className="text-2xl font-black text-[#131E5C]">{statCounts[col] || 0}</div>
                        <div className="text-xs font-semibold text-black/50">{col}</div>
                    </button>
                ))}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                    <input value={q} onChange={e => setQ(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#131E5C]"
                        placeholder="Buscar planes..." />
                </div>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#131E5C]">
                    <option value="Todos">Todos los estados</option>
                    {STATUS_COLS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Lista de planes */}
            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-40 animate-pulse rounded-2xl bg-black/5" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
                    <Zap className="mb-3 h-10 w-10 text-black/20" />
                    <div className="text-sm font-extrabold text-[#131E5C]">Sin planes de acción</div>
                    <p className="mt-1 text-xs text-black/40">Crea el primero con el botón "Nuevo plan"</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(task => (
                        <ActionCard
                            key={task.id}
                            task={task}
                            listName={task.list_name}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <TaskModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                task={editingTask}
                lists={lists}
                teamId={teamId}
                onSaved={loadBoard}
            />
        </div>
    );
}