import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { chefs } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { ExternalContactsForm } from './external-contacts-form'

export const metadata: Metadata = { title: 'Settings - External Contacts' }

export default async function ExternalContactsPage() {
  const user = await requireChef()

  const [chef] = await db
    .select({
      bankUrl: chefs.bankUrl,
      accountantEmail: chefs.accountantEmail,
      lawyerPhone: chefs.lawyerPhone,
      lawyerEmail: chefs.lawyerEmail,
      insurancePortalUrl: chefs.insurancePortalUrl,
      websiteAdminUrl: chefs.websiteAdminUrl,
      commissaryUrl: chefs.commissaryUrl,
    })
    .from(chefs)
    .where(eq(chefs.id, user.tenantId!))
    .limit(1)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">External Contacts</h1>
        <p className="mt-1 text-sm text-stone-500">
          Quick links to your external services and professional contacts. These power the exit-link
          system across ChefFlow.
        </p>
      </div>

      <ExternalContactsForm
        initialData={{
          bankUrl: chef?.bankUrl ?? '',
          accountantEmail: chef?.accountantEmail ?? '',
          lawyerPhone: chef?.lawyerPhone ?? '',
          lawyerEmail: chef?.lawyerEmail ?? '',
          insurancePortalUrl: chef?.insurancePortalUrl ?? '',
          websiteAdminUrl: chef?.websiteAdminUrl ?? '',
          commissaryUrl: chef?.commissaryUrl ?? '',
        }}
      />
    </div>
  )
}
