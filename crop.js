const Jimp = require("jimp");

module.exports = function crop(filename) {
  Jimp.read(`output/${filename}`, function (err, image) {
    if (err) throw err;
    image.autocrop(0.0003, false)
      // .resize(256, 256)
      .write(`output/${filename}`);
  });
}