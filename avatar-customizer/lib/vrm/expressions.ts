import { VRM } from '@pixiv/three-vrm';
import { AvatarExpression } from '../avatarConfig';

const EMOTION_EXPRESSIONS: AvatarExpression[] = [
  'happy',
  'sad',
  'angry',
  'surprised',
  'relaxed',
];

/**
 * Maps AvatarExpression to VRM 1.0 and VRM 0.0 standard expression names.
 */
const EXPRESSION_NAME_CANDIDATES: Record<AvatarExpression, string[]> = {
  neutral: ['neutral'],
  happy: ['happy', 'joy'],
  sad: ['sad', 'sorrow'],
  angry: ['angry'],
  surprised: ['surprised'],
  relaxed: ['relaxed', 'fun'],
};

/**
 * Applies the selected avatar expression to a loaded VRM model.
 * Clears other emotional expressions and activates the requested one.
 */
export function applyVrmExpression(vrm: VRM, expression: AvatarExpression, weight = 1.0): void {
  if (!vrm.expressionManager) return;

  // Clear all other emotion expressions
  for (const expr of EMOTION_EXPRESSIONS) {
    if (expr !== expression) {
      const candidates = EXPRESSION_NAME_CANDIDATES[expr];
      for (const name of candidates) {
        try {
          vrm.expressionManager.setValue(name, 0);
        } catch {
          // Ignore unsupported expression names
        }
      }
    }
  }

  // If neutral, no emotion expression should be active
  if (expression === 'neutral') {
    return;
  }

  // Set the target expression using candidate names
  const candidates = EXPRESSION_NAME_CANDIDATES[expression] || [];
  let applied = false;
  for (const name of candidates) {
    try {
      const current = vrm.expressionManager.getExpression(name);
      if (current) {
        vrm.expressionManager.setValue(name, weight);
        applied = true;
        break;
      }
    } catch {
      // Ignore
    }
  }

  // Fallback: direct set value
  if (!applied && candidates.length > 0) {
    try {
      vrm.expressionManager.setValue(candidates[0], weight);
    } catch {
      // Ignore
    }
  }
}
