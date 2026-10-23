import { useSlideRuleInstrument } from "../slide-rule-kit/ui/useSlideRuleInstrument";
import type { InstrumentProps } from "../types";
import { LINEAR_CONFIG } from "./config";
import { SlideRulePage } from "./ui/SlideRulePage";

export default function LinearSlideRule({ settings, updateSettings }: InstrumentProps) {
  const { store, onShare } = useSlideRuleInstrument(LINEAR_CONFIG);
  return (
    <SlideRulePage
      store={store}
      readoutVisible={settings.readoutVisible}
      onToggleReadout={() => updateSettings({ readoutVisible: !settings.readoutVisible })}
      onShare={onShare}
    />
  );
}
