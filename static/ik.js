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

// Position of the motors are (MOTOR_A, ±MOTOR_B)
const MOTOR_ALPHA = rad(60); // Inclination from the pole
const MOTOR_BETA = rad(18 / 2); // Azimuth from the midpoint between motors
const MOTOR_ZERO = rad(90); // Angle of inner link at motor position zero, measured from the great circle arc from the motor to the pole

// The lengths of inner and outer links, as angles around sphere center

// Where the servos have a rotation range of r°, are separated by b, and
// the closest reachable point is d from the line between the servos, the
// inner link length providing the maximum reach is:
//     (1 - b² - d²) ÷ 2·(1 + b²·c + b·d·s + √(1-b²)·(b·s - d·c))
// where c = cos(r - 90°) and s = sin(r - 90°).
// Lengths are normalized to total link length, i.e. inner link length +
// outer link length = 1.

// The numbers below are calculated with b = 18, d = -15 and r = 120°

const INNER_L = rad(51.265);
const OUTER_L = rad(68.735);

const cosInner = Math.cos(INNER_L);
const sinInner = Math.sin(INNER_L);
const cosOuter = Math.cos(OUTER_L);

const cosAlpha = Math.cos(MOTOR_ALPHA);
const sinAlpha = Math.sin(MOTOR_ALPHA);

// B is the half-angle between the motors when viewed from the pole
// (along great circles).

const B = MOTOR_BETA; //  Math.acos(cosB);

// console.log("B", deg(B));

export function ik(thetaDeg, phiDeg) {
  const theta = rad(thetaDeg);
  const phi = rad(phiDeg);

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  // IK for one motor, where side = -1 or +1
  function ikMotor(side) {
    // psi is the angle between the motor and the target when viewed from the pole.
    const psi = Math.PI - phi + side * B;
    const cosPsi = Math.cos(psi);
    const sinPsi = Math.sin(psi);

    // console.log(side, { cosTheta, sinTheta, cosPsi, sinPsi });

    // Tau is the distance of the target from the motor
    const cosTau = cosTheta * cosAlpha + sinTheta * sinAlpha * cosPsi;
    const sinTau = Math.sqrt(1 - cosTau * cosTau);

    // T is the angle between the pole and the target when viewed from the motor
    const T = Math.asin((sinPsi * sinTheta) / sinTau);

    // E is the angle between the target and the elbow when viewed from the motor
    // There might be fall outside the (-1, 1) if the point isn’t reachable. Just
    // do our best.
    const cosE = (cosOuter - cosInner * cosTau) / (sinInner * sinTau);
    const E = Math.acos(Math.max(Math.min(cosE, 1), -1));

    console.log(side, "E", fmt(E));

    // Motor rotation angle is the sum of the two.
    return T + side * E - side * MOTOR_ZERO;
  }

  return [deg(ikMotor(+1)), deg(ikMotor(-1))];
}

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
