import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function MenuEditorLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-menus-editor" size="sm" />
      <FormPageSkeleton fields={6} />
    </div>
  )
}
