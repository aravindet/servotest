import Linkage from './static/linkage.js';

// Optimizer
// Runs inverse kinematics for different linkage geometries to
// find the best one

const MAX_THETA = Math.PI / 4;
const THETA_MARGIN = Math.PI / 72;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (rad) => (rad * 180) / Math.PI;
const fmt = (rad) => deg(rad).toFixed(2);

function getLinkLengths(alpha, beta) {
  const maxTheta = MAX_THETA + THETA_MARGIN;
  if (alpha < maxTheta) throw Error(`infeasible: α (${deg(alpha)}°) < maxθ (${deg(maxTheta)}°)`);

  const across = alpha + maxTheta;
  const beside = alpha - maxTheta;

  const cosAcross = Math.cos(across);
  const sinAcross = Math.sin(across);
  const cosBeside = Math.cos(beside);

  const cosBeta = Math.cos(beta);
  const sinBeta = Math.sin(beta);

  const outer = Math.atan2(cosBeta * cosBeside - cosAcross, sinAcross - sinBeta);
  let inner;

  if (outer <= alpha) {
    inner = across - outer;
  } else if (outer >= maxTheta) {
    inner = beside + outer;
  } else {
    // No feasible inner
    throw Error('infeasible');
  }

  // const inner = 2 * outer < across + beside ? across - outer :2 * outer > across - beside ? beside + outer;

  // 2 * outer > across - beside?

  // if (outer - inner > beside) {
  //   throw Error(`infeasible: minReach ${deg(outer - inner)}° > ${deg(beside)}°`);
  // }
  // if (outer + inner < across) {
  //   throw Error(`infeasible: maxReach ${deg(outer + inner)}° < ${deg(across)}°`);
  // }
  return [inner, outer];
}

// console.log(getLinkLengths(rad(60), rad(15)).map(deg));
// process.exit(0);

// Variables to test
const ALPHAS = [45, 90, 1];
const BETAS = [0, 90, 1];

const THETAS = [45];
// const PHIS = [0, 15, 30, 45, 60, 90, 105, 120, 135, 150, 165, 180];

const epsilon = Math.PI / 48;

console.log('α, β, I, O, z, R, minAdv, avgAdv');

for (let motorAlpha = ALPHAS[0]; motorAlpha <= ALPHAS[1]; motorAlpha += ALPHAS[2]) {
  for (let motorBeta = BETAS[0]; motorBeta <= BETAS[1]; motorBeta += BETAS[2]) {
    try {
      const [inner, outer] = getLinkLengths(rad(motorAlpha), rad(motorBeta));

      const innerLink = deg(inner);
      const outerLink = deg(outer);
      const linkage = new Linkage({
        motorAlpha,
        motorBeta,
        motorZero: 0,
        innerLink,
        outerLink,
      });

      let minRot = Number.POSITIVE_INFINITY;
      let maxRot = Number.NEGATIVE_INFINITY;

      let minAdv = Number.POSITIVE_INFINITY;
      let sumAdv = 0;

      for (const theta of THETAS) {
        for (let phi = 0; phi < 360; phi += 1) {
          // We only care about the left motor's rotation here as the tests are symmetric.
          const [rotL, rotR] = linkage.ik(theta, phi);

          if (rotL < minRot) minRot = rotL;
          if (rotL > maxRot) maxRot = rotL;

          const [rotLT, rotRT] = linkage.ik(theta + epsilon, phi);
          const [rotLP, rotRP] = linkage.ik(theta, phi + epsilon);
          const advT = Math.abs((rotLT - rotL) / epsilon) + Math.abs((rotRT - rotR) / epsilon);
          const advP = Math.abs((rotLP - rotL) / epsilon) + Math.abs((rotRP - rotR) / epsilon);

          minAdv = Math.min(minAdv, advT, advP);
          sumAdv += advT + advP;
        }
      }

      console.log(
        [
          motorAlpha,
          motorBeta,
          innerLink,
          outerLink,
          (minRot + maxRot) / 2, // motorZero
          maxRot - minRot, // range
          minAdv,
          sumAdv / (2 * 360 * THETAS.length),
        ].join(', '),
      );
    } catch (e) {
      // This geometry is infeasible.
      console.error(`Skipping ${motorAlpha}, ${motorBeta}: ${e.message}`);
    }
  }
}
