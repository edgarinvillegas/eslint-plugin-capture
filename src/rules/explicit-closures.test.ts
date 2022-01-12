import { RuleTester } from "eslint";
import noImplicitClosure from "./explicit-closures";

// valid

function closureWithoutTag() {
  const x = 5;
  function foo() {
    return x;
  }
}

function closureWithinTaggedScope() {
  // eslint-capture
  function outer() {
    const x = 5;
    function foo() {
      return x;
    }
    foo();
  }
}

// invalid

function taggedClosure() {
  const x = 5;
  // eslint-capture
  function foo() {
    return x;
  }
}

function taggedArrowClosure() {
  const x = 5;
  // eslint-capture
  const foo = () => x;
}

function taggedExpressionClosure() {
  const x = 5;
  const foo = {
    // eslint-capture
    bar() {
      return x;
    },
  };
}

function taggedDuplicatedClosure() {
  const x = 5;
  const y = 7;
  // eslint-capture
  function foo() {
    return x + y + y;
  }
  // eslint-capture
  function bar() {
    return x;
  }
}

function correctlyTaggedDuplicatedClosure() {
  const x = 5;
  const y = 7;
  // eslint-capture (x,y)
  function foo() {
    return x + y + y;
  }
  // eslint-capture (x)
  function bar() {
    return x;
  }
}

function inCorrectlyTaggedDuplicatedClosure() {
  const x = 5;
  const y = 7;
  // eslint-capture (y)
  function foo() {
    return x + y + y;
  }
  // eslint-capture ()
  function bar() {
    return x;
  }
}



// run the tests

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2017 },
});

ruleTester.run("no-implicit-closures", noImplicitClosure, {
  valid: [
    {
      code: closureWithoutTag.toString(),
    },
    {
      code: closureWithinTaggedScope.toString(),
    },
    {
      code: correctlyTaggedDuplicatedClosure.toString()
    }
  ],
  invalid: [
    {
      code: taggedClosure.toString(),
      errors: [
        { messageId: "declaration" },
        { messageId: "function" },
        { messageId: "reference" },
      ],
    },
    {
      code: taggedArrowClosure.toString(),
      errors: [
        { messageId: "declaration" },
        { messageId: "function" },
        { messageId: "reference" },
      ],
    },
    {
      code: taggedExpressionClosure.toString(),
      errors: [
        { messageId: "declaration" },
        { messageId: "function" },
        { messageId: "reference" },
      ],
    },
    {
      // this tests that functions and declarations are only reported once,
      // even if closed several times between several functions
      code: taggedDuplicatedClosure.toString(),
      errors: [
        { messageId: "declaration" },
        { messageId: "declaration" },
        { messageId: "function" },
        { messageId: "reference" },
        { messageId: "reference" },
        { messageId: "reference" },
        { messageId: "function" },
        { messageId: "reference" },
      ],
    },
    {
      code: taggedClosure.toString(),
      options: [{ declaration: "never" }],
      errors: [{ messageId: "function" }, { messageId: "reference" }],
    },
    {
      code: taggedClosure.toString(),
      options: [{ function: "never" }],
      errors: [{ messageId: "declaration" }, { messageId: "reference" }],
    },
    {
      code: taggedClosure.toString(),
      options: [{ reference: "never" }],
      errors: [{ messageId: "declaration" }, { messageId: "function" }],
    },
    {
      code: inCorrectlyTaggedDuplicatedClosure.toString(),
      errors: [
        { messageId: "declaration" },
        { messageId: "function" },
        { messageId: "reference" },
        { messageId: "function" },
        { messageId: "reference" },
      ],
    }
  ],
});