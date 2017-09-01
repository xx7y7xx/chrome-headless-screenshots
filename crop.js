const Jimp = require("jimp");
// const argv = require('minimist')(process.argv.slice(2));
// const code = argv.code || 'Dupont';

function crop(code) {
  Jimp.read(`output/${code}.png`, function (err, image) {
    if (err) throw err;
    image.autocrop(0.0003, false)
      // .resize(256, 256)
      .write(`output/${code}_new.jpg`);
  });
}

crop('Dupont');
crop('ManagementStatus');
crop('TrendAnalysis');
crop('FinancialData');