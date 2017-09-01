var Jimp = require("jimp");

Jimp.read('output/Dupont.png', function (err, image) {
  if (err) throw err;
  image.autocrop(0.0003, false)
    // .resize(256, 256)
    .write("output/Dupont_new.jpg");
});