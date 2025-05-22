import Linkage from './static/linkage.js';

const linkage = new Linkage({
  motorAlpha: 60,
  motorBeta: 20,
  motorZero: 0,
  innerLink: 51.74,
  outerLink: 68.26,
});

console.log(linkage.ik(45, 200));
