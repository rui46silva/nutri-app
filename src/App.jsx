import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
  FileText,
  GlassWater,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

const STORAGE_KEY = "nutrition-food-diary-v1";

const MAIN_MEALS = [
  { key: "breakfast", label: "Pequeno-almoço" },
  { key: "morningSnack", label: "Lanche da manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "afternoonSnack", label: "Lanche da tarde" },
  { key: "dinner", label: "Jantar" },
];

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

function Button({ children, className = "", variant = "primary", size = "md", ...props }) {
  const variants = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    outline: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
  };

  const sizes = {
    md: "h-10",
    sm: "h-8 px-3 text-xs",
    icon: "h-9 w-9 px-0",
  };

  return (
    <button className={`${buttonBase} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white ${className}`}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white ${className}`}
      {...props}
    />
  );
}

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 ${className}`}>
      {children}
    </span>
  );
}

const emptyEntry = () => ({
  meals: MAIN_MEALS.reduce((acc, meal) => {
    acc[meal.key] = { text: "", photo: "" };
    return acc;
  }, {}),
  extras: [],
  waterMl: "",
  drinks: [],
  notes: "",
});

const pad = (value) => String(value).padStart(2, "0");

const toISODate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const prettyDate = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const monthLabel = (date) =>
  date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

const hasContent = (entry) => {
  if (!entry) return false;

  const mealText = Object.values(entry.meals || {}).some(
    (meal) => meal.text?.trim() || meal.photo
  );

  return Boolean(
    mealText ||
      entry.extras?.some((item) => item.name?.trim() || item.quantity?.trim()) ||
      entry.drinks?.some((item) => item.name?.trim() || item.quantity?.trim()) ||
      entry.waterMl ||
      entry.notes?.trim()
  );
};

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function Calendar({
  currentMonth,
  selectedDate,
  entries,
  selectedForExport,
  onSelectDate,
  onToggleExport,
  onPrev,
  onNext,
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardContent>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button variant="outline" size="icon" onClick={onPrev} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Calendário</p>
            <h2 className="text-lg font-semibold capitalize text-slate-950">{monthLabel(currentMonth)}</h2>
          </div>

          <Button variant="outline" size="icon" onClick={onNext} aria-label="Mês seguinte">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
            <span key={day} className="py-2">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

            const iso = toISODate(date);
            const isSelected = iso === selectedDate;
            const isToday = iso === toISODate(new Date());
            const isRegistered = hasContent(entries[iso]);
            const isExportSelected = selectedForExport.includes(iso);

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDate(iso)}
                className={`relative aspect-square rounded-xl border text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="relative z-10">{date.getDate()}</span>

                {isToday && !isSelected && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-950" />
                )}

                {isRegistered && (
                  <span
                    className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                      isSelected ? "bg-white" : "bg-emerald-500"
                    }`}
                  />
                )}

                {isRegistered && (
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleExport(iso);
                    }}
                    className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                      isExportSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isSelected
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                    title="Selecionar para PDF"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dia com registo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">✓</span>
            Selecionado para PDF
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataURL(file);
    onChange(dataUrl);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img src={value} alt="Foto da refeição" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-sm hover:bg-white"
            aria-label="Remover foto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 transition hover:border-slate-500 hover:bg-white"
        >
          <ImagePlus className="h-5 w-5" />
          Adicionar foto
        </button>
      )}
    </div>
  );
}

function MealCard({ meal, value, onChange }) {
  return (
    <Card>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-full bg-slate-950 p-1.5 text-white">
              <Utensils className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-semibold text-slate-950">{meal.label}</h3>
          </div>

          <Textarea
            value={value.text}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
            placeholder={`O que comeste no ${meal.label.toLowerCase()}? Ex.: iogurte natural, aveia, banana, café...`}
            className="min-h-[112px] resize-none"
          />
        </div>

        <PhotoPicker value={value.photo} onChange={(photo) => onChange({ ...value, photo })} />
      </CardContent>
    </Card>
  );
}

function DynamicList({ title, icon: Icon, items, onChange, emptyItem, fields, addLabel }) {
  const updateItem = (id, patch) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    onChange([...items, { id, ...emptyItem }]);
  };

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-100 p-2 text-slate-700">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-slate-950">{title}</h3>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Ainda não adicionaste nenhum registo nesta secção.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_150px_auto]"
              >
                {fields.map((field) => (
                  <Input
                    key={field.key}
                    value={item[field.key] || ""}
                    onChange={(event) => updateItem(item.id, { [field.key]: event.target.value })}
                    placeholder={field.placeholder}
                    className="bg-white"
                  />
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-500"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FoodDiaryApp() {
  const today = toISODate(new Date());
  const [entries, setEntries] = useState({});
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedForExport, setSelectedForExport] = useState([]);
  const [savedPulse, setSavedPulse] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setEntries(parsed.entries || {});
        setSelectedForExport(parsed.selectedForExport || []);
      }
    } catch (error) {
      console.warn("Não foi possível carregar os dados guardados.", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, selectedForExport }));
    setSavedPulse(true);
    const timeout = setTimeout(() => setSavedPulse(false), 900);
    return () => clearTimeout(timeout);
  }, [entries, selectedForExport]);

  const entry = entries[selectedDate] || emptyEntry();

  const registeredDays = useMemo(
    () => Object.keys(entries).filter((date) => hasContent(entries[date])).sort(),
    [entries]
  );

  const updateEntry = (nextEntry) => {
    setEntries((prev) => ({ ...prev, [selectedDate]: nextEntry }));
  };

  const updateMeal = (mealKey, value) => {
    updateEntry({
      ...entry,
      meals: {
        ...entry.meals,
        [mealKey]: value,
      },
    });
  };

  const toggleExportDay = (iso) => {
    setSelectedForExport((prev) =>
      prev.includes(iso) ? prev.filter((date) => date !== iso) : [...prev, iso].sort()
    );
  };

  const selectAllRegistered = () => {
    setSelectedForExport(registeredDays);
  };

  const clearExportSelection = () => {
    setSelectedForExport([]);
  };

  const clearDay = () => {
    setEntries((prev) => {
      const copy = { ...prev };
      delete copy[selectedDate];
      return copy;
    });
    setSelectedForExport((prev) => prev.filter((date) => date !== selectedDate));
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");

    const days = selectedForExport
      .filter((date) => hasContent(entries[date]))
      .sort();

    if (days.length === 0) {
      alert("Seleciona pelo menos um dia com registo para exportar.");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = margin;

    const addPageIfNeeded = (height = 12) => {
      if (y + height > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addWrappedText = (text, x, maxWidth, lineHeight = 5) => {
      const lines = doc.splitTextToSize(text || "—", maxWidth);
      lines.forEach((line) => {
        addPageIfNeeded(lineHeight + 2);
        doc.text(line, x, y);
        y += lineHeight;
      });
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Diário Alimentar", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Exportado em ${new Date().toLocaleDateString("pt-PT")}`, margin, y);
    y += 10;

    for (const day of days) {
      const dayEntry = entries[day];

      addPageIfNeeded(25);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 11, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(prettyDate(day), margin + 3, y + 7);
      y += 17;

      for (const meal of MAIN_MEALS) {
        const mealValue = dayEntry.meals?.[meal.key] || { text: "", photo: "" };
        if (!mealValue.text?.trim() && !mealValue.photo) continue;

        addPageIfNeeded(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(meal.label, margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        addWrappedText(mealValue.text || "Sem descrição escrita.", margin, pageWidth - margin * 2);
        y += 2;

        if (mealValue.photo) {
          try {
            addPageIfNeeded(48);
            doc.addImage(mealValue.photo, undefined, margin, y, 48, 36, undefined, "FAST");
            y += 42;
          } catch (error) {
            doc.setTextColor(120);
            doc.text("[Foto não exportada]", margin, y);
            doc.setTextColor(0);
            y += 6;
          }
        }
      }

      if (dayEntry.extras?.length) {
        addPageIfNeeded(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Snacks / refeições extra", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        dayEntry.extras.forEach((item) => {
          addWrappedText(`• ${item.name || "Sem nome"}${item.quantity ? ` — ${item.quantity}` : ""}`, margin, pageWidth - margin * 2);
        });
        y += 2;
      }

      addPageIfNeeded(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Água", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(dayEntry.waterMl ? `${dayEntry.waterMl} ml` : "Sem registo", margin, y);
      y += 8;

      if (dayEntry.drinks?.length) {
        addPageIfNeeded(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Outras bebidas", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        dayEntry.drinks.forEach((item) => {
          addWrappedText(`• ${item.name || "Sem nome"}${item.quantity ? ` — ${item.quantity}` : ""}`, margin, pageWidth - margin * 2);
        });
        y += 2;
      }

      if (dayEntry.notes?.trim()) {
        addPageIfNeeded(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Notas", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        addWrappedText(dayEntry.notes, margin, pageWidth - margin * 2);
        y += 2;
      }

      y += 6;
    }

    doc.save(`diario-alimentar-${toISODate(new Date())}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fafc,transparent_35%),linear-gradient(135deg,#eef2f7_0%,#ffffff_45%,#f8fafc_100%)] p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> Diário alimentar para nutricionista
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">FoodLog</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Regista refeições, snacks, água, bebidas, fotos e exporta os dias selecionados em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{savedPulse ? "A guardar..." : "Guardado localmente"}</Badge>
            <Button onClick={exportPDF}>
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <Calendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              entries={entries}
              selectedForExport={selectedForExport}
              onSelectDate={setSelectedDate}
              onToggleExport={toggleExportDay}
              onPrev={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              onNext={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            />

            <Card className="bg-white/90 backdrop-blur">
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-950">Exportação</h3>
                    <p className="text-xs text-slate-500">Seleciona os dias com registo para enviar à nutricionista.</p>
                  </div>
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>

                <div className="mb-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllRegistered}>
                    Selecionar todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearExportSelection}>
                    Limpar
                  </Button>
                </div>

                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {registeredDays.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Ainda não há dias registados.</p>
                  ) : (
                    registeredDays.map((day) => (
                      <label
                        key={day}
                        className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedForExport.includes(day)}
                          onChange={() => toggleExportDay(day)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="capitalize text-slate-700">{prettyDate(day)}</span>
                      </label>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registo diário</p>
                  <h2 className="text-2xl font-semibold capitalize text-slate-950">{prettyDate(selectedDate)}</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toggleExportDay(selectedDate)}
                    disabled={!hasContent(entry)}
                  >
                    <FileText className="h-4 w-4" />
                    {selectedForExport.includes(selectedDate) ? "Remover do PDF" : "Selecionar para PDF"}
                  </Button>

                  <Button type="button" variant="danger" onClick={clearDay} disabled={!hasContent(entry)}>
                    <Trash2 className="h-4 w-4" /> Limpar dia
                  </Button>
                </div>
              </div>
            </motion.div>

            <section className="space-y-4">
              {MAIN_MEALS.map((meal) => (
                <MealCard
                  key={meal.key}
                  meal={meal}
                  value={entry.meals?.[meal.key] || { text: "", photo: "" }}
                  onChange={(value) => updateMeal(meal.key, value)}
                />
              ))}
            </section>

            <DynamicList
              title="Snacks ou refeições extra"
              icon={Plus}
              items={entry.extras || []}
              onChange={(extras) => updateEntry({ ...entry, extras })}
              emptyItem={{ name: "", quantity: "" }}
              fields={[
                { key: "name", placeholder: "Nome do snack/refeição" },
                { key: "quantity", placeholder: "Quantidade" },
              ]}
              addLabel="Adicionar"
            />

            <Card>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                    <Droplets className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-950">Água</h3>
                </div>

                <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                  <Input
                    value={entry.waterMl || ""}
                    onChange={(event) => updateEntry({ ...entry, waterMl: event.target.value })}
                    placeholder="Ex.: 1500"
                    inputMode="numeric"
                  />
                  <p className="text-sm text-slate-500">Quantidade diária de água em mililitros. Ex.: 1500 ml, 2000 ml.</p>
                </div>
              </CardContent>
            </Card>

            <DynamicList
              title="Outras bebidas"
              icon={GlassWater}
              items={entry.drinks || []}
              onChange={(drinks) => updateEntry({ ...entry, drinks })}
              emptyItem={{ name: "", quantity: "" }}
              fields={[
                { key: "name", placeholder: "Nome da bebida" },
                { key: "quantity", placeholder: "Quantidade" },
              ]}
              addLabel="Adicionar"
            />

            <Card>
              <CardContent>
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                    <Save className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-950">Notas adicionais</h3>
                </div>

                <Textarea
                  value={entry.notes || ""}
                  onChange={(event) => updateEntry({ ...entry, notes: event.target.value })}
                  placeholder="Ex.: fome ao final da tarde, refeição fora de casa, treino, sintomas, digestão, horários..."
                  className="min-h-[120px] resize-none"
                />
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
