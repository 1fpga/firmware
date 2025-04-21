import * as osd from '1fpga:osd';
import * as video from '1fpga:video';

import { db } from '@/services';

export async function screenshotsMenu() {
  const screenshots = await db.screenshots.list();
  const games = await db.games.map(
    screenshots.map(s => s.gamesId),
    ['name'],
  );

  await osd.textMenu({
    title: 'Screenshots',
    back: true,
    items: screenshots.map(s => ({
      label: `${games.get(s.gamesId)?.name}`,
      marker: `${s.createdAt}`,
      select: async () => {
        try {
          let image = await Image.load(s.path);
          const resolution = video.getResolution();

          if (resolution) {
            image = image.resize(resolution.width, resolution.height);
          }

          image.sendToBackground({ position: 'center', clear: true });

          await osd.hideOsd();
          await osd.alert('');
        } catch (e) {
          console.error(e);
        } finally {
          await osd.showOsd();
        }
      },
    })),
  });
}
