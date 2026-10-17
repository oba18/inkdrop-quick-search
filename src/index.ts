import type { ConfigSchema, Environment, IInkdropPlugin } from '@inkdropapp/types'
import type { Disposable } from 'event-kit'

import { setEnv } from './env'
import { NoteSource, SOURCE_ID } from './note-source'

class QuickSearchPlugin implements IInkdropPlugin {
  config: Record<string, ConfigSchema> = {
    excludeNotebooks: {
      title: '検索結果に出さないノートブック',
      description: 'ノートブック名をカンマ区切りで（例: Templates, Archive）。配下のノートブックも除外されます',
      type: 'string',
      default: ''
    },
    maxResults: {
      title: '表示する件数の上限',
      type: 'integer',
      default: 50,
      minimum: 10,
      maximum: 200
    }
  }

  private source: NoteSource | null = null
  private subscriptions: Disposable[] = []

  activate(env: Environment) {
    setEnv(env)
    const source = new NoteSource()
    this.source = source
    env.telescope.registerSource(source)
    this.subscriptions.push(
      env.localDB.onNoteChange(() => source.invalidate()),
      env.commands.add(document.body, {
        'quick-search:open': () =>
          env.commands.dispatch(document.body, 'core:show-telescope', {
            scopedSourceId: SOURCE_ID,
            cancelBehavior: 'close'
          })
      } as any)
    )
  }

  deactivate(env: Environment) {
    for (const s of this.subscriptions) s.dispose()
    this.subscriptions = []
    if (this.source) env.telescope.unregisterSource(this.source.id)
    this.source = null
    setEnv(undefined)
  }
}

export default new QuickSearchPlugin()
