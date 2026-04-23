import type { TaskCreateDraft } from '@/lib/tasks/create-form-state'
import { TaskCreateRecurringField } from './task-create-recurring-field'

type StaffOption = { id: string; name: string; role: string }
type StationOption = { id: string; name: string }

type Props = {
  staff: StaffOption[]
  stations: StationOption[]
  draft: TaskCreateDraft
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const FIELD_CLASSNAME =
  'block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
export function TaskCreateFields({
  staff,
  stations,
  draft,
}: Props) {
  const hasInvalidAssignee =
    Boolean(draft.assigned_to) && !staff.some((member) => member.id === draft.assigned_to)
  const hasInvalidStation =
    Boolean(draft.station_id) && !stations.some((station) => station.id === draft.station_id)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="task-create-title" className="mb-1.5 block text-sm font-medium text-stone-300">
          Title
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          id="task-create-title"
          name="title"
          defaultValue={draft.title}
          placeholder="What needs to be done?"
          required
          className={FIELD_CLASSNAME}
        />
      </div>

      <div>
        <label
          htmlFor="task-create-description"
          className="mb-1.5 block text-sm font-medium text-stone-300"
        >
          Description
        </label>
        <textarea
          id="task-create-description"
          name="description"
          defaultValue={draft.description}
          placeholder="Additional details..."
          rows={2}
          className={FIELD_CLASSNAME}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Assign to</label>
          <select
            name="assigned_to"
            defaultValue={draft.assigned_to}
            className={FIELD_CLASSNAME}
          >
            {hasInvalidAssignee ? (
              <option value={draft.assigned_to}>Current invalid value ({draft.assigned_to})</option>
            ) : null}
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">Station</label>
          <select
            name="station_id"
            defaultValue={draft.station_id}
            className={FIELD_CLASSNAME}
          >
            {hasInvalidStation ? (
              <option value={draft.station_id}>Current invalid value ({draft.station_id})</option>
            ) : null}
            <option value="">No station</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="task-create-due-date"
            className="mb-1.5 block text-sm font-medium text-stone-300"
          >
            Due date
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="task-create-due-date"
            name="due_date"
            type="date"
            defaultValue={draft.due_date}
            required
            className={FIELD_CLASSNAME}
          />
        </div>

        <div>
          <label
            htmlFor="task-create-due-time"
            className="mb-1.5 block text-sm font-medium text-stone-300"
          >
            Due time
          </label>
          <input
            id="task-create-due-time"
            name="due_time"
            type="time"
            defaultValue={draft.due_time}
            className={FIELD_CLASSNAME}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-300">Priority</label>
        <select
          name="priority"
          defaultValue={draft.priority}
          className={FIELD_CLASSNAME}
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="task-create-notes" className="mb-1.5 block text-sm font-medium text-stone-300">
          Notes
        </label>
        <textarea
          id="task-create-notes"
          name="notes"
          defaultValue={draft.notes}
          placeholder="Any additional notes..."
          rows={2}
          className={FIELD_CLASSNAME}
        />
      </div>

      <TaskCreateRecurringField initialSerializedRule={draft.recurring_rule} />
    </div>
  )
}
