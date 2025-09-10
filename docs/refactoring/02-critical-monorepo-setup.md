# Refactoring Task: Implement a Formal Monorepo Structure

## 1. Goal

The goal is to properly structure this project as a monorepo using npm Workspaces. This will formalize the relationships between the `frontend`, `backend`, and `shared` code, improve dependency management, and streamline development workflows.

## 2. The Problem

The project is laid out like a monorepo but lacks the formal structure. The `frontend` and `backend` do not formally depend on the `shared` package. This has led to non-standard workarounds, such as checking compiled JavaScript files (`.js`, `.js.map`) and TypeScript declaration files (`.d.ts`) into the `shared` directory in source control. This makes dependency management manual and error-prone.

## 3. Step-by-Step Implementation Plan

### Step 3.1: Restructure Directories

1.  Create a new `packages` directory in the project root.
2.  Move the `frontend`, `backend`, and `shared` directories into the `packages` directory.

### Step 3.2: Configure npm Workspaces

1.  In the **root `package.json`**, add the `workspaces` property:
    ```json
    {
      "name": "american-mahjong-assistant-monorepo",
      "private": true,
      "workspaces": [
        "packages/*"
      ],
      "devDependencies": {
        ...
      }
    }
    ```
2.  Ensure the root `package.json` has a `"private": true` property, which is required for workspaces.

### Step 3.3: Create `shared-utils` Package

1.  The existing `packages/shared/tile-utils.ts` contains utility functions, not just types. This should be its own package.
2.  Create a new directory: `packages/shared-utils`.
3.  Create a `package.json` file in `packages/shared-utils` with the following content:
    ```json
    {
      "name": "shared-utils",
      "version": "1.0.0",
      "main": "src/index.ts",
      "types": "src/index.ts",
      "private": true
    }
    ```
4.  Create a `src` directory inside `packages/shared-utils`.
5.  Move `packages/shared/tile-utils.ts` to `packages/shared-utils/src/tile-utils.ts`.
6.  Create an `index.ts` in `packages/shared-utils/src` and export the utilities: `export * from './tile-utils';`.

### Step 3.4: Update Package Dependencies

1.  **`packages/frontend/package.json`**: Add the shared packages as dependencies.
    ```json
    "dependencies": {
      ...
      "shared-types": "workspace:*",
      "shared-utils": "workspace:*"
    },
    ```
2.  **`packages/backend/package.json`**: Add the shared packages as dependencies.
    ```json
    "dependencies": {
      ...
      "shared-types": "workspace:*",
      "shared-utils": "workspace:*"
    },
    ```
    *(Note: The `workspace:*` protocol tells npm to use the local packages from the workspace.)*

### Step 3.5: Clean Up and Install

1.  Delete all `node_modules` directories from the root, `packages/frontend`, and `packages/backend`.
2.  Delete all `package-lock.json` files from the sub-projects. A single `package-lock.json` will be generated at the root.
3.  From the **project root**, run `npm install`. This will install all dependencies for all packages and create the symbolic links for the local workspaces.

### Step 3.6: Update Build and Dev Scripts

1.  Modify the `dev` and `build` scripts in the root `package.json` to run the commands in the correct workspaces.
    ```json
    "scripts": {
      "dev:frontend": "npm run dev --workspace=frontend",
      "dev:backend": "npm run dev --workspace=backend",
      "build": "npm run build --workspaces",
      "test": "npm test --workspaces",
      ...
    },
    ```
2.  Verify that the `tsconfig.json` files in `frontend` and `backend` can still resolve the paths to the shared packages. Modern TypeScript with workspace support should handle this well, but you may need to adjust `paths` or `include` settings if you encounter issues.

### Step 3.7: Clean Up Git

1.  Delete the compiled JavaScript files from the `packages/shared` directory (`multiplayer-types.js`, `multiplayer-types.js.map`, `multiplayer-types.d.ts`).
2.  **Note:** This is crucial because these are compiled artifacts from the old, broken structure. They are no longer needed because the `frontend` and `backend` will now directly import the TypeScript source from the new `shared-types` and `shared-utils` packages via the monorepo symlinks.
3.  Ensure your root `.gitignore` file is configured to ignore these files going forward, as well as build output directories (`dist`, `build`, etc.) from all packages.

## 4. Verification

1.  After running `npm install` from the root, check that a single `node_modules` directory at the root contains all dependencies and that the `packages/frontend/node_modules` and `packages/backend/node_modules` contain symlinks to the shared packages.
2.  Run `npm run dev:frontend` and `npm run dev:backend` from the root to ensure the development servers start correctly.
3.  Run `npm run build` from the root to ensure both `frontend` and `backend` build successfully.
4.  Run `npm test --workspaces` to run all tests and confirm they pass.
5.  After verification, commit the changes with the message: `chore: implement npm workspaces and monorepo structure`.
