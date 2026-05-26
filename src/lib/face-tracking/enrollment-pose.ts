/** 人脸采集构图：脸在画面上方，下方留给双手与桌面（仅用脸框位置近似） */

export type EnrollmentPoseIssue =
  | "ok"
  | "no-face"
  | "multiple-faces"
  | "too-far"
  | "too-close"
  | "face-too-low"
  | "face-too-high"
  | "off-center";

export type EnrollmentPoseResult = {
  ok: boolean;
  issue: EnrollmentPoseIssue;
  hint: string;
};

type FaceBox = { x: number; y: number; width: number; height: number };

/** 脸在画面中过小（太远） */
const MIN_FACE_AREA_RATIO = 0.04;
/** 脸过大（太近，看不到手与桌面） */
const MAX_FACE_AREA_RATIO = 0.18;
/** 脸中心纵向：偏上，为双手桌面留空间 */
const FACE_CENTER_Y_MIN = 0.18;
const FACE_CENTER_Y_MAX = 0.42;
/** 脸的下缘不应超过画面高度比例 */
const FACE_BOTTOM_MAX_Y_RATIO = 0.52;
/** 脸中心横向偏移 */
const FACE_CENTER_X_MAX_OFFSET = 0.22;

export function evaluateEnrollmentPose(
  faces: FaceBox[],
  videoWidth: number,
  videoHeight: number
): EnrollmentPoseResult {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return {
      ok: false,
      issue: "no-face",
      hint: "摄像头画面未就绪，请稍候",
    };
  }

  if (faces.length === 0) {
    return {
      ok: false,
      issue: "no-face",
      hint: "未检测到人脸，请面向摄像头并确保光线充足",
    };
  }

  if (faces.length > 1) {
    return {
      ok: false,
      issue: "multiple-faces",
      hint: "画面中只能有你一个人，请他人暂时离开镜头",
    };
  }

  const box = faces[0];
  const areaRatio = (box.width * box.height) / (videoWidth * videoHeight);
  const cx = (box.x + box.width / 2) / videoWidth;
  const cy = (box.y + box.height / 2) / videoHeight;
  const bottomY = (box.y + box.height) / videoHeight;
  const centerOffsetX = Math.abs(cx - 0.5);

  if (areaRatio < MIN_FACE_AREA_RATIO) {
    return {
      ok: false,
      issue: "too-far",
      hint: "请靠近一些，让脸部更清晰，并保证双手与桌面在画面内",
    };
  }

  if (areaRatio > MAX_FACE_AREA_RATIO) {
    return {
      ok: false,
      issue: "too-close",
      hint: "请后退一些，让画面能拍到你的脸部、双手与桌面",
    };
  }

  if (cy > FACE_CENTER_Y_MAX || bottomY > FACE_BOTTOM_MAX_Y_RATIO) {
    return {
      ok: false,
      issue: "face-too-low",
      hint: "请抬高摄像头或坐直一些，让脸在画面上方，下方留出双手与桌面",
    };
  }

  if (cy < FACE_CENTER_Y_MIN) {
    return {
      ok: false,
      issue: "face-too-high",
      hint: "请略微调低摄像头角度，使脸部位于画面中上部",
    };
  }

  if (centerOffsetX > FACE_CENTER_X_MAX_OFFSET) {
    return {
      ok: false,
      issue: "off-center",
      hint: "请将脸部移到画面中央，并确认双手与桌面都在镜头里",
    };
  }

  return {
    ok: true,
    issue: "ok",
    hint: "姿势正确，请保持不动，正在采集…",
  };
}
