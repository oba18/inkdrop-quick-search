import { type TaskInfo, dueState, formatDue } from './task-info'
import { tr } from './i18n'

export interface TagView {
  name: string
  color: string
}

/** Tags, then the task's priority and due date, at the right side of a result row */
export function Accessory({ tags, task }: { tags: TagView[]; task: TaskInfo | null }) {
  const state = task?.due ? dueState(task.due, task.done) : null
  return (
    <span className="quick-search-accessory">
      {tags.map(tag => (
        <span key={tag.name} className={`ui tag label ${tag.color} small`}>
          {tag.name}
        </span>
      ))}
      {task?.priority ? (
        <span className="quick-search-priority" title={tr(`Priority ${task.priority}`, `優先度 ${task.priority}`)}>
          {'⭐'.repeat(task.priority)}
        </span>
      ) : null}
      {task?.due ? (
        <span className={`quick-search-due ${state ?? ''} ${task.done ? 'done' : ''}`}>⏰{formatDue(task.due)}</span>
      ) : null}
    </span>
  )
}
