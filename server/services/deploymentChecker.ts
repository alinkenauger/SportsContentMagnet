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
    console.log('Puppeteer not available - PDF generation disabled');
  }

  try {
    require.resolve('sharp');
    availability.sharp = true;
    availability.imageProcessing = true;
  } catch (error) {
    console.log('Sharp not available - image processing disabled');
  }

  try {
    require.resolve('ytdl-core');
    availability.ytdlCore = true;
  } catch (error) {
    console.log('ytdl-core not available - YouTube download disabled');
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