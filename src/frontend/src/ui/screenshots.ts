import * as osd from "1fpga:osd";
import { Screenshot } from "@/services";
import * as video from "1fpga:video";

export async function screenshotsMenu() {
  const screenshots = await Screenshot.list();
  const games = await Promise.all(screenshots.map((s) => s.getGame()));

  const result = await osd.textMenu({
    title: "Screenshots",
    back: true,
    items: screenshots.map((s, i) => ({
      label: `${games[i].name} ${s.createdAt}`,
      select: async () => {
        try {
          let image = await Image.load(s.path);
          const resolution = video.getResolution();

          if (resolution) {
            image = image.resize(resolution.width, resolution.height);
          }

          image.sendToBackground({ position: "center", clear: true });

          await osd.hideOsd();
          await osd.alert("");
        } catch (e) {
          console.error(e);
        } finally {
          await osd.showOsd();
        }
      },
    })),
  });
}
