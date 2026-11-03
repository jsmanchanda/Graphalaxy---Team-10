# START HERE: Running, testing, and changing code in the Graphalaxy repo. 

Commands assume you are in the repo root unless stated otherwise. Checked against the repository on November 2, 2026. See [Project architecture](PROJECT_ARCHITECTURE.md) for current implementation status.

## 1. Project at a glance

Graphalaxy is one Git repository containing several packages managed by **npm workspaces**. Install once at the root, and npm produces a single `node_modules/` and a single `package-lock.json` for everything.

```
.
├─ client/              # frontend
├─ server/              # backend
├─ shared/              # shared workspace
├─ DOCUMENTATION/       
├─ .husky/              # git hooks: pre-commit, commit-msg
├─ .vscode/             # shared editor settings
├─ package.json         # root: workspaces list, scripts, shared dev tooling
├─ package-lock.json    
├─ tsconfig.json        # TypeScript config, extends the gts base config
├─ eslint.config.js     # lint rules
└─ eslint.ignores.js, .prettierrc.js, .editorconfig, .nvmrc
```

## 2. First-time setup

### 2.1 Install Git and nvm

Required: Git and **nvm** (Node Version Manager). Version number is defined in `.nvmrc` (`22`), and the root `package.json` requires Node `>=22.22.2`.

**macOS, Linux, WSL**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close and reopen the terminal, then check with `nvm --version`. The nvm releases page lists the newest version number to use in that URL.

**Windows (native)**

Install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) with `nvm-setup.exe`. Doesn't read `.nvmrc`, so pass 22.22.2 (version number) manually. (See 2.3). Git Bash is the easiest terminal for the commands in this guide.

### 2.2 Clone the repo

Use `git clone`.

```bash
git clone <repo-url>
cd Graphalaxy---Team-10
```

### 2.3 Select the Node version

```bash
nvm install        # macOS/Linux/WSL: reads .nvmrc, installs the latest Node 22.x
nvm use            # switch this terminal to it
node -v            # must print v22.22.2 or higher
npm -v
```

On Windows, run `nvm install 22.22.2` and then `nvm use 22.22.2`.

`nvm use` only affects the current terminal. Run it whenever a new terminal is opened for this project, or make 22 the default with `nvm alias default 22`.

### 2.4 Install dependencies

```bash
npm ci
```

`npm ci` installs exactly what `package-lock.json` specifies and never modifies it. Use it for the first install and after pulling changes that touched dependencies. During install, the `prepare` script runs `husky`, which activates the git hooks (see section 9).

**Never run `npm install` inside `client/` or `server/`.** Always install from the root.

On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

### 2.5 Verify

```bash
npm ls --depth=0   # lists root dev tooling: gts, eslint, husky, typescript, ...
npm run lint       # should pass
```

### 2.6 Editor

Use VS Code. `.vscode/settings.json` formats on save with Prettier and applies ESLint fixes on save. Accept the prompt to install the recommended extensions (Prettier and ESLint). If format-on-save does nothing, check that those extensions are enabled for this workspace.

## 3. Dependencies

### 3.1 Initial Dependencies

These are the root `devDependencies`. Version ranges are as of this writing, so check `package.json` for the current ones.

| Package | Purpose |
| --- | --- |
| `typescript` | The compiler and type checker |
| `gts` | Google TypeScript Style: lint and format presets, base tsconfig, and the `gts lint`, `gts fix`, `gts clean` commands |
| `eslint` | Linter |
| `eslint-plugin-jsdoc` | Requires doc comments on exported code |
| `husky` | Runs git hooks |
| `lint-staged` | Runs `eslint --fix` on the files you are committing |
| `@commitlint/cli`, `@commitlint/config-conventional` | Enforces the commit message format |
| `@types/node` | Type definitions for Node |
| `vite` | Browser development and test tooling; also declared by the client workspace |

The root `package.json` also has an `overrides` entry that forces `tmp` to `^0.2.6`. Leave it unless you know why you are changing it.

### 3.2 Per-workspace dependencies

Installed with `npm ci`.

| Workspace | Runtime | Dev |
| --- | --- | --- |
| `server` | `@graphalaxy/shared`, `express` (v5), `better-sqlite3` | `tsx`, `vitest`, `supertest`, `@types/express`, `@types/better-sqlite3`, `@types/supertest` |
| `client` | `@graphalaxy/shared`, `konva` | `vite`, `vitest` |
| `shared` | none (TypeScript response interfaces) | none |

No graph-expression parser or `zod` dependency is currently declared.

### 3.3 Where does a dependency go?

- Needed by one workspace: install it in that workspace (`-w server`).
- Tooling that applies to the whole repo (linting, TypeScript, git hooks): install it at the root with `-D` and no `-w`.
- Runtime dependencies never go in the root.
- A `@types/...` package is a dev dependency in the same workspace as the package it describes.
- Anything both client and server need to agree on (API types, schemas) goes in `shared/`, not copied into each side.

## 4. Running the project

### 4.1 Root scripts

| Command | What it does |
| --- | --- |
| `npm run lint` | `gts lint`: checks style and lint rules across the repo |
| `npm run fix` | `gts fix`: auto-fixes lint and formatting problems |
| `npm run compile` | `tsc`: type-checks and compiles to `build/` |
| `npm run clean` | `gts clean`: deletes the `build/` output |
| `npm test` | Compiles (`pretest`), lints and runs workspace tests (`test`), then lints again (`posttest`) |
| `npm run prepare` | Runs `husky`. It runs automatically after install, so you never run it by hand |

### 4.2 Run a script in one workspace

```bash
npm run lint -w client                 # by folder name
npm run lint -w @graphalaxy/server     # by package name
npm run lint --workspaces --if-present # in every workspace that defines it
```

Both workspaces provide `lint`, `dev`, `test`, and `test:watch`. The client also provides `dev:demo`; the server provides `start`, `db:migrate`, `db:seed`, and `db:reset`.

### 4.3 Dev servers and UI demo

The existing development scripts are:

- `server/package.json`: `"dev": "tsx watch src/index.ts"` (restarts on file changes)
- `client/package.json`: `"dev": "vite"`

Then run each in its own terminal:

```bash
npm run dev -w server    # Express, default port 3000
npm run dev -w client    # Vite, default port 5173; demo is at /demo.html
```

`client/vite.config.ts` already proxies `/api` to `http://localhost:3000`. If you override the backend `PORT`, update the proxy target to match. There is no root `dev` script that starts both processes. `npm run start -w server` runs the backend without watch mode.

**UI demo.** To run the client against the mock lesson data in `client/src/UI/test/UIDemo.ts` instead of `main.ts`:

```bash
npm run dev:demo -w client    # starts Vite and opens http://localhost:5173/demo.html
```

`client/demo.html` is a copy of `index.html` that loads `UIDemo.ts`. If the regular dev server is already running, you can also just open `/demo.html` in the browser.

`client/src/main.ts` is currently empty, so the normal `/` page does not initialize the game. The UI demo uses fixed mock data and does not issue API requests; setting up the proxy does not connect it to the backend. The backend can be run separately to exercise its demo HTTP routes.

### 4.4 Local database and secrets

The SQLite file must never be committed. These lines in `.gitignore` help protect data privacy:

```
*.db
server/var/
.env
```

Backend startup opens the database, applies unapplied migrations, and seeds sample content when the planets table is empty. Normal startup does not require a reset. To run the database tools explicitly:

```bash
npm run db:migrate -w server
npm run db:seed -w server
```

`DB_PATH` overrides the default `server/var/game.db`. The existing `npm run db:reset -w server` deletes the default file and then migrates and seeds. Its delete step always targets `server/var/game.db`, even when `DB_PATH` points elsewhere.

### 4.5 TypeScript config notes

The root `tsconfig.json` extends `node_modules/gts/tsconfig-google.json`, sets `rootDir` to `.`, writes output to `build/`, and includes `client/**/*.ts`, `server/**/*.ts`, `shared/**/*.ts`, and `test/**/*.ts`. Two consequences:

- Any `.ts` file inside `client/`, `server/`, or `shared/` is type-checked by `npm run compile`. Put tests inside the workspace they test.
- The root config already overrides the gts defaults with `module: ESNext`, `moduleResolution: Bundler`, the `ES2023`, `DOM`, and `DOM.Iterable` libraries, `esModuleInterop: true`, and `skipLibCheck: true`. There is no separate client TypeScript config required by the current setup.

`tsc` type-checks and emits to `build/`. The supported development/runtime scripts use `tsx` (server) and Vite (client); production packaging of the emitted files is not configured.

## 5. Testing

### 5.1 Where things stand

Vitest is installed and configured in both workspaces. The current suites contain 200 cases: 84 client and 116 server, including 47 Question Manager tests. The server suites cover the official schema/seed, Data Writer, and Question Manager; client suites cover model parsing and screen geometry. HTTP routes and browser-to-database integration do not yet have committed test suites.

### 5.2 Existing test configuration

The existing workspace scripts are:

| Script | Client | Server |
| --- | --- | --- |
| `test` | `vitest run` | `vitest run` |
| `test:watch` | `vitest` | `vitest watch` |

`supertest` and its types are already server development dependencies for future HTTP tests. Install the locked dependencies with `npm ci`; no separate Vitest setup is needed.

Root `npm test` already runs workspace tests. `.github/workflows/ci.yml` type-checks, lints, and runs workspace tests on pull requests and pushes to `main`.

### 5.3 Running tests

```bash
npm test                                        # compile, lint, workspace tests, lint
npm test -w server                              # one workspace
npm test -w server -- src/question-manager/QuestionManager.test.ts  # one file
npm test -w server -- -t "repeated correct"     # tests whose name matches
npm run test:watch -w client                    # watch mode
```

### 5.4 Writing a test

Name test files `<thing>.test.ts` and keep them next to the code or in a `tests/` folder inside the same workspace. Test files are linted like any other file, so the naming rules in section 8 apply. This example is illustrative:

```ts
import {describe, expect, it} from 'vitest';
import {evaluate} from './evaluate';

describe('evaluate', () => {
  it('returns the expected points for a linear function', () => {
    const points = evaluate({fn: 'x', min: 0, max: 2, step: 1});
    expect(points).toEqual([
      {x: 0, y: 0},
      {x: 1, y: 1},
      {x: 2, y: 2},
    ]);
  });
});
```

### 5.5 Planned testing responsibilities

The following responsibilities come from `SPRINTONE_TEAMS.md`; they are a plan, not a list of completed tests. Current coverage is summarized in section 5.1.

- **Team 1:** Question Manager against an in-memory fake data store. An API-level test (using `supertest` against the Express app) confirming `is_correct` never appears in any response. A duplicate-submit test. Use `:memory:` SQLite for tests that need a real database.
- **Team 2:** Game Manager against a fake Session Cache. Session Cache against a fake gateway, including a failed submit that keeps the selection. API Client retry and error mapping against a mocked HTTP layer.
- **Team 3:** UI against fake state (renders the right thing, emits the right intent). Graph Renderer input and output (a spec gives the expected points, an invalid spec is flagged). Keep the pure math separate from the Konva drawing code, because canvas code is hard to test in Node.

### 5.6 Before you open a PR

```bash
npm run fix
npm run lint
npm run compile
npm test
```

## 6. Adding and removing packages

### 6.1 Golden rules

1. Run every `npm install` and `npm uninstall` from the repo root.
2. Use `-w <workspace>` to say where the package belongs.
3. Commit the changed `package.json` file(s) and `package-lock.json` together.
4. Never edit `package-lock.json` by hand.
5. Never commit `node_modules/`.
6. Mention new dependencies in your PR description so reviewers can ask whether they are needed.

A workspace can be named by folder (`-w server`) or by package name (`-w @graphalaxy/server`).

### 6.2 Add

```bash
npm install express -w server                # runtime dependency
npm install -D @types/express -w server      # dev dependency
npm install -D some-lint-plugin              # no -w: root dev tooling
npm install some-package -w server -w client # same package in two workspaces
npm install lodash@4.17.21 -w server         # a specific version
npm install --save-exact some-package -w server  # pin without the ^ range
```

### 6.3 Remove

```bash
npm uninstall express -w server
npm uninstall -D vitest -w client
```

Afterward, search for leftover imports (for example `grep -r "express" server/`), then commit the lockfile with the `package.json` change.

### 6.4 Update

```bash
npm outdated                             # what is behind (root)
npm outdated -w server
npm update express -w server             # newest version allowed by the range in package.json
npm install express@latest -w server     # jump to the newest release, possibly a new major version
```

Major-version bumps of shared tooling (`gts`, `eslint`, `typescript`) can change lint results for everyone. Do those in their own PR and tell the team.

### 6.5 Inspect

```bash
npm ls --depth=0 -w server    # what a workspace depends on
npm ls express                # which version, and who depends on it
npm why tmp                   # why a package is installed at all
npm audit                     # known vulnerabilities
```

### 6.6 Lockfile merge conflicts

Do not resolve conflicts inside `package-lock.json`. Instead:

```bash
# 1. Resolve any conflict in the package.json files by hand.
# 2. Take the lockfile from the branch you are merging into:
git checkout origin/main -- package-lock.json
# 3. Re-apply everything from the package.json files:
npm install
# 4. Commit the regenerated lockfile.
```

If `npm ci` complains that `package.json` and `package-lock.json` are out of sync, someone changed a dependency without committing the lockfile. Run `npm install` and commit the result.

### 6.7 Before adding a dependency

- Do we need it, or does the standard library or an existing package already cover it?
- Is it actively maintained, and does it ship TypeScript types (or have `@types/...`)?
- Is it a native module (like `better-sqlite3`) that needs build tools on every teammate's machine?
- Is the license compatible with a class project?

## 7. Workspaces

### 7.1 The idea

The root `package.json` lists `"workspaces": ["client", "server", "shared"]`. Each listed folder has its own `package.json` and package name: `@graphalaxy/client`, `@graphalaxy/server`, and `@graphalaxy/shared`. npm installs their dependencies into the root `node_modules/` and links the workspaces under `node_modules/@graphalaxy/`, so packages can import each other by name.

Each workspace has its own `package.json` so that it declares only the dependencies it needs, owns its own scripts, and shows up in the right team's PRs.

### 7.2 "Switching" between workspaces

npm has no switch command. You choose a workspace either with a flag or by changing directory.

| Goal | How |
| --- | --- |
| Run a script in one workspace | `npm run <script> -w <name>` from the root (preferred) |
| Add or remove a dependency | `npm install <pkg> -w <name>` from the root |
| Work in a workspace folder | `cd client` is fine for running scripts and editing files, but go back to the root to install |
| Run a tool installed in a workspace | `npm exec -w client -- vite --version` |

### 7.3 Commands across all workspaces

```bash
npm run lint --workspaces --if-present   # short form: -ws
npm ls --workspaces --depth=0            # list every workspace and its dependencies
```

`--if-present` skips workspaces that do not define the script, so the command does not fail on them.

### 7.4 Existing shared workspace

`shared` is already initialized and listed in the root workspace configuration. Both client and server declare `"@graphalaxy/shared": "*"`. Do not reinitialize it or replace its manifest as a setup step; `npm ci` links it along with the other workspaces.

`shared/package.json` points `main` and `types` to `src/index.ts`. That entry point exports the response interfaces from `src/api.ts`, including `Question`, `AnswerOption`, `AnswerResult`, `Lesson`, `ReadingTask`, and `QuestionTask`. There is no separate shared build step or runtime validation schema.

Verify the existing connection with:

```bash
npm ls @graphalaxy/shared
```

For a genuinely new workspace, choose an unused folder, run `npm init -w ./<folder> -y` from the root, configure its manifest and scripts, and update the dependencies of its consumers. Commit the manifests and generated lockfile together.

### 7.5 Importing between workspaces

```ts
import type {AnswerResult, Question} from '@graphalaxy/shared';
```

`client` and `server` import shared contracts from this package, rather than importing each other's implementation code. The current exports are types; `QuestionSchema` is not exported. Use `import type` for these interfaces. Changes to `shared/` affect both sides, so ask for review from both affected teams. The existing frontend/demo payload types still differ from the shared question contract; see [Project architecture](PROJECT_ARCHITECTURE.md) before integrating them.

### 7.6 Remove a workspace

1. Remove it from the root `workspaces` list.
2. Delete the folder (`git rm -r <folder>`).
3. Remove it from any other workspace's `dependencies`.
4. Run `npm install` and commit the changed files and lockfile.

### 7.7 Common Issues

- A new workspace is not linked until you run `npm install` at the root.
- `No workspaces found` means the name or path you passed to `-w` is wrong. Run `npm ls --workspaces --depth=0` to see the real names.
- Workspace versions in dependency lists use `"*"` so npm always links the local copy.
- Keep script names consistent (`lint`, `test`, `dev`) so root commands with `--workspaces` work.

## 8. Code style and lint rules

The lint rules come from `gts` plus extra rules based on the Google TypeScript Style Guide (`eslint.config.js`). Formatting is automatic: Prettier runs on save and `npm run fix` handles the rest. These are the rules that most often trip up new contributors.

| Rule | Do | Don't |
| --- | --- | --- |
| Exports | `export const x`, `export class Foo` | `export default ...` |
| Doc comments | A `/** ... */` with a real description on every exported function, class, method, interface, type, and enum | Exported code with no comment, or an empty `/** */` |
| Names | `camelCase` for variables, functions, properties; `PascalCase` for classes, types, interfaces; `UPPER_CASE` for enum members and constants | `snake_case`, leading or trailing underscores, `IUser` |
| Acronyms | `loadHttpUrl` | `loadHTTPURL` |
| Object shapes | `interface Foo {...}` | `type Foo = {...}` |
| Types | `string[]`, `unknown`, `x as Foo` | `any`, `<Foo>x`, `Array<string>` |
| Class members | `private` keyword, no `public` | `public` keyword, `#private` fields |
| Exported bindings | `export const` | Exported `let` or `var` |
| Enums | Plain `enum` | `const enum` |
| Equality | `===` | `==` (comparing with `null` is allowed) |
| Non-null assertion | Avoid it | `value!` (this is a warning) |

Example that passes lint:

```ts
/** A multiple-choice answer option as sent to the client. */
export interface Option {
  optionId: number;
  label: string;
  text: string;
}

/** Holds the question currently shown to the player. */
export class SessionCache {
  private listeners = new Set<() => void>();

  /** Registers a callback that runs whenever the cache changes. */
  subscribe(listener: () => void): void {
    this.listeners.add(listener);
  }
}
```

**Database column names.** The database uses names like `user_id`, but declaring a `user_id` property in TypeScript breaks the camelCase rule. Alias columns in the SQL instead (`SELECT user_id AS userId FROM users`) so your row types are camelCase from the start.

## 9. Git workflow

### 9.1 Branches

From the README, branch names use these prefixes:

`feature/<name>`, `bugfix/<name>`, `refactor/<name>`, `chore/<name>`, `doc/<name>`

```bash
git switch main
git pull
git switch -c feature/question-screen
# work, commit often
git push -u origin feature/question-screen
```

Then open a pull request. Keep PRs small, ideally a day of work or less.

### 9.2 Commit messages

Commits must follow Conventional Commits (`type: description`) or the `commit-msg` hook rejects them. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

```
feat: add question screen
fix: stop double submit
chore: add express to server
test: cover duplicate submit
```

A message like `updated stuff` fails with errors such as `subject may not be empty` or `type may not be empty`.

### 9.3 Hooks

- **pre-commit** runs `lint-staged`, which runs `eslint --fix` on the staged `.ts`, `.tsx`, and `.js` files.
- **commit-msg** runs `commitlint` on your message.

If a hook fails, the commit did not happen. Read the output, fix the problem, and commit again. Do not bypass hooks with `--no-verify`. If hooks never run, check that the folder has a `.git` directory and re-run `npm ci`.

### 9.4 Before and after pulling

- Pull `main` into your branch regularly.
- If a pull changed `package.json` or `package-lock.json`, run `npm ci`.
- If you changed `shared/`, say so in the PR so both affected teams review it.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `EBADENGINE` warning, or odd syntax errors | Wrong Node version | `nvm install` then `nvm use`, check `node -v` |
| `nvm: command not found` | Terminal not reloaded, or the shell profile lacks the nvm lines | Reopen the terminal, check `~/.zshrc` or `~/.bashrc` |
| Git hooks never run | No `.git` folder (zip download) or husky not set up | Clone with git, run `npm ci` |
| Commit rejected by commitlint | Message format | Use `feat: ...` style (section 9.2) |
| `Cannot find module '@graphalaxy/shared'` | Workspace not linked | `npm install` at the root, check `ls node_modules/@graphalaxy` |
| `npm ci` says lockfile is out of sync | Dependency changed without the lockfile | `npm install`, commit `package-lock.json` |
| `TS18003: No inputs were found` | No `.ts` files yet | Add a `.ts` file under `client/`, `server/`, or `shared/` |
| `better-sqlite3` fails to install | No prebuilt binary and no compiler | Windows: Visual Studio Build Tools, workload "Desktop development with C++". macOS: `xcode-select --install`. Linux: `sudo apt install build-essential python3`. Then `npm rebuild better-sqlite3` |
| `better-sqlite3` errors after switching Node versions | Native module built for the old Node | `npm rebuild better-sqlite3` |
| `No workspaces found` | Wrong `-w` name | `npm ls --workspaces --depth=0` |
| `EADDRINUSE` (port in use) | Another process on that port | Stop it, or set a different `PORT` |
| Naming-convention lint errors on DB fields | `snake_case` identifiers | Alias in SQL (section 8) |
| Strange dependency state | Corrupted install | `rm -rf node_modules && npm ci` (on Windows, delete the folder in Explorer first) |

## 11. Cheat sheet

| Task | Command |
| --- | --- |
| Select Node version | `nvm use` |
| Install everything | `npm ci` |
| Lint | `npm run lint` |
| Auto-fix lint and format | `npm run fix` |
| Type-check and compile | `npm run compile` |
| Run all checks | `npm test` |
| Run the UI demo | `npm run dev:demo -w client` |
| Remove build output | `npm run clean` |
| Add a dependency | `npm install <pkg> -w <workspace>` |
| Add a dev dependency | `npm install -D <pkg> -w <workspace>` |
| Add root tooling | `npm install -D <pkg>` |
| Remove a dependency | `npm uninstall <pkg> -w <workspace>` |
| Run a script in one workspace | `npm run <script> -w <workspace>` |
| Run a script in all workspaces | `npm run <script> -ws --if-present` |
| List workspaces | `npm ls --workspaces --depth=0` |
| See outdated packages | `npm outdated` |
| Add a workspace | `npm init -w ./<folder> -y`, then `npm install` |
