// Gustav stress test - send real messages via Ollama, verify responses
// Gustav runs in Mission Control (browser), but its brain is Ollama.
// We test the Ollama backend directly with Gustav's system prompt.

const GUSTAV_SYSTEM = `You are Gustav, the Mission Control AI for ChefFlow - a private chef business platform. You help the developer manage infrastructure, deployment, and operations. You are concise, direct, and helpful. You have access to system status, deployment info, and can help troubleshoot issues.`;

const tests = [
  {
    name: 'Basic greeting',
    message: 'Hey Gustav, how are things looking?',
  },
  {
    name: 'Infrastructure question',
    message: 'What ports are our services running on?',
  },
  {
    name: 'Deployment question',
    message: 'Walk me through how to deploy to beta',
  },
  {
    name: 'Template interpolation test',
    message: 'What is today\'s date and time?',
  },
];

async function main() {
  console.log('Testing Gustav (Ollama qwen3:4b)...\n');

  // Pre-warm
  await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3:4b', prompt: 'test', options: { num_predict: 1 } }),
  });
  console.log('Model pre-warmed.\n');

  const results = [];

  for (const test of tests) {
    console.log('='.repeat(50));
    console.log(`TEST: ${test.name}`);
    console.log(`Message: "${test.message}"`);
    console.log('='.repeat(50));

    const start = Date.now();

    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: [
            { role: 'system', content: GUSTAV_SYSTEM },
            { role: 'user', content: test.message },
          ],
          stream: false,
          think: false,
          options: { num_predict: 500 },
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - start;
      const reply = data.message?.content || '';
      const thinking = data.message?.thinking || '';
      if (!reply && thinking) {
        console.log(`(Model used ${thinking.length} chars of thinking but produced no content - may need /no_think or more tokens)`);
      }
      const evalCount = data.eval_count || 0;
      const tokPerSec = evalCount / ((data.eval_duration || 1) / 1e9);

      console.log(`Time: ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`);
      console.log(`Tokens: ${evalCount} @ ${tokPerSec.toFixed(1)} tok/s`);
      console.log(`\nGustav said:`);
      console.log(reply.substring(0, 800));

      const passed = reply.length > 10;
      console.log(`\nVerdict: ${passed ? 'PASS ✓' : 'FAIL ✗'}\n`);
      results.push({ test: test.name, pass: passed, time: elapsed, tokens: evalCount, tokPerSec: tokPerSec.toFixed(1) });
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`ERROR: ${err.message}`);
      console.log(`\nVerdict: FAIL ✗\n`);
      results.push({ test: test.name, pass: false, time: elapsed, reason: err.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  for (const r of results) {
    const speed = r.tokPerSec ? ` @ ${r.tokPerSec} tok/s` : '';
    console.log(`${r.pass ? '✓' : '✗'} ${r.test} - ${r.time}ms${speed}`);
  }
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} passed`);
}

main().catch(console.error);
