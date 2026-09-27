import { getChefOperatorTodayJob } from '@/lib/operator-job/read-model'
import { OperatorJobPath } from '@/components/operator-job/operator-job-path'

export async function TodayOperatorJobSection() {
  const journey = await getChefOperatorTodayJob()
  return <OperatorJobPath journey={journey} />
}
