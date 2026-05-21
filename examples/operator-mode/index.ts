import { createInterface } from 'node:readline/promises';
import { BrowseFleet } from 'browsefleet';

const bf = new BrowseFleet({
  baseUrl: process.env.BROWSEFLEET_URL ?? 'http://localhost:3000',
  apiKey: process.env.BROWSEFLEET_API_KEY,
});

async function main() {
  console.log('Step 1: Create a persistent profile');
  const profile = await bf.profiles.create({ name: 'operator-mode-sdk-example' });
  console.log('  Profile id:', profile.id);

  console.log('\nStep 2: Start an operator-mode session attached to the profile');
  const session = await bf.sessions.create({
    profileId: profile.id,
    operatorMode: true,
    stealth: 'full',
  });
  console.log('  Session id:', session.id);
  console.log('  Control mode:', session.controlMode);
  console.log('  Live viewer:', session.viewerUrl);
  console.log('  Event stream:', session.eventsUrl);

  console.log('\nStep 3: Drive the browser as a human through the live viewer.');
  console.log('       Type "done" here to hand off to the agent.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  while (true) {
    const input = (await rl.question('> ')).trim().toLowerCase();
    if (input === 'done') break;
    console.log('  (type "done" to continue)');
  }
  rl.close();

  console.log('\nStep 4: Hand off to the agent');
  await bf.sessions.control(session.id, {
    controlMode: 'agent',
    reason: 'operator finished',
  });
  console.log('  Switched to agent control.');

  console.log('\nStep 5: Run a small action batch as proof');
  const result = await bf.sessions.actions(session.id, [
    { type: 'navigate', url: 'https://example.com' },
    { type: 'screenshot' },
  ]);
  console.log('  Actions executed:', result.results.length);

  console.log('\nStep 6: Release the session (profile persists)');
  await bf.sessions.release(session.id);
  console.log('  Released.');
  console.log(
    '\nNext time, create a session with profileId:',
    profile.id,
    'and skip the human step.',
  );
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
