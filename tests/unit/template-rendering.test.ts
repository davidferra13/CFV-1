import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplateVariables } from '../../lib/communication/template-utils'

describe('renderTemplateVariables', () => {
  it('replaces simple variables', () => {
    const result = renderTemplateVariables('Hello {{client_name}}!', { client_name: 'Sarah' })
    assert.strictEqual(result, 'Hello Sarah!')
  })

  it('replaces multiple variables', () => {
    const result = renderTemplateVariables(
      '{{client_name}} booked {{occasion}} on {{event_date}}',
      { client_name: 'Sarah', occasion: 'Birthday Dinner', event_date: 'March 20' }
    )
    assert.strictEqual(result, 'Sarah booked Birthday Dinner on March 20')
  })

  it('handles variables with spaces around braces', () => {
    const result = renderTemplateVariables('Hello {{ client_name }}!', { client_name: 'Sarah' })
    assert.strictEqual(result, 'Hello Sarah!')
  })

  it('leaves unmatched variables intact when not in variables object', () => {
    const result = renderTemplateVariables('Hello {{client_name}}, your event is {{event_date}}', {
      client_name: 'Sarah',
    })
    assert.strictEqual(result, 'Hello Sarah, your event is {{event_date}}')
  })

  it('handles null/undefined values', () => {
    const result = renderTemplateVariables('Hello {{client_name}}!', { client_name: null })
    assert.strictEqual(result, 'Hello !')
  })

  it('replaces same variable multiple times', () => {
    const result = renderTemplateVariables(
      'Hi {{client_name}}! {{client_name}}, we look forward to it.',
      { client_name: 'Sarah' }
    )
    assert.strictEqual(result, 'Hi Sarah! Sarah, we look forward to it.')
  })

  it('leaves non-matching braces alone', () => {
    const result = renderTemplateVariables('Price: ${100} {{client_name}}', {
      client_name: 'Sarah',
    })
    assert.strictEqual(result, 'Price: ${100} Sarah')
  })

  it('handles empty template', () => {
    const result = renderTemplateVariables('', { client_name: 'Sarah' })
    assert.strictEqual(result, '')
  })

  it('handles template with no variables', () => {
    const result = renderTemplateVariables('Hello world!', { client_name: 'Sarah' })
    assert.strictEqual(result, 'Hello world!')
  })

  it('does not perform XSS injection', () => {
    const result = renderTemplateVariables('Hello {{client_name}}!', {
      client_name: '<script>alert("xss")</script>',
    })
    assert.strictEqual(result, 'Hello <script>alert("xss")</script>!')
    // Note: XSS prevention is handled at the rendering layer (React escapes HTML),
    // not in the template engine itself. This test documents current behavior.
  })
})
