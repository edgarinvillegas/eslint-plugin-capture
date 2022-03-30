# eslint-plugin-capture

Eslint plugin to force specifying closure variables explicitely
(aka captured variables, hence the plugin name)

## Rationale
Closures are a great feature in programming languages. They allow you to use outer variables 
in a function.

For example:
```js
function outerFunc() {
    const outerVar = 1
    function innerFunc() {
        const innerVar = 2
        return innerVar + outerVar  // Here we can access outerVar.
    }
}
```
This is very handy. However, it can be error prone given it's not explicit that 
we're using `outerVar` inside `innerFunc`. To know if we use outer vars, we have to read 
the full function body...

If, let's say I refactor and extract `innerFunc` outside, we would get an error.
```js
function outerFunc() {
    const outerVar = 1
}
function previouslyInnerFunc() {
    const innerVar = 2
    return innerVar + outerVar  // Error, outerVar is not defined
}
```
(This could be needed for several reasons, to make a function independent, serializable, pure, etc)

We could have prevented this if the outer variable (`outerVar`), also named 
**captured variable** had been explicitly stated in some way, so we would have known about it
and not even attempted the refactor or did it in a different way.

In other programming languages, like Rust or C++ there are language constructs to specify this.
Wouldn't it be great to have something similar in js?


### Enter eslint-capture

There's no language construct for specifying captured variables in Javascript/Typescript, that's where this plugin
comes into play, by just adding a comment:

```js
function outerFunc() {
    const outerVar = 1
    // eslint-capture(outerVar)
    function innerFunc() {
        const innerVar = 2
        return innerVar + outerVar  
    }
}
```
By adding `// eslint-capture` comment we force to specify all the captured variables in 
parenthesis, in this case `eslint-capture(outerVar)` (or you will get an eslint error). 
With this, **we no longer need to read the function body to know if it uses captured vars or not**. 
We have this info in the comment.

Add `eslint-capture` comment to all your functions and you'll be forced to specify 
all capture variables. IMHO, this increases code quality. 

Needless to say, this also works with class methods and arrow functions.

```js
// eslint-capture(outerVar1, outerVar2)
const innerFunc = () => {
    const innerVar = 2
    return innerVar + outerVar1 + outerVar2
}
```
If a function does not have captured vars, it can be annotated as `eslint-capture()` (empty parenthesis) or just `eslint-capture`

## Installation

`yarn add -D eslint-plugin-capture`

Or with npm:

`npm install eslint-plugin-capture --save-dev`

In your .eslintrc.js file or equivalent:

```js
plugins: [
    ...
    'capture'
  ],
  rules: {
    ...
    'capture/explicit-closures': 'error',
  }
  ...
]
```

### Usage

Examples of **correct** code for this rule

```js
const x = 5;
const y = 7;
// eslint-capture (x)
function bar() {
  return x;
}

// eslint-capture (x,y)
function foo() {
  const z = 9;
  return x + y + z;
}

// eslint-capture
function baz() {
  const z = 9;
  return z;
}
```

Examples of **incorrect** code for this rule

```js
const x = 5;
const y = 7;

// eslint-capture (x)
function foo() {
  const z = 9;
  return x + y + z; // Error: y was not specified in capture list
}

// eslint-capture
function bar() {
  return x; // Error: x was not specified in capture list
}
```
