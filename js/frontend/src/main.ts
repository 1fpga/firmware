// The root file being executed by 1FPGA by default.
import * as fs from '1fpga:fs';
import * as osd from '1fpga:osd';
import * as video from '1fpga:video';

import production from 'consts:production';
import revision from 'consts:revision';

// Polyfill for events.
(globalThis as any).performance = {
  now: () => Date.now(),
};

export async function main() {
  osd.show('1FPGA Booting Up', 'Please wait...');

  console.log(`Build: "${revision}" (${production ? 'production' : 'development'})`);
  console.log('1FPGA started. ONE_FPGA =', JSON.stringify(ONE_FPGA));
  let quit = false;

  // Log the last time this was started.
  await fs.writeFile('1fpga.start', new Date().toISOString());

  const start = Date.now();
  const resolution = video.getResolution();
  let image = await Image.embedded('background');

  if (resolution) {
    console.log('Resolution:', resolution.width, 'x', resolution.height);
    const imageAr = image.width / image.height;
    const resolutionAr = resolution.width / resolution.height;
    if (imageAr > resolutionAr) {
      resolution.width = resolution.height * imageAr;
    } else if (imageAr < resolutionAr) {
      resolution.height = resolution.width / imageAr;
    }
    image = image.resize(resolution.width, resolution.height);
  }

  image.sendToBackground({ position: 'center', clear: true });
  console.log('Background set in', Date.now() - start, 'ms');

  const { mainInner } = await import('@/ui/main');
  while (!quit) {
    quit = await mainInner();
  }
}
