import { useAppearance, type ModelStyle } from '../core/appearance';
export default function ModelFilter() {
  const { style, setStyle } = useAppearance();
  return (
    <label className="model-filter">
      Model{' '}
      <select
        aria-label="Model appearance"
        value={style}
        onChange={(e) => setStyle(e.target.value as ModelStyle)}
      >
        <option value="reference">Reference</option>
        <option value="human">Human</option>
      </select>
    </label>
  );
}
