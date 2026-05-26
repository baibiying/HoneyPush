/** 基于 68 点 landmarks 的简易低头/侧脸判断 */
export function analyzeHeadPose(landmarks: {
  getNose: () => { x: number; y: number }[];
  getLeftEye: () => { x: number; y: number }[];
  getRightEye: () => { x: number; y: number }[];
  getJawOutline: () => { x: number; y: number }[];
}): { lookingDown: boolean; turnedAway: boolean } {
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const jaw = landmarks.getJawOutline();
  if (!nose.length || !leftEye.length || !rightEye.length || !jaw.length) {
    return { lookingDown: false, turnedAway: false };
  }

  const eyeCenterY = (averageY(leftEye) + averageY(rightEye)) / 2;
  const eyeCenterX = (averageX(leftEye) + averageX(rightEye)) / 2;
  const noseTip = nose[Math.floor(nose.length / 2)] ?? nose[3];
  const faceHeight = Math.max(1, Math.max(...jaw.map((p) => p.y)) - Math.min(...jaw.map((p) => p.y)));
  const eyeSpan = Math.max(1, Math.abs(averageX(rightEye) - averageX(leftEye)));

  const lookingDown = noseTip.y - eyeCenterY > faceHeight * 0.22;
  const turnedAway = Math.abs(noseTip.x - eyeCenterX) > eyeSpan * 0.45;

  return { lookingDown, turnedAway };
}

function averageX(points: { x: number }[]) {
  return points.reduce((s, p) => s + p.x, 0) / points.length;
}

function averageY(points: { y: number }[]) {
  return points.reduce((s, p) => s + p.y, 0) / points.length;
}
