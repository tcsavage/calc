import { useSlideRuleInstrument } from "../slide-rule-kit/ui/useSlideRuleInstrument";
import type { InstrumentProps } from "../types";
import { CYLINDRICAL_CONFIG } from "./config";
import { CylindricalSlideRulePage } from "./ui/CylindricalSlideRulePage";

export default function CylindricalSlideRule({ settings, updateSettings }: InstrumentProps) {
  const { store, onShare } = useSlideRuleInstrument(CYLINDRICAL_CONFIG);
  return (
    <CylindricalSlideRulePage
      store={store}
      readoutVisible={settings.readoutVisible}
      onToggleReadout={() => updateSettings({ readoutVisible: !settings.readoutVisible })}
      onShare={onShare}
    />
  );
}
