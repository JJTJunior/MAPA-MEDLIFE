import Jimp from 'jimp';

async function generateIcons() {
  try {
    const image = await Jimp.read('public/logo.png');
    
    // Create a 512x512 square with white background
    const bg512 = new Jimp(512, 512, '#FFFFFF');
    // Scale image to fit within 512x512 with some padding (e.g. max width 480)
    const scaledImg512 = image.clone().scaleToFit(480, 480);
    // Center it on the background
    const x512 = (512 - scaledImg512.bitmap.width) / 2;
    const y512 = (512 - scaledImg512.bitmap.height) / 2;
    bg512.composite(scaledImg512, x512, y512);
    await bg512.writeAsync('public/logo-512.png');

    // Create a 192x192 square with white background
    const bg192 = new Jimp(192, 192, '#FFFFFF');
    // Scale image to fit within 192x192 with some padding (e.g. max width 170)
    const scaledImg192 = image.clone().scaleToFit(170, 170);
    // Center it on the background
    const x192 = (192 - scaledImg192.bitmap.width) / 2;
    const y192 = (192 - scaledImg192.bitmap.height) / 2;
    bg192.composite(scaledImg192, x192, y192);
    await bg192.writeAsync('public/logo-192.png');

    console.log("Icons generated successfully.");
  } catch (err) {
    console.error("Error generating icons:", err);
  }
}

generateIcons();
