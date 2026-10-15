"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFaq,
  deleteFaq,
  updateFaq,
  type ListedFaq,
} from "@/server/actions/faqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  faqs: ListedFaq[];
  isAdmin: boolean;
};

export function FaqPanel({ faqs, isAdmin }: Props) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);

  const [createQuestion, setCreateQuestion] = useState("");
  const [createAnswer, setCreateAnswer] = useState("");
  const [createSortOrder, setCreateSortOrder] = useState("0");
  const [createPublished, setCreatePublished] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [createPending, startCreateTransition] = useTransition();
  const [itemPending, startItemTransition] = useTransition();

  function focusCreateForm() {
    createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById("faq-create-question")?.focus();
  }

  function onCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    startCreateTransition(async () => {
      const result = await createFaq({
        question: createQuestion,
        answer: createAnswer,
        sortOrder: Number(createSortOrder),
        isPublished: createPublished,
      });
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setCreateQuestion("");
      setCreateAnswer("");
      setCreateSortOrder("0");
      setCreatePublished(true);
      router.refresh();
    });
  }

  function onDelete(faq: ListedFaq) {
    if (!window.confirm(`Hapus FAQ "${faq.question.slice(0, 80)}"?`)) return;
    startItemTransition(async () => {
      const result = await deleteFaq({ id: faq.id });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      if (editingId === faq.id) setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <form
          ref={createFormRef}
          id="faq-create-form"
          onSubmit={onCreateSubmit}
          className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5"
        >
          <h2 className="text-base font-medium text-[var(--text,#1f2933)]">
            Tambah FAQ
          </h2>
          <FaqFields
            question={createQuestion}
            answer={createAnswer}
            sortOrder={createSortOrder}
            isPublished={createPublished}
            onQuestionChange={setCreateQuestion}
            onAnswerChange={setCreateAnswer}
            onSortOrderChange={setCreateSortOrder}
            onPublishedChange={setCreatePublished}
            disabled={createPending}
            idPrefix="faq-create"
          />
          {createError ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {createError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={createPending}
          >
            {createPending ? "Menyimpan…" : "Simpan FAQ"}
          </Button>
        </form>
      ) : null}

      {faqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
            Belum ada FAQ.
          </p>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 w-full sm:w-auto"
              onClick={focusCreateForm}
            >
              Tambah FAQ pertama
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Daftar FAQ">
          {faqs.map((faq) => (
            <li key={faq.id}>
              {editingId === faq.id ? (
                <FaqEditCard
                  faq={faq}
                  disabled={itemPending}
                  onCancel={() => setEditingId(null)}
                  onSuccess={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <FaqAccordionItem
                  faq={faq}
                  isAdmin={isAdmin}
                  disabled={itemPending}
                  onEdit={() => setEditingId(faq.id)}
                  onDelete={() => onDelete(faq)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqAccordionItem({
  faq,
  isAdmin,
  disabled,
  onEdit,
  onDelete,
}: {
  faq: ListedFaq;
  isAdmin: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="group rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="min-h-11 flex-1 py-1 text-sm font-medium text-[var(--text,#1f2933)] whitespace-pre-wrap">
          {faq.question}
        </span>
        {isAdmin ? (
          <span className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {!faq.isPublished ? (
              <Badge
                variant="outline"
                className="border-[var(--cermin-border,#d9e2ec)] text-[var(--cermin-muted,#5c6b73)]"
              >
                Belum dipublikasikan
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              Ubah
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="min-h-11"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              Hapus
            </Button>
          </span>
        ) : null}
      </summary>
      <div className="border-t border-[var(--cermin-border,#d9e2ec)] px-4 py-3 text-sm text-[var(--text,#1f2933)] whitespace-pre-wrap">
        {faq.answer}
      </div>
    </details>
  );
}

function FaqEditCard({
  faq,
  disabled,
  onCancel,
  onSuccess,
}: {
  faq: ListedFaq;
  disabled: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [sortOrder, setSortOrder] = useState(String(faq.sortOrder));
  const [isPublished, setIsPublished] = useState(faq.isPublished);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idPrefix = useId().replace(/:/g, "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateFaq({
        id: faq.id,
        question,
        answer,
        sortOrder: Number(sortOrder),
        isPublished,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  const formDisabled = disabled || pending;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)] p-4 sm:p-5"
    >
      <p className="text-sm font-medium text-[var(--text,#1f2933)]">Ubah FAQ</p>
      <FaqFields
        question={question}
        answer={answer}
        sortOrder={sortOrder}
        isPublished={isPublished}
        onQuestionChange={setQuestion}
        onAnswerChange={setAnswer}
        onSortOrderChange={setSortOrder}
        onPublishedChange={setIsPublished}
        disabled={formDisabled}
        idPrefix={`faq-edit-${idPrefix}`}
      />
      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={formDisabled}
        >
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={formDisabled}
          onClick={onCancel}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

function FaqFields({
  question,
  answer,
  sortOrder,
  isPublished,
  onQuestionChange,
  onAnswerChange,
  onSortOrderChange,
  onPublishedChange,
  disabled,
  idPrefix,
}: {
  question: string;
  answer: string;
  sortOrder: string;
  isPublished: boolean;
  onQuestionChange: (v: string) => void;
  onAnswerChange: (v: string) => void;
  onSortOrderChange: (v: string) => void;
  onPublishedChange: (v: boolean) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  const publishId = `${idPrefix}-published`;

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-question`}>Pertanyaan</Label>
        <Input
          id={`${idPrefix}-question`}
          name="question"
          required
          maxLength={300}
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-answer`}>Jawaban</Label>
        <Textarea
          id={`${idPrefix}-answer`}
          name="answer"
          required
          maxLength={5000}
          rows={5}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-sort`}>Urutan</Label>
          <Input
            id={`${idPrefix}-sort`}
            name="sortOrder"
            type="number"
            min={0}
            max={10000}
            required
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex min-h-11 items-end pb-1">
          <label
            htmlFor={publishId}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--text,#1f2933)]"
          >
            <input
              id={publishId}
              name="isPublished"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => onPublishedChange(e.target.checked)}
              disabled={disabled}
              className="size-4 rounded border-[var(--cermin-border,#d9e2ec)] text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus,#0b6e4f)]"
            />
            Publikasikan
          </label>
        </div>
      </div>
    </div>
  );
}
