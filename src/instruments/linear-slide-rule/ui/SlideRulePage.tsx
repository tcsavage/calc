import { useMemo } from "react";
import { useStore } from "zustand";
import { computeReadout } from "../../../core/slide-rule/readout";
import type { SlideRuleStore } from "../state/store";
import { Notices } from "./Notices";
import { Readout } from "./Readout";
import { RulePicker } from "./RulePicker";
import { RuleViewport } from "./RuleViewport";
import { ScaleEditorDrawer } from "./ScaleEditorDrawer";
import { skinStyle } from "./skinStyle";

interface SlideRulePageProps {
  store: SlideRuleStore;
  readoutVisible: boolean;
  onToggleReadout?(): void;
  onShare?(): void;
}

export function SlideRulePage({
  store,
  readoutVisible,
  onToggleReadout,
  onShare,
}: SlideRulePageProps) {
  const rule = useStore(store, (s) => s.rule);
  const state = useStore(store, (s) => s.state);
  const savedRules = useStore(store, (s) => s.savedRules);
  const notices = useStore(store, (s) => s.notices);
  const loupePinned = useStore(store, (s) => s.loupePinned);
  const editorOpen = useStore(store, (s) => s.editorOpen);
  const actions = store.getState();
  const readout = useMemo(() => computeReadout(rule.faces[state.face], state), [rule, state]);
  const onMove = (part: "slide" | "cursor", delta: number) =>
    part === "slide" ? actions.moveSlideBy(delta) : actions.moveCursorBy(delta);

  return (
    <div className="slide-rule-page rule-skin" style={skinStyle(rule.skin)}>
      <Notices notices={notices} onDismiss={actions.dismissNotice} />
      <div className="toolbar" role="toolbar" aria-label="Slide rule controls">
        <RulePicker rule={rule} savedRules={savedRules} onSelect={actions.selectRule} />
        <button
          type="button"
          onClick={actions.flip}
          aria-label={`Flip to ${state.face === "front" ? "back" : "front"}`}
        >
          {state.face === "front" ? "Front" : "Back"} ⇄
        </button>
        <button type="button" onClick={actions.resetPosition}>
          Reset
        </button>
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
      <RuleViewport rule={rule} state={state} loupePinned={loupePinned} onMove={onMove} />
      {readoutVisible && <Readout entries={readout} />}
      {editorOpen && <ScaleEditorDrawer store={store} />}
    </div>
  );
}
