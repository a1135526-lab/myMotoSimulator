import { useConfigStore, usePartCategories } from '@/application';
import { Panel } from '../common/Panel';
import { ResetButton } from '../common/ResetButton';
import { MassEditor } from './MassEditor';
import { PartSelect } from './PartSelect';
import { PresetManager } from './PresetManager';
import { RollerEditor } from './RollerEditor';
import styles from './config.module.css';

export function PartsPanel() {
  const categories = usePartCategories();
  const resetAll = useConfigStore((s) => s.resetAll);

  return (
    <Panel title="改裝設定" actions={<ResetButton onClick={resetAll} label="全部重設" />}>
      <div className={styles.parts}>
        <RollerEditor />
        {categories.map((c) => (
          <PartSelect key={c.category} {...c} />
        ))}
        <MassEditor />
        <PresetManager />
      </div>
    </Panel>
  );
}
