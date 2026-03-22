import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react";
import { useCreateGig, useUpdateMe, useCategories } from "@/api/hooks";
import { useGigDraftStore } from "@/store/gigDraftStore";
import { useAuthStore } from "@/store/authStore";
import { useTelegram } from "@/hooks/useTelegram";
import apiClient from "@/api/client";

const STEPS = ["Основное", "Описание", "Медиа", "Пакеты", "Требования"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i <= current ? "bg-accent flex-1" : "bg-gray-200 flex-1"
          }`}
        />
      ))}
    </div>
  );
}

export default function CreateGig() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { user } = useAuthStore();
  const { draft, updateDraft, setStep, resetDraft } = useGigDraftStore();
  const { data: categories } = useCategories();
  const createGig = useCreateGig();
  const updateMe = useUpdateMe();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const step = draft.step;

  const goNext = () => {
    haptic.impact("light");
    setStep(Math.min(step + 1, STEPS.length - 1));
  };
  const goPrev = () => {
    if (step === 0) navigate(-1);
    else { haptic.impact("light"); setStep(step - 1); }
  };

  const addTag = () => {
    if (tagInput.trim() && !draft.tags.includes(tagInput.trim())) {
      updateDraft({ tags: [...draft.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => updateDraft({ tags: draft.tags.filter(t => t !== tag) });

  const addFaq = () => updateDraft({ faq: [...draft.faq, { question: "", answer: "" }] });
  const updateFaq = (i: number, field: "question" | "answer", value: string) => {
    const updated = [...draft.faq];
    updated[i] = { ...updated[i], [field]: value };
    updateDraft({ faq: updated });
  };
  const removeFaq = (i: number) => updateDraft({ faq: draft.faq.filter((_, idx) => idx !== i) });

  const updatePackage = (i: number, field: string, value: unknown) => {
    const updated = [...draft.packages];
    updated[i] = { ...updated[i], [field]: value };
    updateDraft({ packages: updated });
  };

  const addFeature = (pkgIdx: number) => {
    const pkg = { ...draft.packages[pkgIdx] };
    pkg.features = [...(pkg.features || []), ""];
    const updated = [...draft.packages];
    updated[pkgIdx] = pkg;
    updateDraft({ packages: updated });
  };

  const updateFeature = (pkgIdx: number, featIdx: number, value: string) => {
    const pkg = { ...draft.packages[pkgIdx] };
    const features = [...(pkg.features || [])];
    features[featIdx] = value;
    pkg.features = features;
    const updated = [...draft.packages];
    updated[pkgIdx] = pkg;
    updateDraft({ packages: updated });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    haptic.notification("success");

    // Ensure user is freelancer
    if (!user?.is_freelancer) {
      await updateMe.mutateAsync({ is_freelancer: true });
    }

    createGig.mutate({
      title: draft.title,
      description: draft.description,
      category_id: draft.category_id!,
      subcategory_id: draft.subcategory_id,
      tags: draft.tags,
      packages: draft.packages as never,
      requirements: draft.requirements,
      faq: draft.faq,
    }, {
      onSuccess: (gig) => {
        resetDraft();
        navigate(`/gig/${gig.id}`);
      },
      onSettled: () => setIsSubmitting(false),
    });
  };

  const selectedCategory = categories?.find(c => c.id === draft.category_id);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={goPrev} className="p-1 -ml-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading font-bold text-lg flex-1">
          {step === STEPS.length - 1 ? "Предпросмотр" : `Шаг ${step + 1}: ${STEPS[step]}`}
        </h1>
      </div>

      <StepIndicator current={step} total={STEPS.length} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="px-4 space-y-4 pb-32"
        >
          {/* Step 0: Basic info */}
          {step === 0 && (
            <>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Заголовок услуги *</label>
                <input
                  className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none"
                  placeholder="Например: Создам логотип для вашего бизнеса"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  maxLength={100}
                />
                <p className="text-xs text-tg-hint mt-1">{draft.title.length}/100</p>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5">Категория *</label>
                <select
                  className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none"
                  value={draft.category_id || ""}
                  onChange={(e) => updateDraft({ category_id: Number(e.target.value), subcategory_id: undefined })}
                >
                  <option value="">Выберите категорию</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                  ))}
                </select>
              </div>

              {selectedCategory && selectedCategory.subcategories.length > 0 && (
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Подкатегория</label>
                  <select
                    className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none"
                    value={draft.subcategory_id || ""}
                    onChange={(e) => updateDraft({ subcategory_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Не указана</option>
                    {selectedCategory.subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold block mb-1.5">Теги</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {draft.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-xs">
                      {tag}
                      <button onClick={() => removeTag(tag)}><Trash2 size={11} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-tg-secondary-bg rounded-xl px-4 py-2.5 text-sm outline-none"
                    placeholder="Добавить тег"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                  />
                  <button onClick={addTag} className="px-3 py-2.5 bg-accent/10 text-accent rounded-xl">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 1: Description */}
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Описание *</label>
                <textarea
                  className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                  placeholder="Подробно опишите вашу услугу, что включено, опыт и т.д."
                  rows={8}
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                />
                <p className="text-xs text-tg-hint mt-1">{draft.description.length}/5000</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">FAQ</label>
                  <button onClick={addFaq} className="text-xs text-accent flex items-center gap-1">
                    <Plus size={14} /> Добавить
                  </button>
                </div>
                {draft.faq.map((item, i) => (
                  <div key={i} className="bg-tg-secondary-bg rounded-2xl p-3 mb-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-medium text-tg-hint">Вопрос {i + 1}</span>
                      <button onClick={() => removeFaq(i)} className="text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm outline-none mb-2"
                      placeholder="Вопрос"
                      value={item.question}
                      onChange={(e) => updateFaq(i, "question", e.target.value)}
                    />
                    <input
                      className="w-full bg-white rounded-xl px-3 py-2 text-sm outline-none"
                      placeholder="Ответ"
                      value={item.answer}
                      onChange={(e) => updateFaq(i, "answer", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Media */}
          {step === 2 && (
            <div>
              <label className="text-sm font-semibold block mb-1.5">Галерея (до 5 фото + 1 видео)</label>
              <p className="text-xs text-tg-hint mb-3">Загрузите изображения после создания услуги на странице редактирования</p>

              <div className="grid grid-cols-3 gap-2">
                {draft.gallery.map((item, i) => (
                  <div key={i} className="aspect-square bg-tg-secondary-bg rounded-xl overflow-hidden">
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="aspect-square bg-tg-secondary-bg rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <span className="text-tg-hint text-3xl">+</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Packages */}
          {step === 3 && (
            <div className="space-y-4">
              {draft.packages.map((pkg, i) => (
                <div key={i} className="bg-tg-secondary-bg rounded-2xl p-4">
                  <h3 className="font-semibold text-sm mb-3">
                    {i === 0 ? "🌿 Базовый" : i === 1 ? "⭐ Стандарт" : "👑 Премиум"}
                  </h3>
                  <div className="space-y-3">
                    <input
                      className="w-full bg-white rounded-xl px-3 py-2.5 text-sm outline-none"
                      placeholder="Описание пакета"
                      value={pkg.description || ""}
                      onChange={(e) => updatePackage(i, "description", e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-tg-hint">Цена ₽</label>
                        <input
                          type="number"
                          className="w-full bg-white rounded-xl px-3 py-2 text-sm outline-none"
                          value={pkg.price || ""}
                          onChange={(e) => updatePackage(i, "price", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-tg-hint">Дней</label>
                        <input
                          type="number"
                          className="w-full bg-white rounded-xl px-3 py-2 text-sm outline-none"
                          value={pkg.delivery_days || ""}
                          onChange={(e) => updatePackage(i, "delivery_days", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-tg-hint">Правок</label>
                        <input
                          type="number"
                          className="w-full bg-white rounded-xl px-3 py-2 text-sm outline-none"
                          value={pkg.revisions || ""}
                          onChange={(e) => updatePackage(i, "revisions", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-tg-hint">Включено</label>
                        <button onClick={() => addFeature(i)} className="text-xs text-accent flex items-center gap-0.5">
                          <Plus size={12} /> Добавить
                        </button>
                      </div>
                      {(pkg.features || []).map((feat, fi) => (
                        <div key={fi} className="flex gap-2 mb-1.5">
                          <Check size={14} className="text-success mt-2.5 flex-shrink-0" />
                          <input
                            className="flex-1 bg-white rounded-xl px-3 py-2 text-sm outline-none"
                            placeholder="Что включено"
                            value={feat}
                            onChange={(e) => updateFeature(i, fi, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Requirements & preview */}
          {step === 4 && (
            <>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Требования от заказчика</label>
                <textarea
                  className="w-full bg-tg-secondary-bg rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                  placeholder="Что нужно предоставить для начала работы?"
                  rows={4}
                  value={draft.requirements}
                  onChange={(e) => updateDraft({ requirements: e.target.value })}
                />
              </div>

              {/* Preview */}
              <div className="bg-tg-secondary-bg rounded-2xl p-4">
                <h3 className="font-semibold text-sm mb-3">Предпросмотр</h3>
                <p className="font-bold text-base mb-1">{draft.title || "—"}</p>
                <p className="text-xs text-tg-hint mb-2 line-clamp-3">{draft.description || "—"}</p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {draft.tags.map(t => <span key={t} className="badge-accent text-[10px]">{t}</span>)}
                </div>
                <div className="flex gap-3 text-xs">
                  {draft.packages.map((p, i) => (
                    <div key={i} className="bg-white rounded-xl p-2 flex-1 text-center">
                      <p className="font-bold text-accent">{p.price} ₽</p>
                      <p className="text-tg-hint">{i === 0 ? "Базовый" : i === 1 ? "Стандарт" : "Премиум"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-2">
        {step > 0 && (
          <button onClick={goPrev} className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
            <ArrowLeft size={18} />
            Назад
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={step === 0 && (!draft.title || !draft.category_id)}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5"
          >
            Далее
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || createGig.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? "Публикация..." : (
              <>
                <Check size={18} />
                Опубликовать
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
