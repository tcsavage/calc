import { useMemo } from "react";
import { useStore } from "zustand";
import { computeReadout } from "../../../core/slide-rule/readout";
import type { LinearRule } from "../../../core/slide-rule/rule/types";
import type { SlideRuleStore } from "../../slide-rule-kit/state/store";
import { Notices } from "../../slide-rule-kit/ui/Notices";
import { Readout } from "../../slide-rule-kit/ui/Readout";
import { ScaleEditorDrawer } from "../../slide-rule-kit/ui/ScaleEditorDrawer";
import { SlideRuleToolbar } from "../../slide-rule-kit/ui/SlideRuleToolbar";
import { skinStyle } from "../../slide-rule-kit/ui/skinStyle";
import { LINEAR_CONFIG, SECTION_NAMES } from "../config";
import { RuleViewport } from "./RuleViewport";

interface SlideRulePageProps {
  store: SlideRuleStore<LinearRule>;
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
        presets={LINEAR_CONFIG.presets}
        readoutVisible={readoutVisible}
        onToggleReadout={onToggleReadout}
        onShare={onShare}
      />
      <RuleViewport rule={rule} state={state} loupePinned={loupePinned} onMove={onMove} />
      {readoutVisible && <Readout entries={readout} sectionNames={SECTION_NAMES} />}
      {editorOpen && <ScaleEditorDrawer store={store} sectionNames={SECTION_NAMES} />}
    </div>
  );
}
