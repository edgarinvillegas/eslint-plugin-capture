import noLiteral from "./rules/no-literal";
import { rules } from './rules/no-tagged-closures';

export = {
  rules: {
    "no-literal": noLiteral,
    "no-tagged-closures": rules["no-tagged-closures"]
  },
};
