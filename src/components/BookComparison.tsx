import { byId } from '../data';
import FlowPlayer, { FlowScene, useFlow } from './FlowPlayer';
export default function BookComparison({ id }: { id: string }) {
  const asana = byId[id];
  useFlow(asana.keyframes);
  return (
    <section className="viewer-panel">
      <FlowScene frames={asana.keyframes} label={`${asana.iast} HYP comparison study`} />
      <FlowPlayer frames={asana.keyframes} />
    </section>
  );
}
