import * as video from '1fpga:video';

export async function setMenuBackground(path?: string) {
  const start = Date.now();
  const resolution = video.getResolution();
  console.log('Setting background with resolution: ', JSON.stringify(resolution));
  let image;
  try {
    image = await (path ? Image.load(path) : Image.embedded('background'));
  } catch (error) {
    throw new Error(`Failed to load background image: ${error}`);
  }

  if (resolution) {
    const imageAr = image.width / image.height;
    const resolutionAr = resolution.width / resolution.height;
    if (imageAr > resolutionAr) {
      resolution.width = resolution.height * imageAr;
    } else if (imageAr < resolutionAr) {
      resolution.height = resolution.width / imageAr;
    }

    try {
      image = image.resize(resolution.width, resolution.height);
    } catch (error) {
      throw new Error(`Failed to resize background image: ${error}`);
    }
  }

  image.sendToBackground({ position: 'center', clear: true });
  console.log('Background set in', Date.now() - start, 'ms');
}

let currentMode: string | null = null;

export async function getVideoMode() {
  return currentMode;
}

export async function setVideoMode(mode: string) {
  await video.setMode(mode);
  currentMode = mode;
  await setMenuBackground();
}

export async function findDefaultVideoMode() {
  // Initialize the video.
  let edid = video.readEdid();
  if (!!edid) {
    console.log('EDID: ', JSON.stringify(edid, undefined, 2));
    let chosenTiming = null;
    for (const timing of edid.standardTimings) {
      if (
        timing.horizontalAddrPixelCt >= (chosenTiming?.horizontalAddrPixelCt ?? 0) &&
        timing.fieldRefreshRate >= (chosenTiming?.fieldRefreshRate ?? 0)
      ) {
        chosenTiming = timing;
      }
    }

    console.log(`Chosen timing: ${JSON.stringify(chosenTiming)}`);
    if (chosenTiming) {
      return `V${chosenTiming.horizontalAddrPixelCt}x${chosenTiming.verticalAddrPixelCt}r${chosenTiming.fieldRefreshRate}`;
    }
  }

  return undefined;
}
