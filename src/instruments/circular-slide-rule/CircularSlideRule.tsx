import { useSlideRuleInstrument } from "../slide-rule-kit/ui/useSlideRuleInstrument";
import type { InstrumentProps } from "../types";
import { CIRCULAR_CONFIG } from "./config";
import { CircularSlideRulePage } from "./ui/CircularSlideRulePage";

export default function CircularSlideRule({ settings, updateSettings }: InstrumentProps) {
  const { store, onShare } = useSlideRuleInstrument(CIRCULAR_CONFIG);
  return (
    <CircularSlideRulePage
      store={store}
      readoutVisible={settings.readoutVisible}
      onToggleReadout={() => updateSettings({ readoutVisible: !settings.readoutVisible })}
      onShare={onShare}
    />
  );
}
