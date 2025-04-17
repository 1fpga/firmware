(global as any)["ONE_FPGA"] = {
  name: "OneFPGA-React",
  version: {
    major: 0,
    minor: 0,
    patch: 0,
  },
};

(global as any)["Image"] = class Image {
  private constructor(
    public readonly name: string,
    public readonly width: number,
    public readonly height: number,
  ) {}

  static load(path: string): Promise<Image> {
    return Promise.resolve(new Image(`path:${path}`, 100, 100));
  }

  static embedded(name: string): Promise<Image> {
    return Promise.resolve(new Image(name, 100, 100));
  }

  save(path: string): Promise<void> {
    console.log("Image.save()", path);
    return Promise.resolve();
  }

  sendToBackground(options: {}): void {}

  resize(width: number, height: number, keepAspectRatio?: boolean): Image {
    return new Image(this.name, width, height);
  }
};

// To make this file an ES module, we need to at least have one export.
export default {};
