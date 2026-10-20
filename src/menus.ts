import type { Environment } from '@inkdropapp/types'

import { tr } from './i18n'

/** Registers the Plugins menu entry in the UI language. */
export function addMenu(env: Environment): { dispose(): void } {
  return env.menu.add([
    {
      label: 'Plugins',
      submenu: [
        {
          label: 'Quick Search',
          submenu: [{ label: tr('Search Notes', 'ノートを検索'), command: 'quick-search:open' }]
        }
      ]
    }
  ] as any)
}
