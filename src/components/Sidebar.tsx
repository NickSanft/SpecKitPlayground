import {
  commitDeleteFeature,
  commitRenameFeature,
  commitSetActiveDoc,
  workspaceSignal,
} from '../core/state';
import { DocumentTree } from './DocumentTree';

export interface SidebarProps {
  onAddFeature: () => void;
}

export function Sidebar({ onAddFeature }: SidebarProps) {
  return (
    <aside class="pane pane-sidebar" aria-label="Document tree">
      <DocumentTree
        workspace={workspaceSignal.value}
        onSelect={commitSetActiveDoc}
        onAddFeature={onAddFeature}
        onRenameFeature={commitRenameFeature}
        onDeleteFeature={commitDeleteFeature}
      />
    </aside>
  );
}
