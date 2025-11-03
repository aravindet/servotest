/*
    NOTE:

    Unit vectors are sometimes specified using a pair of angles (A°, B°). The
    vector is obtained by rotating the Z axis unit vector A° about the X axis
    and then by B° about the (original) Z axis. This works similarly to Euler
    angles.
*/

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (rad) => (rad * 180) / Math.PI;
const fmt = (rad) => deg(rad).toFixed(2);

export default class Linkage {
  constructor(geometry) {
    this.motorAlpha = rad(geometry.motorAlpha);
    this.motorBeta = rad(geometry.motorBeta);
    this.motorZero = rad(geometry.motorZero);
    this.innerLink = rad(geometry.innerLink);
    this.outerLink = rad(geometry.outerLink);

    this.offsets = [0, 0];
    this.offsets = this.ik(0, 0);
  }

  ik(thetaDeg, phiDeg) {
    const theta = rad(thetaDeg);
    const phi = rad(phiDeg);

    const cosAlpha = Math.cos(this.motorAlpha);
    const sinAlpha = Math.sin(this.motorAlpha);

    const cosInner = Math.cos(this.innerLink);
    const sinInner = Math.sin(this.innerLink);
    const cosOuter = Math.cos(this.outerLink);

    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const motorBeta = this.motorBeta;
    const motorZero = this.motorZero;

    const maxReach = this.innerLink + this.outerLink;
    const minReach = Math.abs(this.outerLink - this.innerLink);

    // IK for one motor, where side = -1 or +1
    const ikMotor = (side) => {
      // psi is the angle between the motor and the target when viewed from the pole.
      const psi = Math.PI - phi + side * motorBeta;
      const cosPsi = Math.cos(psi);
      const sinPsi = Math.sqrt(1 - cosPsi * cosPsi);

      // console.log(side, { cosTheta, sinTheta, psi: deg(psi), cosPsi, sinPsi });

      // Tau is the distance of the target from the motor
      const cosTau = cosTheta * cosAlpha + sinTheta * sinAlpha * cosPsi;
      const sinTau = Math.sqrt(1 - cosTau * cosTau);
      const tau = Math.acos(cosTau);

      if (tau < minReach || tau > maxReach) throw Error('unreachable');

      // T is the angle between the pole and the target when viewed from the motor
      const T = Math.asin((sinPsi * sinTheta) / sinTau) * Math.sign(phi) * -1;

      // console.log(side, {
      //   T,
      //   cosTau,
      //   sinTau,
      //   tau: deg(Math.asin(sinTau)),
      // });

      // E is the angle between the target and the elbow when viewed from the motor
      const cosE = (cosOuter - cosInner * cosTau) / (sinInner * sinTau);

      // console.log({
      //   cosOuter,
      //   cosInner,
      //   sinInner,
      //   cosE,
      // });
      // This might be fall outside (-1, 1) due to floating point issues.
      // if (cosE < -1 || cosE > 1)
      //   console.error('cosE', cosE, 'ctx', {
      //     thetaDeg,
      //     phiDeg,
      //     side,
      //     alpha: deg(this.motorAlpha),
      //     beta: deg(this.motorBeta),
      //   });

      const E = Math.acos(Math.max(Math.min(cosE, 1), -1)) * side * -1;
      // console.log('side ', fmt(T), fmt(E));
      // const E = Math.acos(cosE);

      // Motor rotation angle is the sum of the two.
      return T + E + side * motorZero;
    };

    return [deg(ikMotor(+1)) - this.offsets[0], deg(ikMotor(-1)) - this.offsets[1]];
  }
}

// // Position of the motors are (MOTOR_A, ±MOTOR_B)
// const MOTOR_ALPHA = rad(60); // Inclination from the pole
// const MOTOR_BETA = rad(18 / 2); // Azimuth from the midpoint between motors
// const MOTOR_ZERO = rad(90); // Angle of inner link at motor position zero, measured from the great circle arc from the motor to the pole

// // The lengths of inner and outer links, as angles around sphere center

// // Where the servos have a rotation range of r°, are separated by b, and
// // the closest reachable point is d from the line between the servos, the
// // inner link length providing the maximum reach is:
// //     (1 - b² - d²) ÷ 2·(1 + b²·c + b·d·s + √(1-b²)·(b·s - d·c))
// // where c = cos(r - 90°) and s = sin(r - 90°).
// // Lengths are normalized to total link length, i.e. inner link length +
// // outer link length = 1.

// // The numbers below are calculated with b = 18, d = -15 and r = 120°

// const INNER_L = rad(51.265);
// const OUTER_L = rad(68.735);

// // B is the half-angle between the motors when viewed from the pole
// // (along great circles).

// const B = MOTOR_BETA; //  Math.acos(cosB);

// console.log("B", deg(B));

// --------------

// Rotate [x, y, z] theta radians about axis [ax, ay, az].
// ax² + ay² + az² must equal 1.
// const rotate = ([x, y, z], [ax, ay, az], theta) => {
//   const c = Math.cos(theta);
//   const n = 1 - c;
//   const s = Math.sin(theta);

//   /* prettier-ignore */
//   return [
//     x * (ax*ax*n + c)    + y * (ax*ay*n - az*s) + z * (ax*az*n + ay*s),
//     x * (ax*ay*n + az*s) + y * (ay*ay*n + c)    + z * (ay*az*n - ay*s),
//     x * (ax*az*n - ay*s) + y * (ay*az*n + ax*s) + z * (az*az*n + c)
//   ];
// };

// const rotateX = ([x, y, z], theta) => {
//     const c = Math.cos(theta);
//     const s = Math.sin(theta);
//     return [x, y*c - z*s, y*s + z*c];
// }

// const rotateY = ([x, y, z], theta) => {
//     const c = Math.cos(theta);
//     const s = Math.sin(theta);
//     return [x*c + z*s, y, -x*s + z*c];
// }

// const rotateZ = ([x, y, z], theta) => {
//     const c = Math.cos(theta);
//     const s = Math.sin(theta);
//     return [x*c - y*s, x*s + y*c, z];
// }

// const X = [1, 0, 0];
// const Y = [0, 1, 0];
// const Z = [0, 0, 1];

// // Positions of the left and right shoulders
// const LS = rotate(rotate(Z, Y, -MOTOR_A), Z, MOTOR_B);
// const RS = rotate(rotate(Z, Y, -MOTOR_A), Z, MOTOR_B);

// // Positions of the left and right elbows when servo rotation angle is 0.
// const LE0 = rotate(LS, Z, INNER_L);
// const RE0 = rotate(LS, Z, -INNER_L);

// export function forwardKinematics(l, r) {
//   const LE = rotate(LE0, LS, l);
//   const RE = rotate(RE0, RS, r);
// }

// /**
//  * Calculates the servo rotation angles
//  * @param {number} a First rotation angle of target (X axis)
//  * @param {number} b Second rotation angle of target (Z axis)
//  */
// export function inverseKinematics(a, b) {}
