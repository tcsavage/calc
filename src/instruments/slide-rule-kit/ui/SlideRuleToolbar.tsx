import type { ReactNode } from "react";
import { useStore } from "zustand";
import type { RuleDefinition } from "../../../core/slide-rule/rule/types";
import type { SlideRuleStore } from "../state/store";
import { RulePicker } from "./RulePicker";

interface SlideRuleToolbarProps<R extends RuleDefinition> {
  store: SlideRuleStore<R>;
  presets: readonly R[];
  readoutVisible: boolean;
  onToggleReadout?(): void;
  onShare?(): void;
  /** False for rules with only one face, such as cylinders. */
  flippable?: boolean;
  /** Controls specific to one kind of rule, shown after Reset. */
  children?: ReactNode;
}

export function SlideRuleToolbar<R extends RuleDefinition>({
  store,
  presets,
  readoutVisible,
  onToggleReadout,
  onShare,
  flippable = true,
  children,
}: SlideRuleToolbarProps<R>) {
  const rule = useStore(store, (s) => s.rule);
  const face = useStore(store, (s) => s.state.face);
  const savedRules = useStore(store, (s) => s.savedRules);
  const loupePinned = useStore(store, (s) => s.loupePinned);
  const editorOpen = useStore(store, (s) => s.editorOpen);
  const actions = store.getState();

  return (
    <div className="toolbar" role="toolbar" aria-label="Slide rule controls">
      <RulePicker
        rule={rule}
        presets={presets}
        savedRules={savedRules}
        onSelect={actions.selectRule}
      />
      {flippable && (
        <button
          type="button"
          onClick={actions.flip}
          aria-label={`Flip to ${face === "front" ? "back" : "front"}`}
        >
          {face === "front" ? "Front" : "Back"} ⇄
        </button>
      )}
      <button type="button" onClick={actions.resetPosition}>
        Reset
      </button>
      {children}
      {onToggleReadout && (
        <button type="button" aria-pressed={readoutVisible} onClick={onToggleReadout}>
          Readout
        </button>
      )}
      <button type="button" aria-pressed={loupePinned} onClick={actions.toggleLoupePinned}>
        Pin loupe
      </button>
      <button
        type="button"
        aria-pressed={editorOpen}
        onClick={() => actions.setEditorOpen(!editorOpen)}
      >
        Edit
      </button>
      {onShare && (
        <button type="button" onClick={onShare}>
          Share
        </button>
      )}
    </div>
  );
}
