import { type ComponentType, lazy, Suspense, useState } from "react";
import { useParams } from "react-router";
import type { InstrumentEntry, InstrumentProps } from "../instruments/types";
import { InstrumentErrorBoundary } from "./InstrumentErrorBoundary";
import { findInstrument } from "./registry";

const components = new Map<string, ComponentType<InstrumentProps>>();

function componentFor(entry: InstrumentEntry) {
  let component = components.get(entry.id);
  if (!component) {
    component = lazy(entry.load);
    components.set(entry.id, component);
  }
  return component;
}

export function InstrumentRoute(props: InstrumentProps) {
  const { instrumentId } = useParams();
  const entry = findInstrument(instrumentId);
  const [generation, setGeneration] = useState(0);
  if (!entry) {
    return (
      <main className="not-found">
        <h2>Not found</h2>
        <p>There is no instrument called “{instrumentId}”.</p>
      </main>
    );
  }
  const Instrument = componentFor(entry);
  return (
    <main className="instrument">
      <InstrumentErrorBoundary
        onReset={() => {
          entry.resetStorage();
          setGeneration((g) => g + 1);
        }}
      >
        <Suspense fallback={<p className="loading">Loading…</p>}>
          <Instrument key={generation} {...props} />
        </Suspense>
      </InstrumentErrorBoundary>
    </main>
  );
}
