import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { FEATURE_DOCS } from '../core/state';
import type { ActiveDocId, Feature, FeatureDocKind, Workspace } from '../core/types';
import { activeDocsAreEqual } from '../core/types';
import { featureDirName } from '../utils/slug';

export interface DocumentTreeProps {
  workspace: Workspace;
  onSelect: (next: ActiveDocId) => void;
  onAddFeature: () => void;
  onRenameFeature: (featureId: string, newTitle: string) => void;
  onDeleteFeature: (featureId: string) => void;
}

export function DocumentTree({
  workspace,
  onSelect,
  onAddFeature,
  onRenameFeature,
  onDeleteFeature,
}: DocumentTreeProps) {
  const constitutionActive = workspace.activeDocId.kind === 'constitution';

  return (
    <nav class="doc-tree" aria-label="Workspace documents">
      <Section title="Memory">
        <button
          type="button"
          class={`tree-leaf ${constitutionActive ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'constitution' })}
          aria-current={constitutionActive ? 'true' : undefined}
        >
          <span class="tree-leaf-name">constitution.md</span>
        </button>
      </Section>

      <Section title="Specs">
        {workspace.features.length === 0 ? (
          <p class="tree-empty">No features yet.</p>
        ) : (
          <ul class="tree-list" role="list">
            {workspace.features.map((feature) => (
              <FeatureNode
                key={feature.id}
                feature={feature}
                active={workspace.activeDocId}
                onSelect={onSelect}
                onRename={onRenameFeature}
                onDelete={onDeleteFeature}
              />
            ))}
          </ul>
        )}
        <button type="button" class="tree-add" onClick={onAddFeature}>
          + Add feature
        </button>
      </Section>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="tree-section">
      <h2 class="tree-section-title">{title}</h2>
      {children}
    </section>
  );
}

function FeatureNode({
  feature,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  feature: Feature;
  active: ActiveDocId;
  onSelect: (next: ActiveDocId) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(feature.title);

  function commitRename() {
    setRenaming(false);
    if (draftTitle.trim() && draftTitle.trim() !== feature.title) {
      onRename(feature.id, draftTitle);
    } else {
      setDraftTitle(feature.title);
    }
  }

  function startRename() {
    setDraftTitle(feature.title);
    setRenaming(true);
  }

  function confirmDelete() {
    if (window.confirm(`Delete feature "${feature.title}"?`)) {
      onDelete(feature.id);
    }
  }

  return (
    <li class="tree-feature">
      <header class="tree-feature-header">
        {renaming ? (
          <input
            class="tree-rename-input"
            value={draftTitle}
            autoFocus
            onInput={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setRenaming(false);
                setDraftTitle(feature.title);
              }
            }}
            aria-label={`Rename feature ${feature.title}`}
          />
        ) : (
          <>
            <span class="tree-feature-dir">{featureDirName(feature.number, feature.slug)}</span>
            <span class="tree-feature-title">{feature.title}</span>
          </>
        )}
        <span class="tree-feature-actions">
          <button
            type="button"
            class="tree-action"
            title="Rename feature"
            aria-label={`Rename ${feature.title}`}
            onClick={startRename}
          >
            ✎
          </button>
          <button
            type="button"
            class="tree-action tree-action-danger"
            title="Delete feature"
            aria-label={`Delete ${feature.title}`}
            onClick={confirmDelete}
          >
            ✕
          </button>
        </span>
      </header>
      <ul class="tree-doc-list" role="list">
        {FEATURE_DOCS.map((kind) => (
          <FeatureDocLeaf
            key={kind}
            featureId={feature.id}
            kind={kind}
            active={active}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </li>
  );
}

function FeatureDocLeaf({
  featureId,
  kind,
  active,
  onSelect,
}: {
  featureId: string;
  kind: FeatureDocKind;
  active: ActiveDocId;
  onSelect: (next: ActiveDocId) => void;
}) {
  const target: ActiveDocId = { kind: 'feature', featureId, doc: kind };
  const isActive = activeDocsAreEqual(active, target);
  return (
    <li>
      <button
        type="button"
        class={`tree-leaf ${isActive ? 'is-active' : ''}`}
        onClick={() => onSelect(target)}
        aria-current={isActive ? 'true' : undefined}
      >
        <span class="tree-leaf-name">{kind}.md</span>
      </button>
    </li>
  );
}
