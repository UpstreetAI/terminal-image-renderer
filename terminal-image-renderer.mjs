import { Jimp } from 'jimp';
import { intToRGBA } from '@jimp/utils';
import chalk from 'chalk';

export class ImageRenderer {
  render(imageData, width, height) {
    // `log-update` adds an extra newline so the generated frames need to be 2 pixels shorter.
    const ROW_OFFSET = 2;

    const PIXEL = '\u2584';

    function scale(width, height, originalWidth, originalHeight) {
      const originalRatio = originalWidth / originalHeight;
      const factor = (width / height > originalRatio ? height / originalHeight : width / originalWidth);
      width = factor * originalWidth;
      height = factor * originalHeight;
      return {width, height};
    }

    function checkAndGetDimensionValue(value, percentageBase) {
      if (typeof value === 'string' && value.endsWith('%')) {
        const percentageValue = Number.parseFloat(value);
        if (!Number.isNaN(percentageValue) && percentageValue > 0 && percentageValue <= 100) {
          return Math.floor(percentageValue / 100 * percentageBase);
        }
      }

      if (typeof value === 'number') {
        return value;
      }

      throw new Error(`${value} is not a valid dimension value`);
    }

    function calculateWidthHeight(imageWidth, imageHeight, inputWidth, inputHeight, preserveAspectRatio) {
      const terminalColumns = process.stdout.columns || 80;
      const terminalRows = process.stdout.rows - ROW_OFFSET || 24;

      let width;
      let height;

      if (inputHeight && inputWidth) {
        width = checkAndGetDimensionValue(inputWidth, terminalColumns);
        height = checkAndGetDimensionValue(inputHeight, terminalRows) * 2;

        if (preserveAspectRatio) {
          ({width, height} = scale(width, height, imageWidth, imageHeight));
        }
      } else if (inputWidth) {
        width = checkAndGetDimensionValue(inputWidth, terminalColumns);
        height = imageHeight * width / imageWidth;
      } else if (inputHeight) {
        height = checkAndGetDimensionValue(inputHeight, terminalRows) * 2;
        width = imageWidth * height / imageHeight;
      } else {
        ({width, height} = scale(terminalColumns, terminalRows * 2, imageWidth, imageHeight));
      }

      if (width > terminalColumns) {
        ({width, height} = scale(terminalColumns, terminalRows * 2, width, height));
      }

      width = Math.round(width);
      height = Math.round(height);

      return {width, height};
    }

    function render(image, {width: inputWidth, height: inputHeight, preserveAspectRatio}) {
      // const image = await Jimp.read(buffer);
      const {bitmap} = image;

      const {width, height} = calculateWidthHeight(bitmap.width, bitmap.height, inputWidth, inputHeight, preserveAspectRatio);

      image.resize({w: width, h: height});

      let result = '';
      for (let y = 0; y < image.bitmap.height - 1; y += 2) {
        for (let x = 0; x < image.bitmap.width; x++) {
          const {r, g, b, a} = intToRGBA(image.getPixelColor(x, y));
          const {r: r2, g: g2, b: b2} = intToRGBA(image.getPixelColor(x, y + 1));
          result += a === 0 ? chalk.reset(' ') : chalk.bgRgb(r, g, b).rgb(r2, g2, b2)(PIXEL);
        }

        result += '\n';
      }

      return result;
    }

    const image = new Jimp({width: imageData.width, height: imageData.height});
    image.bitmap.data.set(imageData.data);
    const text = render(image, {
      width,
      height,
    });
    return {
      image,
      text,
    };
  }
}

export const loadImage = async (buffer) => {
  return await Jimp.read(buffer);
};
