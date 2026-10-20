import type { ConfigSchema, Environment, IInkdropPlugin } from '@inkdropapp/types'
import type { Disposable } from 'event-kit'

import { setEnv } from './env'
import { languageConfig, tr } from './i18n'
import { addMenu } from './menus'
import { NoteSource, SOURCE_ID } from './note-source'

class QuickSearchPlugin implements IInkdropPlugin {
  config: Record<string, ConfigSchema> = {
    excludeNotebooks: {
      title: tr('Notebooks to exclude from results', '検索結果に出さないノートブック'),
      description: tr(
        'Comma-separated notebook names (e.g. Templates, Archive). Their sub-notebooks are excluded too',
        'ノートブック名をカンマ区切りで（例: Templates, Archive）。配下のノートブックも除外されます'
      ),
      type: 'string',
      default: ''
    },
    maxResults: {
      title: tr('Maximum number of results', '表示する件数の上限'),
      type: 'integer',
      default: 50,
      minimum: 10,
      maximum: 200
    },
    language: languageConfig
  }

  private source: NoteSource | null = null
  private subscriptions: Disposable[] = []
  private menu: { dispose(): void } | null = null

  activate(env: Environment) {
    setEnv(env)
    const source = new NoteSource()
    this.source = source
    env.telescope.registerSource(source)
    this.subscriptions.push(
      env.localDB.onNoteChange(() => source.invalidate()),
      env.commands.add(document.body, {
        'quick-search:open': {
          description: tr('Quick Search: Search notes', 'Quick Search: ノートを検索'),
          didDispatch: () =>
            env.commands.dispatch(document.body, 'core:show-telescope', {
              scopedSourceId: SOURCE_ID,
              cancelBehavior: 'close'
            })
        }
      } as any),
      env.config.onDidChange('quick-search.language', () => {
        this.menu?.dispose()
        this.menu = addMenu(env)
      })
    )
    this.menu = addMenu(env)
  }

  deactivate(env: Environment) {
    for (const s of this.subscriptions) s.dispose()
    this.subscriptions = []
    this.menu?.dispose()
    this.menu = null
    if (this.source) env.telescope.unregisterSource(this.source.id)
    this.source = null
    setEnv(undefined)
  }
}

export default new QuickSearchPlugin()
