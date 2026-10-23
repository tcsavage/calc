import { useMemo } from "react";
import { useStore } from "zustand";
import { computeReadout } from "../../../core/slide-rule/readout";
import type { CylindricalRule } from "../../../core/slide-rule/rule/types";
import type { SlideRuleStore } from "../../slide-rule-kit/state/store";
import { Notices } from "../../slide-rule-kit/ui/Notices";
import { Readout } from "../../slide-rule-kit/ui/Readout";
import { ScaleEditorDrawer } from "../../slide-rule-kit/ui/ScaleEditorDrawer";
import { SlideRuleToolbar } from "../../slide-rule-kit/ui/SlideRuleToolbar";
import { skinStyle } from "../../slide-rule-kit/ui/skinStyle";
import { CYLINDRICAL_CONFIG, EDITOR_OPTIONS, SECTION_NAMES } from "../config";
import { HelixViewport } from "./HelixViewport";

interface CylindricalSlideRulePageProps {
  store: SlideRuleStore<CylindricalRule>;
  readoutVisible: boolean;
  onToggleReadout?(): void;
  onShare?(): void;
}

export function CylindricalSlideRulePage({
  store,
  readoutVisible,
  onToggleReadout,
  onShare,
}: CylindricalSlideRulePageProps) {
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
        presets={CYLINDRICAL_CONFIG.presets}
        readoutVisible={readoutVisible}
        onToggleReadout={onToggleReadout}
        onShare={onShare}
        flippable={false}
      />
      <HelixViewport rule={rule} state={state} loupePinned={loupePinned} onMove={onMove} />
      {readoutVisible && <Readout entries={readout} sectionNames={SECTION_NAMES} />}
      {editorOpen && <ScaleEditorDrawer store={store} {...EDITOR_OPTIONS} />}
    </div>
  );
}
