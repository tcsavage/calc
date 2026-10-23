import { type FormEvent, useState } from "react";
import { useStore } from "zustand";
import {
  addScale,
  moveScale,
  removeScale,
  type SectionRef,
  toggleInk,
} from "../../../core/slide-rule/rule/edits";
import { FACES, type Face, SECTIONS, type Section } from "../../../core/slide-rule/rule/types";
import { getScale, SCALES } from "../../../core/slide-rule/scales/library";
import type { SlideRuleStore } from "../state/store";

const SECTION_NAMES: Record<Section, string> = {
  upper: "Upper stator",
  slide: "Slide",
  lower: "Lower stator",
};
const FACE_NAMES: Record<Face, string> = { front: "Front", back: "Back" };

export function ScaleEditorDrawer({ store }: { store: SlideRuleStore }) {
  const rule = useStore(store, (s) => s.rule);
  const visibleFace = useStore(store, (s) => s.state.face);
  const savedRules = useStore(store, (s) => s.savedRules);
  const { editRule, saveAs, renameSaved, deleteSaved, setEditorOpen } = store.getState();
  const [face, setFace] = useState<Face>(visibleFace);
  const [name, setName] = useState(rule.name);
  const isSaved = savedRules.some((saved) => saved.id === rule.id);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveAs(name);
  };

  return (
    <aside className="editor" aria-label="Scale editor">
      <header className="editor-header">
        <h2>Edit scales</h2>
        <button type="button" onClick={() => setEditorOpen(false)}>
          Close
        </button>
      </header>
      <fieldset className="editor-tabs">
        <legend className="visually-hidden">Face to edit</legend>
        {FACES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={face === candidate}
            onClick={() => setFace(candidate)}
          >
            {FACE_NAMES[candidate]}
          </button>
        ))}
      </fieldset>
      {SECTIONS.map((section) => (
        <SectionEditor
          key={section}
          reference={{ face, section }}
          scales={rule.faces[face][section].map((placement) => ({
            id: placement.scale,
            ink: placement.ink ?? getScale(placement.scale)?.ink ?? "black",
          }))}
          onEdit={editRule}
        />
      ))}
      <form className="editor-save" onSubmit={submit}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Rule name"
          />
        </label>
        <button type="submit">Save as</button>
        {isSaved && (
          <>
            <button type="button" onClick={() => renameSaved(rule.id, name)}>
              Rename
            </button>
            <button type="button" onClick={() => deleteSaved(rule.id)}>
              Delete
            </button>
          </>
        )}
      </form>
    </aside>
  );
}

function SectionEditor({
  reference,
  scales,
  onEdit,
}: {
  reference: SectionRef;
  scales: { id: string; ink: string }[];
  onEdit: ReturnType<SlideRuleStore["getState"]>["editRule"];
}) {
  const title = SECTION_NAMES[reference.section];
  return (
    <section
      className="editor-section"
      aria-label={`${FACE_NAMES[reference.face]} ${title.toLowerCase()}`}
    >
      <h3>{title}</h3>
      <ol>
        {scales.map((scale, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a section may hold the same scale twice
          <li key={`${index}-${scale.id}`}>
            <span className={`scale-chip ink-${scale.ink}`}>{scale.id}</span>
            <span className="scale-formula">{getScale(scale.id)?.formula}</span>
            <span className="row-actions">
              <button
                type="button"
                aria-label={`Move ${scale.id} up`}
                disabled={index === 0}
                onClick={() => onEdit((rule) => moveScale(rule, reference, index, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${scale.id} down`}
                disabled={index === scales.length - 1}
                onClick={() => onEdit((rule) => moveScale(rule, reference, index, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Toggle ink of ${scale.id}`}
                onClick={() => onEdit((rule) => toggleInk(rule, reference, index))}
              >
                Ink
              </button>
              <button
                type="button"
                aria-label={`Remove ${scale.id}`}
                onClick={() => onEdit((rule) => removeScale(rule, reference, index))}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      <select
        aria-label={`Add scale to ${title.toLowerCase()}`}
        value=""
        onChange={(event) => {
          const id = event.target.value;
          if (id) onEdit((rule) => addScale(rule, reference, id));
        }}
      >
        <option value="">Add scale…</option>
        {SCALES.map((scale) => (
          <option key={scale.id} value={scale.id}>
            {scale.id}: {scale.formula} ({scale.description})
          </option>
        ))}
      </select>
    </section>
  );
}
