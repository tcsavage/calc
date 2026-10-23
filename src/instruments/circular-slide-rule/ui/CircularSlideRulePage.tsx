import { useMemo } from "react";
import { useStore } from "zustand";
import { computeReadout } from "../../../core/slide-rule/readout";
import type { CircularRule } from "../../../core/slide-rule/rule/types";
import type { SlideRuleStore } from "../../slide-rule-kit/state/store";
import { Notices } from "../../slide-rule-kit/ui/Notices";
import { Readout } from "../../slide-rule-kit/ui/Readout";
import { ScaleEditorDrawer } from "../../slide-rule-kit/ui/ScaleEditorDrawer";
import { SlideRuleToolbar } from "../../slide-rule-kit/ui/SlideRuleToolbar";
import { skinStyle } from "../../slide-rule-kit/ui/skinStyle";
import { CIRCULAR_CONFIG, EDITOR_OPTIONS, SECTION_NAMES } from "../config";
import { CircularViewport } from "./CircularViewport";

interface CircularSlideRulePageProps {
  store: SlideRuleStore<CircularRule>;
  readoutVisible: boolean;
  onToggleReadout?(): void;
  onShare?(): void;
}

export function CircularSlideRulePage({
  store,
  readoutVisible,
  onToggleReadout,
  onShare,
}: CircularSlideRulePageProps) {
  const rule = useStore(store, (s) => s.rule);
  const state = useStore(store, (s) => s.state);
  const notices = useStore(store, (s) => s.notices);
  const loupePinned = useStore(store, (s) => s.loupePinned);
  const editorOpen = useStore(store, (s) => s.editorOpen);
  const actions = store.getState();
  const readout = useMemo(() => computeReadout(rule, state), [rule, state]);
  const onMove = (part: "slide" | "cursor", delta: number) =>
    part === "slide" ? actions.moveSlideBy(delta) : actions.moveCursorBy(delta);

  return (
    <div className="slide-rule-page rule-skin" style={skinStyle(rule.skin)}>
      <Notices notices={notices} onDismiss={actions.dismissNotice} />
      <SlideRuleToolbar
        store={store}
        presets={CIRCULAR_CONFIG.presets}
        readoutVisible={readoutVisible}
        onToggleReadout={onToggleReadout}
        onShare={onShare}
      >
        <button
          type="button"
          aria-pressed={state.rotateView ?? false}
          onClick={actions.toggleRotateView}
        >
          Rotate view
        </button>
      </SlideRuleToolbar>
      <CircularViewport rule={rule} state={state} loupePinned={loupePinned} onMove={onMove} />
      {readoutVisible && <Readout entries={readout} sectionNames={SECTION_NAMES} />}
      {editorOpen && <ScaleEditorDrawer store={store} {...EDITOR_OPTIONS} />}
    </div>
  );
}
