import { BrowseFleet } from 'browsefleet';

const bf = new BrowseFleet({
  baseUrl: process.env.BROWSEFLEET_URL ?? 'http://localhost:3000',
  apiKey: process.env.BROWSEFLEET_API_KEY,
});

async function main() {
  console.log('Sending agent task to BrowseFleet...');
  const result = await bf.agent.run({
    task: 'Read the H1 heading on this page and report its text. When done, return the H1 text as the final result.',
    url: 'https://example.com',
    provider: 'anthropic',
    maxIterations: 5,
  });

  console.log('\nDone.');
  console.log('  Success:', result.success);
  console.log('  Iterations:', result.totalIterations);
  console.log('  Result:', result.result ?? '(no result)');
  if (result.error) console.log('  Error:', result.error);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
