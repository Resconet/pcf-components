# Coding rules and best practices

- [Coding rules and best practices](#coding-rules-and-best-practices)
  - [Useful VS Code plugins, shortcuts and tips](#useful-vs-code-plugins-shortcuts-and-tips)
    - [Plugins](#plugins)
      - [Essential](#essential)
      - [Non-essential](#non-essential)
    - [Shortcuts](#shortcuts)
  - [Naming](#naming)
  - [Coding best practices](#coding-best-practices)
  - [Coding habits to avoid](#coding-habits-to-avoid)
  - [Useful public sources](#useful-public-sources)

## Useful VS Code plugins, shortcuts and tips

### Plugins

#### Essential

[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
Plugin marks part of code, which is against the esLint rule and suggests automatic fix.

[EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
Plugin that ensures VS Code respects the `.editorconfig` settings.

[GitLens — Git supercharged](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)
Better VS Code git integration.

[Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
Allows formatting the code using prettier directly in the IDE.

[Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)
Automatically runs jest tests, shows test results directly in the code, in the errors pane and in the Test Explorer sidebar. Allows to debug individual tests.

#### Non-essential

[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
Plugin marks the typo errors.

[Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
Plugin colorize special types of comment, ToDO, deprecated...

[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)
Preview markdown, auto generate table of contents, etc.

[Live Share](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare)
Allow multiple people to collaborate on a repository remotely. May be good for reviews or pair programming.

### Shortcuts

(May depend on selected keymap or a platform.)

`Ctrl+P` Open any file in project using a fuzzy search.

`Ctrl+Shift+P` Execute any command (including plugin commands) by writing the name of it, with fuzzy search applied.

`Shift+Alt+O` Organize imports - remove and sort.

`Ctrl+Shift+I` Format document using default or configured formatter (make sure you have a Prettier plugin installed and set as default).

## Naming

1. Do not use names with `_` for private (or other) variables or functions. Such properties have the `private` access modifiers to tell they are internal object properties.

## Coding best practices

1. Use correct data type, avoid `any`. If the type can't be determined, use `unknown` instead. That will force you to use type guards to check the type before using the variable, making the code type safe.
2. Use `const` or `let` instead of `var`. Use `const` if the variable is not going to be reassigned.
3. Use `type` aliases in repetitive data types.
4. Avoid unnecessary comments. Instead, make the code cleaner and more readable, use proper naming.
5. Use the primitive types `number`, `string`, `boolean` instead of String, Boolean, Number.
6. Don’t use `bind` to create functions. Bind always returns `any`, disabling type checking.

   ```typescript
   // Use
   const curryAdd = (x: number) => add(111, x);
   curryAdd(333); // Ok and type checked

   // Instead of
   function add(x: number, y: number) {
     return x + y;
   }
   const curryAdd = add.bind(null, 111);
   curryAdd(333);
   curryAdd("333");
   ```

7. Use `type[]` instead of `Array<type>`

   and `const array: string[] = [];`

   instead of `const array = new Array<string>();`.

8. Use `async` instead on completedCallback & failedCallback.

   ```typescript
   /* OK */
   async function loadData(): Promise<Entity[]> {}

   /* WRONG */
   function loadData(completedCallback: (data: Entity[]) => void, failedCallback: (err: string) => void): void {}
   ```

9. When calling multiple independent async functions (async loadA, async loadB), consider using `Promise.all` to allow parallel and fail-fast behavior.

   ```typescript
   /* OK - total processing time = max(time of loadA, time of loadB) */
   async function loadData(): Promise<Entity[]> {
     const [result1, result2] = await Promise.all([loadA(), loadB()]);
   }

   /* WRONG - possible undhandled promise rejections, see https://stackoverflow.com/questions/45285129/any-difference-between-await-promise-all-and-multiple-await */
   async function loadData(): Promise<Entity[]> {
     const [a, b] = [loadA(), loadB()];
     const [resultA, resultB] = [await a, await b];
   }

   /* OK, but total processing time = sum(time of loadA, time of loadB) */
   async function loadData(): Promise<Entity[]> {
     const [resultA, resultB] = [await loadA(), await loadB()];
   }

   /* OK, but total processing time = sum(time of loadA, time of loadB) */
   async function loadData(): Promise<Entity[]> {
     await loadA();
     await loadB();
   }
   ```

10. Avoid the `new Promise()` antipattern unless you are wrapping a function with callbacks.

    ```typescript
    /* WRONG */
    async function loadData(): Promise<Entity[]> {
      return new Promise(function (resolve, reject) {
        queryDb()
          .then(data => resolve(toEntities(data)))
          .catch(e => reject(e));
      });
    }
    ```

    ```typescript
    /* OK */
    async function loadData(): Promise<Entity[]> {
      const data = await queryDb();
      return toEntities(data);
    }
    ```

    ```typescript
    /* OK */
    async function getAppImageAsync(path: string): Promise<string> {
      return new Promise((resolve, reject) => MobileCRM.Application.getAppImage(path, null, resolve, reject));
    }
    ```

11. Use template literals instead of concatenation `"some text " + "another text"`.

    ```typescript
    /* OK */
    async function error(): string {
      return `Ajax error for ${a} : ${this.status} `;
    }

    /* WRONG */
    async function error(): string {
      return "Ajax error for " + a + " : " + this.status + " ";
    }
    ```

## Coding habits to avoid

1. If your code in one TS file has more than 500 rows, it's really hard to read it and understand it in the reasonable time. Think how to divide such class into smaller classes.

## Tree shaking

To enable full tree shaking in a library, add the following to the `package.json` file:

```json
"sideEffects": false
```

However, when you do this, make sure to add the ESLint rule:

```json
"tree-shaking/no-side-effects-in-initialization": 2
```

This ensures that there are no side-effects in the library, such as globally initialized code that would run on import. By stripping these side-effects, the initialization will not run at runtime.

See [common/package.json](./libs/common/package.json) and [common/.eslintrc.json](./libs/common/.eslintrc.json) for example configuration.
