/** 人脸采集构图：脸在画面上方，下方留给双手与桌面（仅用脸框位置近似） */

export type EnrollmentPoseIssue =
  | "ok"
  | "no-face"
  | "multiple-faces"
  | "too-far"
  | "too-close"
  | "face-too-low"
  | "face-too-high"
  | "off-center"
  | "hands-missing";

export type EnrollmentPoseResult = {
  ok: boolean;
  issue: EnrollmentPoseIssue;
  hint: string;
};

type FaceBox = { x: number; y: number; width: number; height: number };

type PoseLimits = {
  minFaceArea: number;
  maxFaceArea: number;
  faceCenterYMin: number;
  faceCenterYMax: number;
  faceBottomMaxY: number;
  faceCenterXMaxOffset: number;
  minWorkspaceBelowFace: number;
};

const ENROLLMENT_LIMITS: PoseLimits = {
  minFaceArea: 0.04,
  maxFaceArea: 0.18,
  faceCenterYMin: 0.18,
  faceCenterYMax: 0.42,
  faceBottomMaxY: 0.52,
  faceCenterXMaxOffset: 0.22,
  minWorkspaceBelowFace: 0.38,
};

/** 监督阶段：与采集相近，略强调脸在上方、下方留白（避免过严误报摸鱼） */
const SUPERVISION_LIMITS: PoseLimits = {
  minFaceArea: 0.035,
  maxFaceArea: 0.19,
  faceCenterYMin: 0.14,
  faceCenterYMax: 0.46,
  faceBottomMaxY: 0.54,
  faceCenterXMaxOffset: 0.24,
  minWorkspaceBelowFace: 0.32,
};

function evaluatePose(
  faces: FaceBox[],
  videoWidth: number,
  videoHeight: number,
  limits: PoseLimits,
  okHint: string
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
  const workspaceBelow = 1 - bottomY;
  const centerOffsetX = Math.abs(cx - 0.5);

  if (areaRatio < limits.minFaceArea) {
    return {
      ok: false,
      issue: "too-far",
      hint: "请靠近一些，让脸部更清晰，并保证双手与桌面在画面内",
    };
  }

  if (areaRatio > limits.maxFaceArea) {
    return {
      ok: false,
      issue: "too-close",
      hint: "请后退一些，让画面能拍到你的脸部、双手与桌面",
    };
  }

  if (
    cy > limits.faceCenterYMax ||
    bottomY > limits.faceBottomMaxY ||
    workspaceBelow < limits.minWorkspaceBelowFace
  ) {
    return {
      ok: false,
      issue: "face-too-low",
      hint: "请抬高摄像头或坐直一些，让脸在画面上方，下方留出双手与桌面",
    };
  }

  if (cy < limits.faceCenterYMin) {
    return {
      ok: false,
      issue: "face-too-high",
      hint: "请略微调低摄像头角度，使脸部位于画面中上部",
    };
  }

  if (centerOffsetX > limits.faceCenterXMaxOffset) {
    return {
      ok: false,
      issue: "off-center",
      hint: "请将脸部移到画面中央，并确认双手与桌面都在镜头里",
    };
  }

  return {
    ok: true,
    issue: "ok",
    hint: okHint,
  };
}

export function evaluateEnrollmentPose(
  faces: FaceBox[],
  videoWidth: number,
  videoHeight: number
): EnrollmentPoseResult {
  return evaluatePose(
    faces,
    videoWidth,
    videoHeight,
    ENROLLMENT_LIMITS,
    "姿势正确，请保持不动，正在采集…"
  );
}

/** 监督中判定「劳动」构图（脸 + 双手 + 桌面均在镜头内，由脸框与下方留白近似） */
export function evaluateSupervisionPose(
  faces: FaceBox[],
  videoWidth: number,
  videoHeight: number
): EnrollmentPoseResult {
  return evaluatePose(
    faces,
    videoWidth,
    videoHeight,
    SUPERVISION_LIMITS,
    "构图符合要求：脸部、双手与桌面均在画面中"
  );
}

/** 本人匹配、构图合格且双手在工作区内才算劳动 */
export function isLaborPose(
  framing: EnrollmentPoseResult,
  userMatched: boolean,
  handsInWorkspace: boolean
) {
  return framing.ok && userMatched && handsInWorkspace;
}
