import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('ingredient price logging revalidates ingredient-facing pages after mutation', () => {
  const source = read('lib/ingredients/pricing.ts')

  assert.match(source, /import \{ revalidatePath \} from 'next\/cache'/)
  assert.match(source, /revalidatePath\('\/recipes\/ingredients'\)/)
  assert.match(
    source,
    /revalidatePath\(`\/inventory\/ingredients\/\$\{validated\.ingredient_id\}`\)/
  )
  assert.match(source, /return \{ success: true, entry: data \}/)
})
