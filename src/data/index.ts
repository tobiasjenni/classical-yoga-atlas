import { asanaSchema, type Asana } from '../core/schema';
const modules = import.meta.glob('./asanas/*.json', { eager: true, import: 'default' });
export const asanas: Asana[] = Object.values(modules)
  .map((value) => asanaSchema.parse(value))
  .sort((a, b) => a.iast.localeCompare(b.iast));
export const byId = Object.fromEntries(asanas.map((a) => [a.id, a]));
export const finalPose = (a: Asana) => a.keyframes.find((f) => f.phase === 'final')!.pose;
export { normalizeSearch } from '../core/search';
