import React from "react";
import { AbsoluteFill } from "remotion";

import { colors } from "../theme";

// Light lavender backdrop with two soft color glows.
export const SoftBackground: React.FC = () => (
  <AbsoluteFill
    name="Background"
    style={{
      background: `radial-gradient(circle at 15% 12%, rgba(108, 78, 245, 0.18), transparent 45%),
        radial-gradient(circle at 90% 80%, rgba(255, 138, 0, 0.14), transparent 45%),
        linear-gradient(180deg, ${colors.lavender} 0%, #ffffff 100%)`,
    }}
  />
);
