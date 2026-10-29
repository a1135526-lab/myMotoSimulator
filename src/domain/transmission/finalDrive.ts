/**
 * Belt (CVT) efficiency × gearbox efficiency. Rubber-belt CVTs are typically
 * 85–92 %; the reduction gearbox ~97 %.
 */
export const BELT_EFFICIENCY = 0.88;
export const GEARBOX_EFFICIENCY = 0.97;
export const DRIVETRAIN_EFFICIENCY = BELT_EFFICIENCY * GEARBOX_EFFICIENCY;

/** Clutch-bell angular speed (rad/s) per m/s of road speed. */
export const bellRadSPerMps = (finalDriveRatio: number, wheelRadiusM: number): number =>
  finalDriveRatio / wheelRadiusM;

/** Engine angular speed (rad/s) per m/s of road speed with the clutch locked. */
export const engineRadSPerMps = (
  cvtRatio: number,
  finalDriveRatio: number,
  wheelRadiusM: number,
): number => cvtRatio * bellRadSPerMps(finalDriveRatio, wheelRadiusM);
