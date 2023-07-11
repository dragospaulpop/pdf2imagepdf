const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const hrtime = require('process').hrtime;
const os = require('os');

const startTime = hrtime.bigint();
const errors = [];

const progress = {
  processed: 0,
  current: 0,
  total: 0,
  threads: 0,
  message: ''
};

function log () {
  console.clear();
  let percent = (progress.processed / progress.total) * 100;
  if (percent > 100) percent = 100;
  const percentNice = percent.toFixed(2)
  const progressBar = Array(Math.floor(percent / 2)).fill('*').join('') + Array(50 - Math.floor(percent / 2)).fill('_').join('');
  console.log(`Progress (${progress.threads} threads): ${progress.current} of ${progress.total} |${progressBar}| (${percentNice}%) ${progress.message}`);
  console.log(`Time: ${computeTime(startTime)}`);
}

async function convertPDFToImage(pdfFile, i) {
  progress.current = i + 1;
  try {
    await exec(`convert -density 150 -background white -alpha remove ./original/${pdfFile} ./temp/${pdfFile.replace('.pdf', '.jpg')}`);
    progress.message = `Converted PDF to image: ${pdfFile}`;
    log();
  } catch (error) {
    errors.push({ pdfFile, error })
    progress.message = `Error converting PDF to image: ${pdfFile}`;
    log();
    console.error(error);
  }
}

async function convertImageToPDF(pdfFile, i) {
  progress.current = i + 1;
  try {
    const jpgFiles = await util.promisify(fs.readdir)(process.cwd() + '/temp');
    const filteredJpgFiles = jpgFiles.filter(file => file.endsWith('.jpg') && file.startsWith(pdfFile.replace('.pdf', '')));
    const imagePDFFile = pdfFile.replace('.pdf', '_image.pdf');
    await exec(`convert ./temp/${filteredJpgFiles.join(' ./temp/')} ./temp/${imagePDFFile}`);
    progress.message = `Converted image to PDF: ${imagePDFFile}`;
    log();
  } catch (error) {
    errors.push({ pdfFile, error })
    progress.message = `Error converting image to PDF: ${pdfFile}`;
    log();
    console.error(error);
  }
}

async function cleanUpIntermediateFiles(pdfFile, i) {
  const jpgFiles = await util.promisify(fs.readdir)(process.cwd() + '/temp');
  const filteredJpgFiles = jpgFiles.filter(file => file.endsWith('.jpg') && file.startsWith(pdfFile.replace('.pdf', '')));
  await Promise.all(filteredJpgFiles.map(file => util.promisify(fs.unlink)('./temp/' + file)));
  await util.promisify(fs.unlink)('./temp/' + pdfFile.replace('.pdf', '_image.pdf'));
  progress.message = `Cleaned up intermediate files: ${pdfFile}`;
  progress.current = i + 1;
  log();
}

async function optimizePDF(pdfFile, i) {
  const finalPDFFile = pdfFile.replace('.pdf', '_final.pdf');
  const imagePDFFile = pdfFile.replace('.pdf', '_image.pdf');

  progress.current = i + 1;
  try {
    await exec(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/default -dNOPAUSE -dQUIET -dBATCH -sOutputFile=./output/${finalPDFFile} ./temp/${imagePDFFile}`);
    progress.message = `Created final PDF: ${finalPDFFile}`;
    log();
  } catch (error) {
    errors.push({ pdfFile, error })
    progress.message = `Error creating final PDF: ${finalPDFFile}`;
    log();
    console.error(error);
  }
}

async function convertPDFToImagesAndBack(pdfFile, i) {
  try {
    await convertPDFToImage(pdfFile, i);
    await convertImageToPDF(pdfFile, i);
    await optimizePDF(pdfFile, i);
    await cleanUpIntermediateFiles(pdfFile, i);
  } catch (error) {
    errors.push({ pdfFile, error })
    progress.message = `Error converting file: ${pdfFile}`;
    log();
  }
}

async function wait (howLong) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, howLong);
  });
}

function computeTime (startTime) {
  const endTime = hrtime.bigint();
  // substract the two bigints and convert to seconds
  const timeTaken = Number((endTime - startTime) / 1000000000n);
  // time taken in a human readable format
  const seconds = timeTaken % 60;
  const minutes = Math.floor(timeTaken / 60) % 60;
  const hours = Math.floor(timeTaken / 3600);

  return `${hours}h ${minutes}m ${seconds}s`;
}

async function main () {
  const pdfFiles = await util.promisify(fs.readdir)(process.cwd() + '/original');
  const filteredPdfFiles = pdfFiles.filter(file => file.endsWith('.pdf'));
  const total = filteredPdfFiles.length;

  // detect number of cores
  const maxThreads = os.cpus().length;
  progress.threads = maxThreads;

  progress.total = total;
  progress.current = 0;

  let start = 0;
  let end = start + maxThreads;

  while (end < total + maxThreads) {
    const promises = [];
    for (let i = start; i < end; i++) {
      progress.processed = i + 1;
      const pdfFile = filteredPdfFiles[i];
      if (!pdfFile) continue;
      promises.push(convertPDFToImagesAndBack(pdfFile, i, total));
      // await wait(10000);
    }
    await Promise.all(promises);
    start = end;
    end += maxThreads;
  }

  if (errors.length) {
    // print errors to a local .json file
    await util.promisify(fs.writeFile)('errors.json', JSON.stringify(errors, null, 2));
  }

  const timeTaken = computeTime(startTime);
  console.log(`Completed in: ${timeTaken}`);
}

main();
