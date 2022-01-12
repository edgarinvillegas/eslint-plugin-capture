import { AST, Rule, Scope } from "eslint";
import * as ESTree from "estree";

/** regex for a tagged comment */
const taggedVarsRe = /^\s*eslint-capture(\s*\((.*)\))?/;

/** test if one range is inside another, used to see if variable in scope */
function isInsideRange(
    outer: [number, number],
    inner: [number, number]
): boolean {
  return outer[0] <= inner[0] && inner[1] <= outer[1];
}

/** summarize an array of variables for reporting */
function summarizeVariables(variables: Iterable<Scope.Variable>): string {
  const sortedNames = [...variables].map((v) => v.name).sort();
  if (sortedNames.length > 4) {
    sortedNames.splice(2, sortedNames.length - 3, "...");
  }
  return sortedNames.join(", ");
}

const explicitClosures: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
          "disallow closing around variables for functions tagged with `eslint-capture`",
      category: "Variables",
      recommended: false,
      url: "https://github.com/edgarinvillegas/eslint-plugin-capture",
    },
    messages: {
      noScope: "tagged a function without a scope",
      reference:
          "reference to variable {{ variable }} in an `eslint-capture` function",
      function:
          "function tagged with `eslint-capture` closes variables: {{ variables }}",
      declaration:
          "declared variable {{ variable }} referenced in an `eslint-capture` function",
    },
    schema: [
      {
        type: "object",
        properties: {
          declaration: { enum: ["always", "never"] },
          function: { enum: ["always", "never"] },
          reference: { enum: ["always", "never"] },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
    const manager = sourceCode.scopeManager;

    // all closed definitions to report
    const closedDefinitions = new Set<Scope.Definition>();
    // all closed functions to report
    const closedFuncs = new Map<ESTree.Node, Set<Scope.Variable>>();

    const [
      {
        declaration: reportDeclarations = "always",
        function: reportFunctions = "always",
        reference: reportReferences = "always",
      } = {},
    ] = context.options;

    function getTaggedVars(comment: string): string[] | null {
      const matches = comment.match(taggedVarsRe);
      if (matches === null) return null;
      const str_vars = matches[2];
      if (!str_vars) return [];
      return str_vars.split(',').map(x => x.trim());
    }

    /** return the tagged variables a node has */
    function isTagged(node: ESTree.Node): string[] | null {
      // first we check if any preceeding comments start with the line
      const comments = sourceCode.getCommentsBefore(node);
      for (const comment of comments || []) {
        /*if (tagged.test(comment.value)) {
          return true;
        }*/
        const taggedVars = getTaggedVars(comment.value);
        if (taggedVars) {
          return taggedVars;
        }
      }

      // we also scan the source looking for the previous line
      // NOTE this is necessary for arrow functions and expressions
      if (node.loc) {
        const nline = node.loc.start.line;
        const token = sourceCode.getTokenBefore(node, {
          includeComments: true,
          filter(token: AST.Token | ESTree.Comment): boolean {
            return (
                token.type === "Line" ||
                !token.loc ||
                // NOTE this last part is so we stop early
                token.loc.end.line + 1 < nline
            );
          },
        }) as AST.Token | ESTree.Comment | null; // TODO this eslint typing is wrong

        let taggedVars;
        if (
            token &&
            token.loc &&
            token.loc.end.line + 1 === nline &&
            // tagged.test(token.value)
            (taggedVars = getTaggedVars(token.value))
        ) {
          // return true;
          return taggedVars;
        }
      }

      return null;
    }

    function getClosedVariables(functionScope: Scope.Scope, funcRange: [number, number], taggedVariables: string[]) {
      // all variables that this scope closes
      const closedVariables = new Set<Scope.Variable>();

      // iterate through all references in all scopes looking for a reference
      // to an upper scope
      const queue = [functionScope];
      let scope;
      while ((scope = queue.pop())) {
        queue.push(...scope.childScopes);
        for (const ref of scope.references) {
          const variable = ref.resolved;
          if (!variable) continue; // no definition, so can't close
          if (taggedVariables.includes(variable.name)) continue; // tagged variable, ignore
          const closedDefs = new Set(
              variable.defs.filter(
                  // last check ignores typescript type closures
                  (def) =>
                      !isInsideRange(funcRange, def.node.range) &&
                      (def.type as unknown) !== "Type",
              ),
          );
          if (!closedDefs.size) continue; // not closed

          // report immediate reference
          reportReferences === "always" &&
          context.report({
            node: ref.identifier,
            messageId: "reference",
            data: { variable: variable.name },
          });
          // store function reference
          reportFunctions === "always" && closedVariables.add(variable);
          // store definitions
          if (reportDeclarations === "always") {
            for (const def of closedDefs) closedDefinitions.add(def);
          }
        }
      }
      return closedVariables;
    }

    /** the generic check function */
    function checkFunction(node: ESTree.Node & Rule.NodeParentExtension): void {
      if (isTagged(node) === null) return;

      // get the function scope
      const functionScope = manager.acquire(node);
      const funcRange = node.range;
      if (!functionScope || !funcRange) {
        context.report({
          node,
          messageId: "noScope",
        });
        return;
      }

      const taggedVariables: string[] = isTagged(node)!;
      const closedVariables = getClosedVariables(functionScope, funcRange, taggedVariables);
      // if we closed some variables, record that for the function
      if (closedVariables.size) {
        closedFuncs.set(node, closedVariables);
      }
    }

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      "Program:exit"(): void {
        // report functions
        for (const [func, vars] of closedFuncs.entries()) {
          context.report({
            node: func,
            messageId: "function",
            data: {
              variables: summarizeVariables(vars.keys()),
            },
          });
        }

        // report definitions
        for (const def of closedDefinitions) {
          context.report({
            node: def.node,
            messageId: "declaration",
            data: { variable: def.name.name },
          });
        }
      },
    };
  },
};

export default explicitClosures;
