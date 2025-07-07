// Deployment environment checker
export const isLightweightDeployment = process.env.USE_LIGHTWEIGHT_SERVICES === 'true';

export function checkPackageAvailability() {
  const availability = {
    puppeteer: false,
    sharp: false,
    ytdlCore: false,
    pdfGeneration: false,
    imageProcessing: false
  };

  try {
    require.resolve('puppeteer');
    availability.puppeteer = true;
    availability.pdfGeneration = true;
  } catch (error) {
    // Puppeteer not available - this is expected in deployment
  }

  try {
    require.resolve('sharp');
    availability.sharp = true;
    availability.imageProcessing = true;
  } catch (error) {
    // Sharp not available - this is expected in deployment
  }

  try {
    require.resolve('ytdl-core');
    availability.ytdlCore = true;
  } catch (error) {
    // ytdl-core not available - this is expected in deployment
  }

  return availability;
}

export function getServiceConfiguration() {
  const packageAvailability = checkPackageAvailability();
  
  return {
    useLightweightPDF: !packageAvailability.pdfGeneration || isLightweightDeployment,
    useLightweightImage: !packageAvailability.imageProcessing || isLightweightDeployment,
    useLightweightVideo: !packageAvailability.ytdlCore || isLightweightDeployment,
    deploymentMode: isLightweightDeployment ? 'lightweight' : 'full'
  };
}