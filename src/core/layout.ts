import { signal } from '@preact/signals';

export type MobilePane = 'tree' | 'editor' | 'preview';

export const sidebarVisible = signal<boolean>(true);
export const previewVisible = signal<boolean>(true);
export const mobilePane = signal<MobilePane>('editor');

export function toggleSidebar(): void {
  sidebarVisible.value = !sidebarVisible.value;
}
export function togglePreview(): void {
  previewVisible.value = !previewVisible.value;
}
export function setMobilePane(p: MobilePane): void {
  mobilePane.value = p;
}
